/** Amplitude envelope only: this does not infer phonemes or visemes. */
export function mouthAmplitude(samples: Uint8Array): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
  const rms = Math.sqrt(sum / samples.length);
  return Math.min(1, Math.max(0, (rms - 0.012) * 7));
}

export function followAudioMouth(audio: HTMLAudioElement, report: (level: number) => void): () => void {
  let context: AudioContext | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let stopped = false;
  try {
    context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    const source = context.createMediaElementSource(audio);
    source.connect(context.destination);
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    timer = setInterval(() => {
      if (stopped) return;
      analyser.getByteTimeDomainData(samples);
      report(audio.paused || audio.ended ? 0 : mouthAmplitude(samples));
    }, 50);
    void context.resume().catch(() => report(0));
  } catch {
    // Keep ordinary playback available when analysis is unsupported.
    report(0);
  }
  return () => {
    stopped = true;
    clearInterval(timer);
    report(0);
    if (context && context.state !== "closed") void context.close().catch(() => {});
  };
}
