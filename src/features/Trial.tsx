import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  MicOff,
  Mic,
  Volume2,
  Wifi,
  X,
  Scale,
  MessageSquare,
  FileText,
  ChevronRight,
  VolumeX,
} from "lucide-react";
import { phases } from "../services/model";
import { read, write } from "../services/storage";
import { serverMode, serverApi } from "../services/api";
import { createDemoSession, getDemoCase, getDemoRoles } from "../services/demo";
import { getPreferences, savePreferences } from "../services/preferences";
import type { CaseDetail, TrialEvent } from "../services/contracts";
import { safeUrl } from "../services/urls";
import { useMicrophone } from "./useMicrophone";
import { useRecorder } from "./audio/useRecorder";
import { PlaybackQueue, localSpeechItem, remoteAudioItem } from "./audio/queue";
import { useTrial } from "./trial/useTrial";
import { stage, stageLabels, displayedTime } from "./trial/state";
import { Heading, Action, Badge } from "../components/Layout";
import { Modal } from "../components/Modal";
import { ExhibitViewer } from "../components/ExhibitViewer";
const Courtroom = lazy(() => import("../components/Courtroom"));
export function Setup() {
  const mic = useMicrophone();
  const [mode, setMode] = useState("text");
  const [sound, setSound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const soundRef = useRef<AudioContext | null>(null);
  const navigate = useNavigate();
  useEffect(
    () => () => {
      if (soundRef.current?.state !== "closed") void soundRef.current?.close();
    },
    [],
  );
  async function testSound() {
    try {
      if (soundRef.current) {
        if (soundRef.current.state !== "closed") await soundRef.current.close();
        soundRef.current = null;
        setSound(false);
        return;
      }
      const ctx = new AudioContext();
      soundRef.current = ctx;
      await ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 440;
      oscillator.start();
      setSound(true);
      oscillator.stop(ctx.currentTime + 1);
      oscillator.onended = () => {
        if (ctx.state !== "closed") void ctx.close();
        soundRef.current = null;
        setSound(false);
      };
    } catch {
      setError("Le son est indisponible. Le mode texte reste accessible.");
    }
  }
  async function enter() {
    setBusy(true);
    setError("");
    mic.stop();
    try {
      const roleId = read("role", "defense"),
        caseId = read("case", "limete");
      const snapshot = serverMode
        ? await serverApi.createTrial(roleId, caseId)
        : createDemoSession(roleId, caseId);
      write("mode", mode);
      navigate("/app/trials/" + snapshot.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title="Préparez votre entrée en audience."
        description="Un dernier contrôle pour plaider dans les meilleures conditions."
        back={"/app/cases/" + read("case", "limete")}
      />
      <div className="reader-grid">
        <section className="panel setup-panel">
          <h2>Microphone et audio</h2>
          <p role="status">{mic.status}</p>
          <div className="audio-meter">
            <i style={{ width: mic.level + "%" }} />
            <span>
              {mic.active
                ? mic.level > 2
                  ? "Votre voix est détectée"
                  : "Aucun signal détecté — parlez pour tester"
                : "Le microphone s’active uniquement à votre demande"}
            </span>
          </div>
          <div className="inline-actions">
            <button
              className="button secondary"
              onClick={() => void (mic.active ? mic.stop() : mic.start())}
            >
              {mic.active ? <MicOff size={17} /> : <Mic size={17} />}{" "}
              {mic.active ? "Arrêter le test" : "Tester le microphone"}
            </button>
            <button className="text-button" onClick={() => void testSound()}>
              <Volume2 size={17} />
              {sound ? "Arrêter le son" : "Tester les haut-parleurs"}
            </button>
          </div>
          <h3>Mode de participation</h3>
          <div className="mode-options">
            {["text", "voice"].map((m) => (
              <label key={m}>
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                />
                {m === "text" ? "Texte uniquement" : "Voix + sous-titres"}
              </label>
            ))}
          </div>
          <p className="footnote">
            {serverMode
              ? "La voix ne sera envoyée que si Django annonce un codec compatible."
              : "En démo, les captures restent en mémoire sur cet appareil. Aucune transcription ni donnée envoyée. Vous pouvez écouter votre capture, puis envoyer votre argument par écrit."}
          </p>
        </section>
        <section className="panel setup-status">
          <Badge>
            <Check size={14} />
            {serverMode ? "INTÉGRATION DJANGO" : "MODE DÉMONSTRATION"}
          </Badge>
          <h3>Votre salle vous attend</h3>
          <p>
            La séance démarre après votre confirmation. Le mode texte reste
            accessible pendant tout le procès.
          </p>
          <p>
            Qualité 3D : {getPreferences().quality} · réglable dans vos
            préférences
          </p>
        </section>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="page-actions end">
        <button
          className="button"
          disabled={
            busy ||
            (!serverMode &&
              !getDemoRoles().some(
                (r) => r.id === read("role", "defense") && r.unlocked,
              ))
          }
          onClick={() => void enter()}
        >
          {busy ? "Création en cours…" : "Entrer dans la salle"}
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode; onFallback: () => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-fallback">
        <p>La 3D est indisponible.</p>
        <button className="button secondary" onClick={this.props.onFallback}>
          Poursuivre en mode texte
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function Trial() {
  const [audioError, setAudioError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [turnSpeaking, setTurnSpeaking] = useState(false);
  const [playbackDelay, setPlaybackDelay] = useState<number>();
  const queue = useRef<PlaybackQueue | null>(null);
  if (!queue.current)
    queue.current = new PlaybackQueue(() => {
      setPlaying(false);
      setAudioError(
        "Lecture indisponible ou bloquée. Réactivez le son pour réessayer ; les sous-titres restent disponibles.",
      );
    });
  const prefs = getPreferences();
  const [sound, setSound] = useState(prefs.sound && prefs.localVoice);
  const [subtitles, setSubtitles] = useState(prefs.subtitles);
  const [textMode, setTextMode] = useState(read("mode", "text") === "text");
  const [camera, setCamera] = useState<"wide" | "speaker">("wide");
  const [pieceOpen, setPieceOpen] = useState(false);
  const [piece, setPiece] = useState("P01");
  const [quit, setQuit] = useState(false);
  const [unread, setUnread] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [caseDetail, setCaseDetail] = useState<CaseDetail>();
  const [draft, setDraft] = useState("");
  const [localAudio, setLocalAudio] = useState("");
  const [now, setNow] = useState(Date.now());
  const [gesture, setGesture] = useState("neutral");
  const [emotion, setEmotion] = useState("neutral");
  const transcript = useRef<HTMLDivElement>(null);
  const bottom = useRef(true);
  const wasConnected = useRef(false);
  const played = useRef(new Set<string>());
  const live = useRef(true);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  function receive(event: TrialEvent) {
    if (event.type === "interrupt") {
      queue.current?.interrupt(event.turnId);
      return;
    }
    if (event.type === "turn") {
      setGesture(event.gesture || "neutral");
      setEmotion(event.emotion || "neutral");
    }
    if (event.type === "audio" && soundRef.current) {
      const url = safeUrl(event.url, false);
      if (!url) {
        setAudioError("Source audio non autorisée.");
        return;
      }
      const received = performance.now();
      const item = remoteAudioItem(
        event.eventId,
        event.turnId,
        event.sentenceIndex,
        url,
        () => {
          setPlaybackDelay(performance.now() - received);
          setPlaying(true);
        },
      );
      const play = item.play;
      item.play = async () => {
        try {
          await play();
        } finally {
          if (live.current) setPlaying(false);
        }
      };
      queue.current?.enqueue(item);
    }
  }
  const trial = useTrial(receive);
  const s = trial.snapshot;
  const connected = trial.connection === "ready";
  const recorder = useRecorder(
    (blob) => {
      if (serverMode) void trial.sendAudio(blob);
    },
    serverMode ? s?.audioCodecs : undefined,
  );
  const navigate = useNavigate();
  useEffect(() => {
    live.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      live.current = false;
      clearInterval(timer);
      queue.current?.clear();
    };
  }, []);
  useEffect(() => {
    if (!s) return;
    let cancelled = false;
    if (serverMode)
      void serverApi
        .getCase(s.caseId)
        .then((c) => {
          if (!cancelled) setCaseDetail(c);
        })
        .catch(() => {
          if (!cancelled)
            setAudioError(
              "Les pièces n’ont pas pu être chargées. Réessayez en rechargeant la page.",
            );
        });
    else setCaseDetail(getDemoCase(s.caseId));
    return () => {
      cancelled = true;
    };
  }, [s?.caseId]);
  useEffect(() => {
    setTurnSpeaking(true);
    const timer = setTimeout(() => setTurnSpeaking(false), 3500);
    return () => clearTimeout(timer);
  }, [s?.entries.at(-1)?.id]);
  useEffect(() => {
    if (!connected && wasConnected.current) recorder.stop(true);
    wasConnected.current = connected;
  }, [connected]);
  useEffect(() => {
    if (!recorder.localBlob || serverMode) return;
    const url = URL.createObjectURL(recorder.localBlob);
    setLocalAudio(url);
    return () => URL.revokeObjectURL(url);
  }, [recorder.localBlob]);
  useEffect(() => {
    if (!s) return;
    if (bottom.current)
      transcript.current?.scrollTo({
        top: transcript.current.scrollHeight,
        behavior: "instant",
      });
    else setUnread(true);
    if (!serverMode) {
      for (const entry of s.entries) {
        if (played.current.has(entry.id)) continue;
        played.current.add(entry.id);
        if (sound && entry.speaker !== "Vous") {
          const item = localSpeechItem(
            entry.id,
            entry.id,
            entry.text,
            prefs.voiceUri,
          );
          const original = item.play;
          item.play = async () => {
            if (live.current) setPlaying(true);
            try {
              await original();
            } finally {
              if (live.current) setPlaying(false);
            }
          };
          queue.current?.enqueue(item);
        }
      }
    }
  }, [s?.entries, sound]);
  useEffect(() => {
    if (!sound) {
      queue.current?.clear();
      setPlaying(false);
    }
  }, [sound]);
  if (!s)
    return (
      <>
        <Heading
          title={
            trial.connection === "terminal"
              ? "Audience indisponible"
              : "Chargement de l’audience…"
          }
          description={
            trial.error || "Connexion et synchronisation du dossier."
          }
        />
        <button className="button" onClick={trial.reconnect}>
          Réessayer
        </button>
        <Action to="/app/history">Mes audiences</Action>
      </>
    );
  const writable =
    s.allowedActions.includes("user_text") &&
    connected &&
    !trial.busy &&
    !recorder.recording &&
    !s.finished;
  const voiceAllowed =
    s.allowedActions.includes("user_audio") &&
    connected &&
    !trial.busy &&
    !s.finished &&
    (!serverMode || s.audioCodecs.length > 0);
  const currentStage = stage(
    s,
    trial.connection,
    recorder.recording,
    trial.busy,
    playing,
  );
  const clock = displayedTime(s.startedAt, s.endAt, now);
  const selectedExhibit = caseDetail?.exhibits.find((e) => e.id === piece);
  const reduced =
    prefs.reduced || matchMedia("(prefers-reduced-motion: reduce)").matches;
  async function submit() {
    if (
      writable &&
      draft.trim() &&
      (await trial.send({ type: "user_text", text: draft.trim() }))
    )
      setDraft("");
  }
  function toggleSound() {
    const next = !sound;
    setSound(next);
    setAudioError("");
    savePreferences({
      ...getPreferences(),
      sound: next,
      localVoice: !serverMode ? next : getPreferences().localVoice,
    });
  }
  return (
    <>
      <Heading
        title="Audience en cours"
        description={
          (serverMode ? "Affaire · " : "Dossier fictif · ") +
          (caseDetail?.title || s.caseId)
        }
      />
      <div className="trial-top">
        <Badge>
          {connected ? <Wifi size={13} /> : <X size={13} />}{" "}
          {connected
            ? serverMode
              ? "CONNECTÉ À DJANGO"
              : "TRANSPORT DÉMO LOCAL"
            : "CONNEXION INTERROMPUE"}
        </Badge>
        <button className="text-button" onClick={() => setTextMode((v) => !v)}>
          {textMode ? <Scale size={16} /> : <MessageSquare size={16} />}{" "}
          {textMode ? "Voir la salle 3D" : "Passer en mode texte"}
        </button>
        <button className="text-button" onClick={() => setQuit(true)}>
          Quitter
        </button>
      </div>
      <div className="audience-status">
        <span role="status">{stageLabels[currentStage]}</span>
        <span>
          {clock.label} : {clock.value}
          {!serverMode ? " · démo" : ""}
        </span>
      </div>
      {trial.error && (
        <div className="notice" role="alert">
          {trial.error}
          {!connected ? (
            <button onClick={trial.reconnect}>Reconnecter</button>
          ) : trial.failed ? (
            <button
              disabled={trial.busy}
              onClick={() =>
                void trial.retry().then((ok) => {
                  if (
                    ok &&
                    trial.failed?.command.type === "user_text" &&
                    draft === trial.failed.command.text
                  )
                    setDraft("");
                })
              }
            >
              Réessayer l’envoi
            </button>
          ) : null}
        </div>
      )}
      {!textMode && (
        <>
          <div className="scene-controls">
            <a className="text-button" href={`${import.meta.env.BASE_URL}courtroom/index.html`} target="_blank" rel="noopener noreferrer">Explorer la salle 3D</a>
            <button
              className="text-button"
              onClick={() =>
                setCamera((c) => (c === "wide" ? "speaker" : "wide"))
              }
            >
              Caméra : {camera === "wide" ? "vue générale" : "intervenant"}
            </button>
            <button
              className="text-button"
              aria-pressed={subtitles}
              onClick={() => {
                setSubtitles((v) => !v);
                savePreferences({ ...getPreferences(), subtitles: !subtitles });
              }}
            >
              Sous-titres {subtitles ? "activés" : "désactivés"}
            </button>
          </div>
          <div className="court-scene">
            <div className="scene-label">
              <Badge>{phases[s.step]}</Badge>
              <span>Scène 3D{!serverMode ? " · démonstration" : ""}</span>
            </div>
            {sceneError ? (
              <div className="scene-fallback">
                <p>La scène 3D n’est pas disponible.</p>
                <button
                  className="button secondary"
                  onClick={() => setTextMode(true)}
                >
                  Poursuivre en mode texte
                </button>
              </div>
            ) : (
              <SceneBoundary onFallback={() => setTextMode(true)}>
                <Suspense
                  fallback={
                    <div className="scene-fallback">
                      Chargement de la salle… Le mode texte reste accessible.
                    </div>
                  }
                >
                  <Courtroom
                    activeSpeaker={s.activeSpeaker}
                    speaking={playing || turnSpeaking}
                    objection={s.objection}
                    reduced={reduced}
                    quality={prefs.quality}
                    cameraMode={camera}
                    gesture={gesture}
                    emotion={emotion}
                    onUnavailable={() => setSceneError(true)}
                  />
                </Suspense>
              </SceneBoundary>
            )}
            {s.objection && <strong className="objection">OBJECTION</strong>}
            {subtitles && (
              <div className="scene-caption">
                <span>{s.entries.at(-1)?.speaker}</span>
                <p>{s.entries.at(-1)?.text}</p>
              </div>
            )}
          </div>
        </>
      )}
      <div className="trial-grid">
        <section className="panel transcript-panel">
          <div className="section-title">
            <h2>
              {textMode
                ? "Le débat, en toute clarté."
                : "Transcription de l’audience"}
            </h2>
            <Badge>{phases[s.step]}</Badge>
          </div>
          <div
            className="transcript"
            ref={transcript}
            onScroll={() => {
              const el = transcript.current;
              if (el) {
                bottom.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 60;
                if (bottom.current) setUnread(false);
              }
            }}
          >
            {s.entries.map((e) => (
              <article
                key={e.id}
                className={e.speaker === "Vous" ? "entry mine" : "entry"}
              >
                <strong>{e.speaker}</strong>
                <p>{e.text}</p>
              </article>
            ))}
          </div>
          {unread && (
            <button
              className="button secondary"
              onClick={() => {
                bottom.current = true;
                setUnread(false);
                transcript.current?.scrollTo({
                  top: transcript.current.scrollHeight,
                });
              }}
            >
              Nouveaux échanges ↓
            </button>
          )}
          <p className="sr-only" aria-live="polite">
            Phase : {phases[s.step]}. {s.objection ? "Objection reçue." : ""}
          </p>
        </section>
        <aside className="panel phases">
          <h3>Déroulement</h3>
          <ol>
            {phases.map((p, i) => (
              <li
                className={i === s.step ? "current" : i < s.step ? "done" : ""}
                key={p}
              >
                <span>{i < s.step ? <Check size={13} /> : i + 1}</span>
                {p}
              </li>
            ))}
          </ol>
        </aside>
      </div>
      <div className="audio-controls">
        <button
          className="button secondary"
          aria-pressed={sound}
          disabled={serverMode && !s.ttsAvailable}
          onClick={toggleSound}
        >
          {sound ? <VolumeX size={17} /> : <Volume2 size={17} />}{" "}
          {sound ? "Couper le son" : "Activer le son"}
        </button>
        <p>
          {serverMode
            ? s.ttsAvailable ? "Voix serveur activée ; la transcription reste accessible." : "Voix serveur non activée. Les échanges texte sont disponibles."
            : "Voix locale de simulation, facultative. Aucune réponse IA réelle."}
        </p>
        {playbackDelay !== undefined && (
          <small>Réception → lecture : {Math.round(playbackDelay)} ms</small>
        )}
      </div>
      {audioError && (
        <div className="notice" role="status">
          {audioError}
          <button
            className="button secondary"
            onClick={() => {
              setSound(true);
              setAudioError("");
              queue.current?.retry();
            }}
          >
            Réessayer le son
          </button>
        </div>
      )}
      {trial.audioFailed && (
        <div className="notice" role="alert">
          Une capture n’a pas été acceptée. Elle reste uniquement en mémoire.
          <button
            className="button secondary"
            disabled={trial.busy || !connected}
            onClick={() => void trial.retryAudio()}
          >
            Réessayer la capture
          </button>
        </div>
      )}
      {!s.finished ? (
        <>
          <form
            className="compose"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="sr-only" htmlFor="argument">
              Votre argumentation
            </label>
            <textarea
              id="argument"
              maxLength={5000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                writable
                  ? "Saisissez votre argumentation…"
                  : "La cour a la parole…"
              }
              disabled={!writable}
              rows={2}
            />
            <button className="button" disabled={!writable || !draft.trim()}>
              {trial.busy ? "Envoi…" : "Envoyer"}
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="trial-controls">
            <button
              className="button secondary"
              disabled={
                !s.allowedActions.includes("present_exhibit") ||
                !connected ||
                trial.busy ||
                !caseDetail?.exhibits.length
              }
              onClick={() => setPieceOpen(true)}
            >
              <FileText size={17} />
              Présenter une pièce
            </button>
            <button
              className={
                "button " + (recorder.recording ? "recording" : "secondary")
              }
              disabled={!voiceAllowed}
              onPointerDown={(e) => {
                if (prefs.captureMode === "hold") {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  void recorder.start();
                }
              }}
              onPointerUp={() => {
                if (prefs.captureMode === "hold") recorder.stop();
              }}
              onPointerCancel={() => recorder.stop(true)}
              onLostPointerCapture={() => {
                if (recorder.recording && prefs.captureMode === "hold")
                  recorder.stop();
              }}
              onKeyDown={(e) => {
                if (
                  prefs.captureMode === "hold" &&
                  e.code === "Space" &&
                  !e.repeat
                ) {
                  e.preventDefault();
                  void recorder.start();
                }
              }}
              onKeyUp={(e) => {
                if (prefs.captureMode === "hold" && e.code === "Space") {
                  e.preventDefault();
                  recorder.stop();
                }
              }}
              onClick={() => {
                if (prefs.captureMode === "toggle")
                  void (recorder.recording
                    ? recorder.stop()
                    : recorder.start());
              }}
            >
              <Mic size={17} />
              {prefs.captureMode === "hold"
                ? "Maintenir pour parler"
                : recorder.recording
                  ? "Arrêter la capture"
                  : "Démarrer la capture"}
            </button>
            {s.allowedActions.includes("continue") && (
              <button
                className="button"
                disabled={!connected || trial.busy}
                onClick={() => void trial.send({ type: "continue" })}
              >
                {s.step === 5
                  ? "Consulter le jugement"
                  : s.objection
                    ? "Entendre la décision"
                    : "Écouter la cour"}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
          <div className="capture-status">
            <p className="footnote" role="status">
              {recorder.status}
              {!serverMode
                ? " · capture locale, envoyez ensuite votre intervention par écrit."
                : ""}
            </p>
            {recorder.recording && (
              <meter
                aria-label="Niveau du microphone"
                min={0}
                max={100}
                value={recorder.level}
              />
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                checked={prefs.captureMode === "toggle"}
                onChange={(e) => {
                  recorder.stop(true);
                  savePreferences({
                    ...getPreferences(),
                    captureMode: e.target.checked ? "toggle" : "hold",
                  });
                  setNow(Date.now());
                }}
              />
              Utiliser le mode démarrer / arrêter
            </label>
            {localAudio && (
              <>
                <audio
                  controls
                  src={localAudio}
                  aria-label="Écouter ma capture locale"
                />
                <button
                  className="text-button"
                  onClick={() => setLocalAudio("")}
                >
                  Effacer la capture locale
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="page-actions end">
          <Action to={"/app/trials/" + s.id + "/result"}>
            Consulter mon évaluation
          </Action>
        </div>
      )}
      {import.meta.env.DEV && (
        <details className="dev-tools">
          <summary>Scénarios de développement</summary>
          <button onClick={trial.disconnect}>Simuler une coupure réseau</button>
          <button onClick={() => setSceneError(true)}>
            Simuler une erreur 3D
          </button>
          <button
            onClick={() =>
              setAudioError("Audio indisponible — scénario de test.")
            }
          >
            Simuler un audio indisponible
          </button>
        </details>
      )}
      {pieceOpen && (
        <Modal title="Présenter une pièce" onClose={() => setPieceOpen(false)}>
          <p>
            Examinez le document puis confirmez. Son acceptation dépend de la
            cour.
          </p>
          <label htmlFor="piece">Pièce du dossier</label>
          <select
            id="piece"
            value={piece}
            onChange={(e) => setPiece(e.target.value)}
          >
            {caseDetail?.exhibits.map((e) => (
              <option key={e.id} value={e.id}>
                {e.id} · {e.title}
              </option>
            ))}
          </select>
          {selectedExhibit && <ExhibitViewer exhibit={selectedExhibit} />}
          <div className="inline-actions">
            <button
              className="button secondary"
              onClick={() => setPieceOpen(false)}
            >
              Annuler
            </button>
            <button
              className="button"
              disabled={trial.busy || !selectedExhibit}
              onClick={() =>
                void trial
                  .send({ type: "present_exhibit", exhibitId: piece })
                  .then((ok) => {
                    if (ok) setPieceOpen(false);
                  })
              }
            >
              {trial.busy ? "Envoi…" : "Présenter " + piece}
            </button>
          </div>
        </Modal>
      )}
      {quit && (
        <Modal title="Quitter cette audience ?" onClose={() => setQuit(false)}>
          <p>
            {s.canResume
              ? serverMode
                ? "Le serveur confirme que cette audience peut être reprise."
                : "Cette démo conserve la séance sur cet appareil."
              : "La reprise de cette audience n’est pas confirmée. Quitter ne constitue pas une pause acceptée."}
          </p>
          {draft && (
            <p className="notice">
              Votre brouillon non envoyé ne sera pas conservé si vous quittez
              cette page.
            </p>
          )}
          <div className="inline-actions">
            <button className="button secondary" onClick={() => setQuit(false)}>
              Rester
            </button>
            <button
              className="button"
              onClick={() => {
                recorder.stop(true);
                queue.current?.clear();
                navigate("/app/history");
              }}
            >
              Quitter la séance
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
