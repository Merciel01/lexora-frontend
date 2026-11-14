import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  Info,
  ListChecks,
  ListTree,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type {
  CaseDetail,
  GuideIntent,
  GuideRequest,
  GuideResponse,
} from "../../services/contracts";
import { serverMode } from "../../services/api";
import { safeUrl } from "../../services/urls";
import { askGuide, guideNotes, guidePrompts } from "../../services/guide";
type Turn = { intent: GuideIntent; question: string; response: GuideResponse };
const menus = [
  ...guidePrompts.map((prompt, index) => ({
    ...prompt,
    icon: [ListChecks, FileText, ListTree][index],
  })),
  {
    intent: "question" as const,
    label: "Poser une question",
    message: "",
    icon: MessageSquare,
  },
];
function Advice({
  response,
  group,
  onShowExhibits,
}: {
  response: GuideResponse;
  group: string;
  onShowExhibits: (ids: string[]) => void;
}) {
  return (
    <div
      className="guide-submenus"
      role="region"
      aria-label="Échanges avec le guide"
    >
      <details className="guide-submenu" name={group}>
        <summary>
          Vue d’ensemble
          <ChevronDown size={15} aria-hidden="true" />
        </summary>
        <div className="guide-submenu-content">
          <p>{response.introduction}</p>
          {response.engine === "local" && <p>Modèle local · {response.seconds} s · extraits du dossier, sans source de droit validée.</p>}
          {response.truncated && <p>Réponse limitée en longueur. Vous pouvez poser une question plus ciblée.</p>}
        </div>
      </details>
      {response.steps.map((step, index) => (
        <details className="guide-submenu" name={group} key={index}>
          <summary>
            {step.title}
            <ChevronDown size={15} aria-hidden="true" />
          </summary>
          <div className="guide-submenu-content">
            <p>{step.detail}</p>
            {step.exhibitIds.length > 0 && (
              <button
                className="text-button"
                type="button"
                onClick={() => onShowExhibits(step.exhibitIds)}
              >
                <BookOpen size={14} />
                Voir {step.exhibitIds.join(", ")}
              </button>
            )}
          </div>
        </details>
      ))}
      {response.questions.length > 0 && (
        <details className="guide-submenu" name={group}>
          <summary>
            Questions à se poser
            <ChevronDown size={15} aria-hidden="true" />
          </summary>
          <div className="guide-submenu-content">
            <ul>
              {response.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        </details>
      )}
      {response.citations.length > 0 && (
        <details className="guide-submenu" name={group}>
          <summary>
            Sources fournies ({response.citations.length})
            <ChevronDown size={15} aria-hidden="true" />
          </summary>
          <div className="guide-submenu-content">
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
        </details>
      )}
    </div>
  );
}
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
  const [activeMenu, setActiveMenu] = useState<GuideIntent>();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingIntent, setSendingIntent] = useState<GuideIntent>();
  const [error, setError] = useState("");
  const [failed, setFailed] = useState<GuideRequest>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [questionId, setQuestionId] = useState<string>();
  const id = useId();
  const controller = useRef<AbortController | null>(null);
  const flight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  async function send(input: GuideRequest) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setSendingIntent(input.intent);
    setError("");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await askGuide(caseDetail, input, abort.signal);
      if (!mounted.current || abort.signal.aborted) return;
      setTurns((previous) =>
        [
          ...previous,
          { intent: input.intent, question: input.message, response },
        ].slice(-6),
      );
      if (input.intent === "question") setQuestionId(response.id);
      setFailed(undefined);
      if (input.intent === "question") {
        setDraft((current) =>
          current.trim() === input.message ? "" : current,
        );
      }
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
      if (mounted.current) {
        setBusy(false);
        setSendingIntent(undefined);
      }
    }
  }
  function prepare(intent: GuideIntent, message: string) {
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
  function toggleMenu(menu: (typeof menus)[number]) {
    if (activeMenu === menu.intent) {
      setActiveMenu(undefined);
      return;
    }
    setActiveMenu(menu.intent);
    if (
      menu.intent !== "question" &&
      !turns.some((t) => t.intent === menu.intent) &&
      !busy
    )
      prepare(menu.intent, menu.message);
  }
  const questions = turns.filter((t) => t.intent === "question");
  function responseFor(intent: GuideIntent) {
    if (intent === "question")
      return (
        questions.find((t) => t.response.id === questionId)?.response ||
        questions.at(-1)?.response
      );
    return turns.filter((t) => t.intent === intent).at(-1)?.response;
  }
  function notesAction(response: GuideResponse, intent: GuideIntent) {
    const notes = guideNotes(response);
    const isAdded = added.includes(response.id);
    const hasRoom = noteLength + notes.length + (noteLength ? 2 : 0) <= 10000;
    return (
      <div className="guide-note-action">
        <button
          className="button secondary"
          type="button"
          disabled={isAdded || !hasRoom}
          onClick={() => {
            onAddNotes(notes);
            setAdded((previous) => [...previous.slice(-5), response.id]);
          }}
        >
          {isAdded ? <Check size={14} /> : <BookOpen size={14} />}{" "}
          {isAdded
            ? "Ajouté à mes notes"
            : intent === "outline"
              ? "Ajouter ce plan à mes notes"
              : "Ajouter ces conseils à mes notes"}
        </button>
        {!hasRoom && !isAdded && (
          <small>
            Le plan dépasse l’espace restant dans vos notes. Libérez de la place
            avant de l’ajouter.
          </small>
        )}
      </div>
    );
  }
  return (
    <section
      className="preparation-guide panel"
      aria-labelledby={id + "-title"}
    >
      <header className="guide-heading">
        <span className="guide-symbol" aria-hidden="true">
          <Sparkles size={19} />
        </span>
        <div>
          <h3 id={id + "-title"}>Votre guide IA</h3>
          <span className="guide-mode">
            {serverMode
              ? "Accompagnement pédagogique"
              : "Démo — conseils simulés"}
          </span>
        </div>
      </header>
      <div className="guide-menus" aria-label="Rubriques du guide">
        {menus.map((menu) => {
          const expanded = activeMenu === menu.intent;
          const response = responseFor(menu.intent);
          const Icon = menu.icon;
          const currentError = failed?.intent === menu.intent ? error : "";
          return (
            <div
              className={"guide-menu " + (expanded ? "is-active" : "")}
              key={menu.intent}
            >
              <button
                className="guide-menu-trigger"
                id={id + "-trigger-" + menu.intent}
                type="button"
                aria-expanded={expanded}
                aria-controls={id + "-panel-" + menu.intent}
                disabled={busy && menu.intent !== sendingIntent}
                onClick={() => toggleMenu(menu)}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{menu.label}</span>
                <ChevronDown
                  className="guide-chevron"
                  size={16}
                  aria-hidden="true"
                />
              </button>
              {expanded && (
                <div
                  id={id + "-panel-" + menu.intent}
                  className="guide-menu-panel"
                  role="region"
                  aria-labelledby={id + "-trigger-" + menu.intent}
                  tabIndex={0}
                >
                  {menu.intent === "question" && (
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
                        rows={2}
                        maxLength={1500}
                        placeholder="Comment organiser mes arguments ?"
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
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </form>
                  )}
                  {busy && (
                    <p className="guide-status" role="status">
                      Le guide prépare ses conseils… La génération locale peut prendre jusqu’à deux minutes.
                    </p>
                  )}
                  {currentError && (
                    <div className="notice guide-error" role="alert">
                      <p>{currentError}</p>
                      <p>Votre question est conservée.</p>
                      <button
                        className="button secondary"
                        type="button"
                        disabled={busy}
                        onClick={() => failed && void send(failed)}
                      >
                        Réessayer la question
                      </button>
                    </div>
                  )}
                  {response && (
                    <>
                      <Advice
                        key={response.id}
                        response={response}
                        group={id + "-steps-" + response.id}
                        onShowExhibits={onShowExhibits}
                      />
                      {notesAction(response, menu.intent)}
                      {menu.intent !== "question" && (
                        <button
                          className="text-button guide-refresh"
                          type="button"
                          disabled={busy}
                          onClick={() => prepare(menu.intent, menu.message)}
                        >
                          <RefreshCw size={12} />
                          Actualiser les conseils
                        </button>
                      )}
                    </>
                  )}
                  {menu.intent === "question" && questions.length > 1 && (
                    <details className="guide-history">
                      <summary>
                        Questions précédentes ({questions.length})
                      </summary>
                      {questions.map((t) => (
                        <button
                          type="button"
                          aria-pressed={response?.id === t.response.id}
                          key={t.response.id}
                          onClick={() => setQuestionId(t.response.id)}
                        >
                          {t.question}
                        </button>
                      ))}
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <details className="guide-about">
        <summary>
          <Info size={13} aria-hidden="true" />À propos du guide
        </summary>
        <div>
          <p>
            {serverMode
              ? "Le guide reçoit votre question et les échanges de cette page. Vos notes privées ne lui sont pas transmises."
              : "Conseils prédéfinis à partir du dossier, sans IA connectée. Vos questions restent sur cette page."}
          </p>
          <p>
            Le guide aide à construire votre argumentation ; la décision
            appartient à la cour.
          </p>
        </div>
      </details>
      <span className="sr-only" aria-live="polite">
        {busy
          ? "Le guide prépare une réponse."
          : turns.length
            ? "Réponse disponible dans la rubrique sélectionnée."
            : ""}
      </span>
    </section>
  );
}
