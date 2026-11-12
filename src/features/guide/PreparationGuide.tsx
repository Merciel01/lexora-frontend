import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import type {
  CaseDetail,
  GuideRequest,
  GuideResponse,
} from "../../services/contracts";
import { serverMode } from "../../services/api";
import { safeUrl } from "../../services/urls";
import { askGuide, guideNotes, guidePrompts } from "../../services/guide";
import { Badge } from "../../components/Layout";
export function PreparationGuide({
  caseDetail,
  roleId,
  noteLength,
  onAddNotes,
  onShowExhibits,
}: {
  caseDetail: CaseDetail;
  roleId: string;
  noteLength: number;
  onAddNotes: (text: string) => void;
  onShowExhibits: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState<GuideRequest>();
  const [turns, setTurns] = useState<
    { question: string; response: GuideResponse }[]
  >([]);
  const [added, setAdded] = useState<string[]>([]);
  const [unread, setUnread] = useState(false);
  const id = useId();
  const controller = useRef<AbortController | null>(null);
  const flight = useRef(false);
  const mounted = useRef(true);
  const log = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  function scrollToLatest() {
    const latest = log.current?.querySelector<HTMLElement>(
      ".guide-exchange:last-child",
    );
    if (log.current && latest) log.current.scrollTop = latest.offsetTop;
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (nearBottom.current) {
      scrollToLatest();
    } else setUnread(true);
  }, [turns]);
  async function send(input: GuideRequest) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await askGuide(caseDetail, input, abort.signal);
      if (!mounted.current || abort.signal.aborted) return;
      setTurns((previous) =>
        [...previous, { question: input.message, response }].slice(-6),
      );
      setFailed(undefined);
      setDraft((current) => (current.trim() === input.message ? "" : current));
    } catch (err) {
      if (!mounted.current || abort.signal.aborted) return;
      setError(
        err instanceof Error
          ? err.message
          : "Le guide est indisponible. Votre question est conservée.",
      );
      setFailed(input);
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function prepare(intent: GuideRequest["intent"], message: string) {
    const history = turns
      .flatMap((t) => [
        { role: "student" as const, text: t.question },
        {
          role: "guide" as const,
          text: [
            t.response.introduction,
            ...t.response.steps.map((s) => s.title + ": " + s.detail),
          ]
            .join("\n")
            .slice(0, 6000),
        },
      ])
      .slice(-12);
    void send({
      clientMessageId: crypto.randomUUID(),
      roleId,
      intent,
      message: message.trim(),
      history,
    });
  }
  const latest = turns.at(-1)?.response;
  const notes = latest ? guideNotes(latest) : "";
  const canAdd =
    !!latest &&
    !added.includes(latest.id) &&
    noteLength + notes.length + (noteLength ? 2 : 0) <= 10000;
  return (
    <section
      className={"preparation-guide panel " + (open ? "is-open" : "")}
      aria-labelledby={id + "-title"}
    >
      <div className="guide-heading">
        <span className="guide-symbol" aria-hidden="true">
          <Sparkles size={21} />
        </span>
        <div>
          <span className="eyebrow">PRÉPARER AVEC MÉTHODE</span>
          <h3 id={id + "-title"}>Votre guide IA</h3>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label={open ? "Réduire le guide" : "Ouvrir le guide"}
          aria-expanded={open}
          aria-controls={id + "-body"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
      <p>
        Comprendre le dossier, examiner les pièces et construire votre
        plaidoirie, étape par étape.
      </p>
      {!open ? (
        <div id={id + "-body"}>
          {!serverMode && <Badge>Démo — conseils simulés</Badge>}
          <button
            type="button"
            className="button guide-launch"
            aria-expanded={false}
            aria-controls={id + "-body"}
            onClick={() => setOpen(true)}
          >
            Préparer avec le guide
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div id={id + "-body"}>
          <Badge>
            {serverMode
              ? "Accompagnement pédagogique"
              : "Démo — conseils simulés"}
          </Badge>
          <p className="guide-context">
            {serverMode
              ? "Le guide reçoit votre question et les échanges de cette page. Vos notes privées ne lui sont pas transmises."
              : "Conseils prédéfinis à partir du dossier, sans IA connectée. Vos questions restent sur cette page."}
          </p>
          <div
            className="guide-prompts"
            aria-label="Commencer avec une question"
          >
            {guidePrompts.map((prompt) => (
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                key={prompt.intent}
                onClick={() => prepare(prompt.intent, prompt.message)}
              >
                {prompt.label}
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
          {turns.length > 0 && (
            <div
              className="guide-conversation"
              role="region"
              aria-label="Échanges avec le guide"
              tabIndex={0}
              ref={log}
              onScroll={() => {
                const el = log.current;
                if (el) {
                  nearBottom.current =
                    el.scrollHeight - el.scrollTop - el.clientHeight < 50;
                  if (nearBottom.current) setUnread(false);
                }
              }}
            >
              {turns.map(({ question, response }) => (
                <article className="guide-exchange" key={response.id}>
                  <p className="guide-question">
                    <MessageSquare size={15} aria-hidden="true" />
                    <span>{question}</span>
                  </p>
                  <div className="guide-answer">
                    <p>{response.introduction}</p>
                    <ol>
                      {response.steps.map((step, index) => (
                        <li key={index}>
                          <strong>{step.title}</strong>
                          <p>{step.detail}</p>
                          {step.exhibitIds.length > 0 && (
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => onShowExhibits(step.exhibitIds)}
                            >
                              <BookOpen size={14} />
                              Voir {step.exhibitIds.join(", ")}
                            </button>
                          )}
                        </li>
                      ))}
                    </ol>
                    {response.questions.length > 0 && (
                      <div className="guide-reflection">
                        <strong>À vous de réfléchir</strong>
                        <ul>
                          {response.questions.map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {response.citations.length > 0 && (
                      <div className="guide-citations">
                        <strong>Sources fournies</strong>
                        {response.citations.map((c) => (
                          <details key={c.id}>
                            <summary>
                              {c.title} · {c.article}
                            </summary>
                            <p>
                              {c.source}
                              {c.version ? " · " + c.version : ""}
                            </p>
                            <blockquote>{c.excerpt}</blockquote>
                            {safeUrl(c.url) && (
                              <a
                                href={safeUrl(c.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Consulter la source
                              </a>
                            )}
                          </details>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {unread && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                scrollToLatest();
                nearBottom.current = true;
                setUnread(false);
              }}
            >
              Nouvelle réponse ↓
            </button>
          )}
          <p className="guide-status" role="status" aria-live="polite">
            {busy
              ? "Le guide prépare ses conseils…"
              : turns.length
                ? "Réponse disponible."
                : "Choisissez une question pour commencer."}
          </p>
          {error && (
            <div className="notice guide-error" role="alert">
              <p>{error}</p>
              <p>
                Votre question est conservée. Vous pouvez poursuivre la
                préparation du dossier.
              </p>
              {failed && (
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => void send(failed)}
                >
                  Réessayer la question
                </button>
              )}
            </div>
          )}
          <form
            className="guide-compose"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) prepare("question", draft);
            }}
          >
            <label htmlFor={id + "-question"}>
              Votre question de préparation
            </label>
            <textarea
              id={id + "-question"}
              rows={3}
              maxLength={1500}
              placeholder="Comment organiser mes arguments dans ce dossier ?"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={busy}
            />
            <div className="guide-compose-footer">
              <small>{draft.length} / 1 500</small>
              <button
                className="button"
                type="submit"
                disabled={busy || !draft.trim()}
              >
                {busy ? "Envoi…" : "Demander au guide"}
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
          {latest && (
            <div className="guide-note-action">
              <button
                className="button secondary"
                type="button"
                disabled={!canAdd}
                onClick={() => {
                  onAddNotes(notes);
                  setAdded((current) => [...current.slice(-5), latest.id]);
                }}
              >
                {added.includes(latest.id) ? (
                  <Check size={15} />
                ) : (
                  <BookOpen size={15} />
                )}{" "}
                {added.includes(latest.id)
                  ? "Ajouté à mes notes"
                  : "Ajouter ce plan à mes notes"}
              </button>
              {!canAdd && !added.includes(latest.id) && (
                <small>
                  Le plan dépasse l’espace restant dans vos notes. Libérez de la
                  place avant de l’ajouter.
                </small>
              )}
            </div>
          )}
          <p className="guide-footnote">
            Le guide vous aide à argumenter ; la décision appartient à la cour.
            N’attribuez à une pièce ou à un texte que ce que son contenu permet
            d’établir.
          </p>
        </div>
      )}
    </section>
  );
}
