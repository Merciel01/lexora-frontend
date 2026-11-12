import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LockKeyhole,
  Check,
  Search,
  BookOpen,
  ArrowRight,
  Scale,
  ChevronDown,
  FileText,
} from "lucide-react";
import { read, write } from "../services/storage";
import { serverMode, serverApi } from "../services/api";
import { getDemoRoles, getDemoCases, getDemoCase } from "../services/demo";
import { Heading, Action, Badge } from "../components/Layout";
import { ExhibitViewer } from "../components/ExhibitViewer";
import { Modal } from "../components/Modal";
import { PreparationGuide } from "./guide/PreparationGuide";
export function RolePicker() {
  const [selected, setSelected] = useState(read("role", "defense"));
  const query = useQuery({
    queryKey: ["roles"],
    queryFn: () =>
      serverMode ? serverApi.getRoles() : Promise.resolve(getDemoRoles()),
  });
  return (
    <>
      <Heading
        title="Quel rôle souhaitez-vous incarner ?"
        description="01 Rôle / 02 Dossier / 03 Préparation"
        back="/app"
      />
      {query.isPending ? (
        <p role="status">Chargement des rôles…</p>
      ) : query.isError ? (
        <div className="notice" role="alert">
          <p>{query.error.message}</p>
          <button onClick={() => void query.refetch()}>Réessayer</button>
        </div>
      ) : (
        <>
          <div className="role-grid">
            {query.data.map((r, i) => (
              <button
                key={r.id}
                disabled={!r.unlocked}
                className={"role-card " + (selected === r.id ? "selected" : "")}
                onClick={() => {
                  setSelected(r.id);
                  write("role", r.id);
                  write("case", null);
                }}
              >
                <Badge>
                  {r.unlocked ? (
                    "DISPONIBLE"
                  ) : (
                    <>
                      <LockKeyhole size={13} />
                      {r.condition || "Verrouillé"}
                    </>
                  )}
                </Badge>
                <h2>{r.label}</h2>
                <p>{r.description}</p>
                <div>
                  <span className="role-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {selected === r.id && (
                    <span className="selected-check">
                      <Check size={20} />
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="page-actions">
            <span className="selection-label">
              <Check size={16} />
              {query.data.find((r) => r.id === selected)?.label} sélectionné
            </span>
            {query.data.some((r) => r.id === selected && r.unlocked) ? (
              <Action to="/app/simulation/cases">Choisir un dossier</Action>
            ) : (
              <p>Choisissez un rôle disponible.</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
export function Library() {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [domain, setDomain] = useState("Tous");
  const [difficulty, setDifficulty] = useState("Toutes");
  const [page, setPage] = useState(1);
  const role = read("role", "defense");
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);
  const query = useQuery({
    queryKey: ["cases", term, domain, difficulty, page, role],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: term,
        domain: domain === "Tous" ? "" : domain,
        difficulty: difficulty === "Toutes" ? "" : difficulty,
        page: String(page),
        page_size: "4",
        role_id: role,
      });
      if (serverMode) return serverApi.getCasePage(params);
      const filtered = getDemoCases().filter(
        (c) =>
          c.roleIds.includes(role) &&
          (domain === "Tous" || c.domain === domain) &&
          (difficulty === "Toutes" || c.difficulty === difficulty) &&
          (c.title + " " + c.description)
            .toLowerCase()
            .includes(term.toLowerCase()),
      );
      return {
        results: filtered.slice((page - 1) * 4, page * 4),
        count: filtered.length,
        page,
        pageSize: 4,
      };
    },
  });
  const pages = query.data
    ? Math.max(1, Math.ceil(query.data.count / query.data.pageSize))
    : 1;
  return (
    <>
      <Heading
        title="Choisissez votre prochaine affaire."
        description="Des dossiers compatibles avec votre rôle, conçus pour développer vos compétences."
        back="/app/simulation/role"
      />
      <label className="search-field">
        <Search size={20} />
        <input
          aria-label="Rechercher un dossier"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une affaire, un thème…"
        />
      </label>
      <div className="filters">
        {["Tous", "Civil", "Pénal"].map((d) => (
          <button
            aria-pressed={domain === d}
            className={domain === d ? "filter active" : "filter"}
            onClick={() => {
              setDomain(d);
              setPage(1);
            }}
            key={d}
          >
            {d === "Tous" ? "Tous les dossiers" : "Droit " + d.toLowerCase()}
          </button>
        ))}
        <label>
          Difficulté
          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
          >
            <option>Toutes</option>
            <option>Débutant</option>
            <option>Intermédiaire</option>
          </select>
        </label>
        <button
          className="text-button"
          onClick={() => {
            setSearch("");
            setDomain("Tous");
            setDifficulty("Toutes");
            setPage(1);
          }}
        >
          Réinitialiser
        </button>
      </div>
      {query.isPending ? (
        <p role="status">Chargement des dossiers…</p>
      ) : query.isError ? (
        <div className="notice" role="alert">
          <p>{query.error.message}</p>
          <button onClick={() => void query.refetch()}>Réessayer</button>
        </div>
      ) : query.data.results.length ? (
        <>
          <div className="case-grid">
            {query.data.results.map((c) => (
              <article className="case-card" key={c.id}>
                <Badge>
                  {c.domain.toUpperCase()} · {c.difficulty.toUpperCase()}
                </Badge>
                <h2>{c.title}</h2>
                <p>{c.description}</p>
                <div className="case-meta">
                  <span>{c.minutes} min estimées</span>
                  <span>{c.exhibits.length} pièces</span>
                  {!serverMode && <span>Dossier fictif</span>}
                </div>
                <Link to={"/app/cases/" + c.id}>
                  Consulter le dossier
                  <ArrowRight size={17} />
                </Link>
              </article>
            ))}
          </div>
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Précédent
            </button>
            <span>
              Page {page} / {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </button>
          </div>
        </>
      ) : (
        <div className="empty">
          <BookOpen />
          <h2>Aucun dossier trouvé</h2>
          <p>
            Essayez un autre terme, un rôle compatible ou réinitialisez les
            filtres.
          </p>
        </div>
      )}
    </>
  );
}
const tabs = ["Faits", "Pièces", "Mes notes"];
export function Reader() {
  const { caseId = "" } = useParams();
  const [tab, setTab] = useState("Faits");
  const [note, setNote] = useState(() => read("notes:" + caseId, ""));
  const [clear, setClear] = useState(false);
  const roleId = read("role", "defense");
  useEffect(() => {
    setNote(read("notes:" + caseId, ""));
    setTab("Faits");
  }, [caseId]);
  const query = useQuery({
    queryKey: ["case", caseId],
    queryFn: () =>
      serverMode
        ? serverApi.getCase(caseId)
        : Promise.resolve(getDemoCase(caseId)),
    retry: false,
  });
  if (query.isPending) return <p role="status">Chargement du dossier…</p>;
  if (query.isError)
    return (
      <>
        <Heading
          title="Dossier indisponible"
          description={query.error.message}
        />
        <button className="button" onClick={() => void query.refetch()}>
          Réessayer
        </button>
        <Action to="/app/simulation/cases">Bibliothèque</Action>
      </>
    );
  const c = query.data;
  const compatible = c.roleIds.includes(read("role", "defense"));
  function showExhibits(ids: string[]) {
    setTab("Pièces");
    requestAnimationFrame(() => {
      document.getElementById("tab-1")?.focus();
      for (const id of ids) {
        const element = document.getElementById("exhibit-" + id);
        if (element instanceof HTMLDetailsElement) element.open = true;
      }
    });
  }
  return (
    <>
      <Heading
        title={c.title}
        description={
          (serverMode ? "Affaire" : "Dossier fictif") +
          " · Droit " +
          c.domain.toLowerCase()
        }
        back="/app/simulation/cases"
      />
      <div role="tablist" aria-label="Contenu du dossier" className="tabs">
        {tabs.map((t, i) => (
          <button
            role="tab"
            aria-selected={t === tab}
            aria-controls="case-panel"
            tabIndex={t === tab ? 0 : -1}
            id={"tab-" + i}
            key={t}
            onClick={() => setTab(t)}
            onKeyDown={(e) => {
              const next =
                e.key === "ArrowRight"
                  ? (i + 1) % 3
                  : e.key === "ArrowLeft"
                    ? (i + 2) % 3
                    : e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? 2
                        : -1;
              if (next >= 0) {
                e.preventDefault();
                setTab(tabs[next]);
                document.getElementById("tab-" + next)?.focus();
              }
            }}
          >
            {t === "Pièces" ? "Pièces (" + c.exhibits.length + ")" : t}
          </button>
        ))}
      </div>
      <div className="reader-grid">
        <section
          className="panel reading"
          role="tabpanel"
          id="case-panel"
          aria-labelledby={"tab-" + tabs.indexOf(tab)}
        >
          {tab === "Faits" ? (
            <>
              <span className="eyebrow green">EXPOSÉ DES FAITS</span>
              <h2>{c.description}</h2>
              <p>{c.facts}</p>
              <p>
                Votre mission : identifier les faits pertinents, apprécier les
                pièces et construire une argumentation cohérente.
              </p>
              {!serverMode && (
                <small>
                  Scénario pédagogique inventé. Aucun conseil juridique.
                </small>
              )}
            </>
          ) : tab === "Pièces" ? (
            <>
              <h2>Pièces du dossier</h2>
              {c.exhibits.length ? (
                c.exhibits.map((e) => (
                  <details key={e.id} id={"exhibit-" + e.id}>
                    <summary>
                      {e.id} · {e.title}
                    </summary>
                    <ExhibitViewer exhibit={e} />
                  </details>
                ))
              ) : (
                <p>Aucune pièce n’a été fournie.</p>
              )}
            </>
          ) : (
            <>
              <h2>Mes notes de préparation</h2>
              <label htmlFor="notes">
                Plan et arguments — enregistrés sur cet appareil
              </label>
              <textarea
                id="notes"
                maxLength={10000}
                rows={10}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  write("notes:" + caseId, e.target.value);
                }}
                placeholder={
                  "1. Faits pertinents\n2. Pièces utiles\n3. Demandes à soutenir"
                }
              />
              <small>{note.length} / 10 000 caractères</small>
              <button
                className="button secondary"
                disabled={!note}
                onClick={() => setClear(true)}
              >
                Effacer mes notes
              </button>
            </>
          )}
        </section>
        <aside className="reader-aside">
          <PreparationGuide
            key={c.id + ":" + roleId}
            caseDetail={c}
            roleId={roleId}
            noteLength={note.length}
            onAddNotes={(text) => {
              const next = note ? note + "\n\n" + text : text;
              if (next.length > 10000) return;
              setNote(next);
              write("notes:" + caseId, next);
              setTab("Mes notes");
              requestAnimationFrame(() =>
                document.getElementById("tab-2")?.focus(),
              );
            }}
            onShowExhibits={showExhibits}
          />
          <details className="panel reader-accordion" name="reader-tools">
            <summary>
              <Scale size={17} aria-hidden="true" />
              <span>Objectif de préparation</span>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <div className="reader-accordion-body">
              <h3>Une argumentation convaincante</h3>
              <p>
                Défendez la position de votre client en vous appuyant sur les
                pièces du dossier.
              </p>
              <p>Distinguez les faits, les preuves et vos arguments.</p>
            </div>
          </details>
          <details className="panel reader-accordion" name="reader-tools">
            <summary>
              <FileText size={17} aria-hidden="true" />
              <span>Pièces à examiner ({c.exhibits.length})</span>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <div className="reader-accordion-body">
              {c.exhibits.map((e) => (
                <button
                  type="button"
                  className="reader-exhibit-link"
                  key={e.id}
                  onClick={() => showExhibits([e.id])}
                >
                  {e.id} · {e.title}
                </button>
              ))}
            </div>
          </details>
        </aside>
      </div>
      <div className="page-actions end">
        {compatible ? (
          <Link
            to="/app/session/setup"
            className="button"
            onClick={() => write("case", c.id)}
          >
            Vérifier mon équipement
            <ArrowRight size={16} />
          </Link>
        ) : (
          <div className="notice">
            Ce dossier n’est pas compatible avec votre rôle.{" "}
            <Link to="/app/simulation/role">Changer de rôle</Link>
          </div>
        )}
      </div>
      {clear && (
        <Modal title="Effacer ces notes ?" onClose={() => setClear(false)}>
          <p>
            Cette suppression concerne uniquement les notes de ce dossier, sur
            cet appareil.
          </p>
          <div className="inline-actions">
            <button
              className="button secondary"
              onClick={() => setClear(false)}
            >
              Annuler
            </button>
            <button
              className="button"
              onClick={() => {
                setNote("");
                write("notes:" + caseId, "");
                setClear(false);
              }}
            >
              Confirmer la suppression
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
