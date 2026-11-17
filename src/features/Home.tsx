import {
  History as HistoryIcon,
  TrendingUp,
  Award,
  BookOpen,
} from "lucide-react";
import { Heading, Action, Badge } from "../components/Layout";
import { getDemoProfile, getSessions, getDemoCase } from "../services/demo";
import { serverMode } from "../services/api";
import type { Profile, TrialHistory } from "../services/contracts";
export default function Home({
  profile = getDemoProfile(),
  resume,
}: {
  profile?: Profile;
  resume?: TrialHistory;
}) {
  const localResume = !serverMode
    ? getSessions()
        .filter((s) => !s.finished && s.canResume)
        .at(-1)
    : undefined;
  return (
    <>
      <Heading
        title="Votre prochaine plaidoirie commence ici."
        description="Entraînez votre raisonnement, votre éloquence et votre maîtrise du droit."
      />
      <section className="hero hero--courtroom">
        <div>
          <span className="eyebrow">APPRENDRE EN PRATIQUANT</span>
          <h2>
            Prenez la parole.
            <br />
            Défendez vos convictions.
          </h2>
          <p>
            Une cour virtuelle. Des dossiers fictifs. Un véritable entraînement.
          </p>
          <Action to="/app/simulation/role">Commencer une simulation</Action>
        </div>
        <figure className="home-courtroom">
          <img
            src={`${import.meta.env.BASE_URL}images/lexora-courtroom-home.webp`}
            alt="La salle d’audience virtuelle Lexora, ses intervenants et le drapeau de la RDC."
            width={2069}
            height={760}
            fetchPriority="high"
          />
        </figure>
      </section>
      <div className="stats-grid">
        {(
          [
            [profile.completedCount, "Audiences terminées", HistoryIcon],
            [profile.averageScore + " / 100", "Score moyen", TrendingUp],
            [profile.badges.length, "Badges obtenus", Award],
          ] as const
        ).map(([v, l, Icon]) => (
          <article className="stat" key={String(l)}>
            <Icon size={22} />
            <strong>{String(v)}</strong>
            <span>{String(l)}</span>
          </article>
        ))}
      </div>
      <div className="section-title">
        <h2>Reprendre votre préparation</h2>
        <span>Votre espace de travail</span>
      </div>
      <section className="resume-card">
        <div>
          <Badge>
            {resume || localResume
              ? "AUDIENCE À REPRENDRE"
              : "DOSSIER À EXPLORER"}
          </Badge>
          <h3>
            {resume?.title ||
              (localResume
                ? getDemoCase(localResume.caseId).title
                : serverMode
                  ? "Préparer une nouvelle audience"
                  : "Le litige de la parcelle de Limete")}
          </h3>
          <p>
            {resume || localResume
              ? "La reprise est disponible."
              : "Explorez les faits et les pièces avant de plaider."}
          </p>
        </div>
        <Action
          to={
            resume && resume.canResume
              ? "/app/trials/" + resume.id
              : localResume
                ? "/app/trials/" + localResume.id
                : "/app/simulation/cases"
          }
        >
          {resume || localResume
            ? "Reprendre l’audience"
            : "Consulter les dossiers"}
        </Action>
      </section>
      <p className="footnote">
        <BookOpen size={15} />
        Chaque audience est une occasion d’affiner votre raisonnement.
      </p>
    </>
  );
}
