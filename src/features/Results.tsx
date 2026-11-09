import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Printer,
  Award,
  Search,
  ChevronRight,
  History as HistoryIcon,
  Check,
  LockKeyhole,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { serverMode, serverApi } from "../services/api";
import {
  getSession,
  getSessions,
  getDemoCase,
  getDemoProfile,
  getDemoRoles,
  demoVerdict,
} from "../services/demo";
import type {
  Verdict,
  Citation,
  TrialHistory,
  Profile,
  Role,
} from "../services/contracts";
import { safeUrl } from "../services/urls";
import { Heading, Action, Badge } from "../components/Layout";
import { Modal } from "../components/Modal";
export function VerdictView({
  verdict,
  debrief = false,
}: {
  verdict: Verdict;
  debrief?: boolean;
}) {
  const [citation, setCitation] = useState<Citation>();
  return (
    <>
      <Heading
        title={
          debrief
            ? "Chaque exercice affine votre pratique."
            : "Chaque audience vous fait progresser."
        }
        description={
          serverMode
            ? "Jugement et retour pédagogique"
            : "Simulation terminée · Jugement et retour pédagogique fictifs"
        }
      />
      {debrief ? (
        <div className="reader-grid">
          <section className="panel reading">
            <Badge>VOTRE DÉBRIEFING</Badge>
            <h2>Votre prochaine étape.</h2>
            <h3>Vos points forts</h3>
            <ul>
              {verdict.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <h3>Pour votre prochaine audience</h3>
            <ul>
              {verdict.improvements.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            {!serverMode && (
              <p className="notice">
                Ce retour est prédéfini pour la démonstration. Il ne constitue
                pas une analyse IA de votre prestation.
              </p>
            )}
          </section>
          <section className="panel">
            <Award className="gold" size={36} />
            <h3>La pratique fait progresser</h3>
            <p>
              + {verdict.rewards.xp} XP{!serverMode ? " de démonstration" : ""}
            </p>
            {verdict.rewards.badges.map((b) => (
              <Badge key={b}>{b}</Badge>
            ))}
            {verdict.rewards.roles.map((r) => (
              <p key={r}>Rôle débloqué : {r}</p>
            ))}
            <p>
              Les récompenses sont rattachées à cette audience ; recharger la
              page ne les attribue pas à nouveau.
            </p>
          </section>
        </div>
      ) : (
        <>
          <div className="result-grid">
            <section className="score-card">
              <span className="eyebrow">
                VOTRE ÉVALUATION{!serverMode ? " DÉMO" : ""}
              </span>
              <strong>{verdict.score}</strong>
              <p>/ 100</p>
              <span className="reward">
                + {verdict.rewards.xp} XP{!serverMode ? " démo" : ""}
              </span>
            </section>
            <section className="panel judgment">
              <h2>Jugement motivé</h2>
              <p>{verdict.judgment}</p>
              <h3>Issue du litige</h3>
              <p>{verdict.outcome}</p>
              {verdict.citations.length ? (
                <div>
                  <h3>Références</h3>
                  {verdict.citations.map((c) => (
                    <button
                      key={c.id}
                      className="button secondary"
                      onClick={() => setCitation(c)}
                    >
                      {c.title} · {c.article}
                    </button>
                  ))}
                </div>
              ) : (
                <Badge>Exemple pédagogique — références non fournies</Badge>
              )}
              <p className="footnote">
                La note évalue la prestation, indépendamment de l’issue du
                litige.
              </p>
            </section>
          </div>
          <div className="criteria-grid">
            {verdict.criteria.map((c) => (
              <article className="stat" key={c.id}>
                <span>{c.label}</span>
                <strong>{c.score} / 100</strong>
                <small>Pondération : {Math.round(c.weight * 100)} %</small>
                <p>{c.explanation}</p>
              </article>
            ))}
          </div>
        </>
      )}
      <div className="page-actions">
        <button className="button secondary" onClick={() => window.print()}>
          <Printer size={17} />
          Imprimer
        </button>
        <Action
          to={
            debrief
              ? "/app/history"
              : "/app/trials/" + verdict.trialId + "/debrief"
          }
        >
          {debrief ? "Voir mes audiences" : "Voir mon débriefing"}
        </Action>
      </div>
      {citation && (
        <Modal
          title="Référence juridique"
          onClose={() => setCitation(undefined)}
        >
          <dl>
            <dt>Source</dt>
            <dd>{citation.source}</dd>
            <dt>Titre</dt>
            <dd>{citation.title}</dd>
            <dt>Article</dt>
            <dd>{citation.article}</dd>
            {citation.version && (
              <>
                <dt>Version / date</dt>
                <dd>{citation.version}</dd>
              </>
            )}
          </dl>
          <blockquote>{citation.excerpt}</blockquote>
          {safeUrl(citation.url) && (
            <a
              className="button"
              href={safeUrl(citation.url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Consulter la source
            </a>
          )}
        </Modal>
      )}
    </>
  );
}
export function Result({ debrief = false }: { debrief?: boolean }) {
  const { trialId = "demo" } = useParams();
  const session = getSession(trialId);
  if (!session?.finished)
    return (
      <>
        <Heading
          title="Le résultat n’est pas encore disponible."
          description="Terminez l’audience pour consulter le jugement pédagogique."
        />
        <Action to={"/app/trials/" + trialId}>Retour à l’audience</Action>
      </>
    );
  return <VerdictView verdict={demoVerdict(session)} debrief={debrief} />;
}
export function HistoryList({ entries }: { entries: TrialHistory[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Toutes");
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const historyQuery = useQuery({
    queryKey: ["history", term, filter, page],
    enabled: serverMode,
    queryFn: () =>
      serverApi.getHistory(
        new URLSearchParams({
          search: term,
          status:
            filter === "Toutes"
              ? ""
              : filter === "Terminée"
                ? "completed"
                : "interrupted",
          page: String(page),
          page_size: "6",
        }),
      ),
  });
  const filtered = serverMode
    ? historyQuery.data?.results || []
    : entries.filter(
        (h) =>
          h.title.toLowerCase().includes(term.toLowerCase()) &&
          (filter === "Toutes" ||
            h.status === (filter === "Terminée" ? "completed" : "interrupted")),
      );
  const pages = Math.max(
    1,
    Math.ceil(
      serverMode
        ? (historyQuery.data?.count || 0) / (historyQuery.data?.pageSize || 6)
        : filtered.length / 6,
    ),
  );
  const visible = serverMode
    ? filtered
    : filtered.slice((page - 1) * 6, page * 6);
  return (
    <>
      <Heading
        title="Vos audiences, votre parcours."
        description="Retrouvez vos exercices et observez votre progression."
      />
      <label className="search-field">
        <Search size={19} />
        <input
          aria-label="Rechercher une audience"
          placeholder="Rechercher une audience…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <div className="filters">
        {["Toutes", "Terminée", "Interrompue"].map((f) => (
          <button
            aria-pressed={filter === f}
            key={f}
            className={"filter " + (f === filter ? "active" : "")}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="panel history-list">
        {serverMode && historyQuery.isPending ? (
          <p role="status">Chargement des audiences…</p>
        ) : serverMode && historyQuery.isError ? (
          <div role="alert" className="notice">
            <p>{historyQuery.error.message}</p>
            <button onClick={() => void historyQuery.refetch()}>
              Réessayer
            </button>
          </div>
        ) : filtered.length ? (
          visible.map((h) => (
            <article key={h.id}>
              <div>
                <h3>{h.title}</h3>
                <p>
                  {new Date(h.date).toLocaleDateString("fr-FR")}{" "}
                  {!serverMode ? "· Données fictives" : ""}
                </p>
              </div>
              <Badge>
                {h.status === "completed" ? "Terminée" : "Interrompue"}
              </Badge>
              <strong>{h.score === null ? "—" : h.score + " / 100"}</strong>
              {h.status === "completed" ? (
                <Link
                  aria-label={"Voir le résultat de " + h.title}
                  to={"/app/trials/" + h.id + "/result"}
                >
                  <ChevronRight />
                </Link>
              ) : h.canResume ? (
                <Link className="button secondary" to={"/app/trials/" + h.id}>
                  Reprendre
                </Link>
              ) : (
                <span>Reprise indisponible</span>
              )}
            </article>
          ))
        ) : (
          <div className="empty">
            <HistoryIcon />
            <h2>Aucune audience dans cette sélection</h2>
            <p>Commencez une simulation ou modifiez les filtres.</p>
            <Action to="/app/simulation/role">Nouvelle simulation</Action>
          </div>
        )}
      </div>
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Précédent
        </button>
        <span>
          Page {page} / {pages}
        </span>
        <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Suivant
        </button>
      </div>
    </>
  );
}
export function History() {
  const entries = getSessions()
    .map((s) => ({
      id: s.id,
      caseId: s.caseId,
      title: getDemoCase(s.caseId).title,
      date: s.startedAt,
      status: s.finished ? ("completed" as const) : ("interrupted" as const),
      score: s.finished ? demoVerdict(s).score : null,
      canResume: s.canResume,
    }))
    .reverse();
  return <HistoryList entries={entries} />;
}
export function ProgressView({
  profile,
  roles,
}: {
  profile: Profile;
  roles: Role[];
}) {
  return (
    <>
      <Heading
        title="Chaque plaidoirie compte."
        description={
          "Votre progression pédagogique" +
          (!serverMode ? " · Démonstration" : "")
        }
      />
      <section className="hero progress-hero">
        <div>
          <span className="eyebrow">VOTRE PARCOURS</span>
          <h2>
            {serverMode ? "Niveau " + profile.level : "Apprenti plaideur"}
          </h2>
          <p>
            Niveau {profile.level.toString().padStart(2, "0")} · {profile.xp} /{" "}
            {profile.nextLevelXp} XP
          </p>
          <div className="progress-track">
            <i
              style={{
                width:
                  Math.min(100, (profile.xp / profile.nextLevelXp) * 100) + "%",
              }}
            />
          </div>
        </div>
        <Award size={100} />
      </section>
      <div className="section-title">
        <h2>Vos badges</h2>
      </div>
      <div className="case-grid">
        {profile.badges.length ? (
          profile.badges.map((b) => (
            <section className="panel badge-card" key={b}>
              <Award size={32} />
              <h3>{b}</h3>
            </section>
          ))
        ) : (
          <p>Aucun badge pour le moment.</p>
        )}
      </div>
      <div className="section-title">
        <h2>Vos rôles</h2>
      </div>
      <div className="panel">
        {roles.map((r) => (
          <div className="role-line" key={r.id}>
            <span>{r.label}</span>
            <Badge>
              {r.unlocked ? (
                <>
                  <Check size={14} />
                  Disponible
                </>
              ) : (
                <>
                  <LockKeyhole size={14} />
                  {r.condition || "Verrouillé"}
                </>
              )}
            </Badge>
          </div>
        ))}
      </div>
    </>
  );
}
export function Progress() {
  return <ProgressView profile={getDemoProfile()} roles={getDemoRoles()} />;
}
export function ServerResult({ debrief = false }: { debrief?: boolean }) {
  const { trialId = "" } = useParams();
  const query = useQuery({
    queryKey: ["result", trialId],
    queryFn: () => serverApi.getResult(trialId),
    retry: false,
  });
  if (query.isPending)
    return <p role="status">Le jugement est en préparation…</p>;
  if (query.isError)
    return (
      <div className="notice" role="alert">
        <p>{query.error.message}</p>
        <button onClick={() => void query.refetch()}>
          Vérifier le résultat
        </button>
        <Action to={"/app/trials/" + trialId}>Retour à l’audience</Action>
      </div>
    );
  return <VerdictView verdict={query.data} debrief={debrief} />;
}
