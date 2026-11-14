import { followAudioMouth, parseMouthCues, mouthShapeAt, type MouthShape } from "./mouth";
export type QueueItem = {
  id: string;
  turnId: string;
  sentenceIndex: number;
  play: () => Promise<void>;
  stop: () => void;
};
/** Bounded ordered queue. A failed phrase stays retryable; only one voice plays. */
export class PlaybackQueue {
  private pending: QueueItem[] = [];
  private seen = new Set<string>();
  private cancelled = new Set<string>();
  private nextIndex = new Map<string, number>();
  private current: QueueItem | undefined;
  private blocked: QueueItem | undefined;
  private running = false;
  private generation = 0;
  constructor(private onError: (error: unknown) => void = () => {}) {}
  enqueue(item: QueueItem) {
    if (this.seen.has(item.id) || this.cancelled.has(item.turnId)) return;
    if (this.pending.length >= 40) {
      this.onError(new Error("La file audio est pleine."));
      return;
    }
    this.seen.add(item.id);
    if (this.seen.size > 500)
      this.seen.delete(this.seen.values().next().value!);
    this.pending.push(item);
    this.pending.sort((a, b) =>
      a.turnId === b.turnId ? a.sentenceIndex - b.sentenceIndex : 0,
    );
    void this.drain();
  }
  private async drain() {
    if (this.running || this.blocked) return;
    this.running = true;
    const generation = this.generation;
    while (this.pending.length && generation === this.generation) {
      const item = this.pending[0];
      if (this.cancelled.has(item.turnId)) {
        this.pending.shift();
        continue;
      }
      const expected = this.nextIndex.get(item.turnId) || 0;
      if (item.sentenceIndex !== expected) break;
      this.pending.shift();
      this.current = item;
      try {
        await item.play();
        if (generation === this.generation)
          this.nextIndex.set(item.turnId, expected + 1);
      } catch (error) {
        if (
          generation === this.generation &&
          !this.cancelled.has(item.turnId)
        ) {
          this.blocked = item;
          this.onError(error);
          break;
        }
      } finally {
        if (this.current === item) this.current = undefined;
      }
    }
    if (generation === this.generation) this.running = false;
  }
  retry() {
    if (this.blocked) {
      this.pending.unshift(this.blocked);
      this.blocked = undefined;
    }
    void this.drain();
  }
  interrupt(turnId: string) {
    this.cancelled.add(turnId);
    this.pending = this.pending.filter((i) => i.turnId !== turnId);
    if (this.blocked?.turnId === turnId) this.blocked = undefined;
    if (this.current?.turnId === turnId) {
      this.current.stop();
      this.current = undefined;
    }
    void this.drain();
  }
  clear() {
    this.generation++;
    this.current?.stop();
    this.current = undefined;
    this.pending = [];
    this.blocked = undefined;
    this.running = false;
    this.cancelled.clear();
    this.nextIndex.clear();
    this.seen.clear();
  }
  get size() {
    return (
      this.pending.length + (this.current ? 1 : 0) + (this.blocked ? 1 : 0)
    );
  }
}
export function localSpeechItem(
  id: string,
  turnId: string,
  text: string,
  voiceUri = "",
): QueueItem {
  let settle: (() => void) | undefined;
  return {
    id,
    turnId,
    sentenceIndex: 0,
    play: () =>
      new Promise<void>((resolve, reject) => {
        if (!("speechSynthesis" in window)) {
          reject(new Error("La voix locale est indisponible."));
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fr-FR";
        utterance.voice =
          speechSynthesis.getVoices().find((v) => v.voiceURI === voiceUri) ||
          null;
        utterance.onend = () => resolve();
        utterance.onerror = () =>
          reject(new Error("Lecture vocale interrompue ou indisponible."));
        settle = resolve;
        speechSynthesis.speak(utterance);
      }),
    stop: () => {
      speechSynthesis.cancel();
      settle?.();
    },
  };
}
export function remoteAudioItem(
  id: string,
  turnId: string,
  sentenceIndex: number,
  url: string,
  onStart?: () => void,
  onLevel?: (level: number) => void,
  onShape?: (shape: MouthShape | undefined) => void,
): QueueItem {
  let audio: HTMLAudioElement | undefined;
  let settle: (() => void) | undefined;
  let stopMeter: (() => void) | undefined;
  let controller: AbortController | undefined;
  let cancelled = false;
  let shapeTimer: ReturnType<typeof setInterval> | undefined;
  const clearMouth = () => { stopMeter?.(); clearInterval(shapeTimer); onShape?.(undefined); };
  return {
    id,
    turnId,
    sentenceIndex,
    play: async () => {
      cancelled = false;
      controller = new AbortController();
      let cues: ReturnType<typeof parseMouthCues> = [];
      if (onShape) {
        const timeout = setTimeout(() => controller?.abort(), 16000);
        try {
          const metadata = new URL(url, location.href);
          metadata.searchParams.set("mouth", "1");
          const response = await fetch(metadata, {signal: controller.signal, credentials:"same-origin"});
          if (response.ok) cues = parseMouthCues((await response.json()).cues);
        } catch { /* Optional analysis must not prevent voice playback. */ }
        finally { clearTimeout(timeout); }
      }
      // Cancellation during analysis must not start an orphaned voice.
      if (controller.signal.aborted && cancelled) return;
      return new Promise<void>((resolve, reject) => {
        audio = new Audio(url);
        if (onLevel) stopMeter = followAudioMouth(audio, onLevel);
        if (cues.length) shapeTimer = setInterval(() => onShape?.(audio?.paused || audio?.ended ? "X" : mouthShapeAt(cues, audio?.currentTime || 0)), 40);
        settle = resolve;
        audio.onended = () => {
          clearMouth();
          audio?.removeAttribute("src");
          resolve();
        };
        audio.onerror = () => {
          clearMouth();
          reject(new Error("Le son de cette phrase est indisponible."));
        };
        audio.onplaying = () => onStart?.();
        void audio.play().catch(error => { clearMouth(); reject(error); });
      });
    },
    stop: () => {
      cancelled = true;
      controller?.abort();
      audio?.pause();
      clearMouth();
      if (audio) {
        audio.removeAttribute("src");
        audio.load();
      }
      settle?.();
    },
  };
}
