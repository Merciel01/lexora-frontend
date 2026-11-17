import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  Scale,
  History as HistoryIcon,
  TrendingUp,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { serverMode, serverApi } from "../services/api";
import { getDemoProfile } from "../services/demo";
import { useQuery } from "@tanstack/react-query";
const nav = [
  ["/app", "Vue d’ensemble", LayoutDashboard],
  ["/app/simulation/role", "Nouvelle simulation", Scale],
  ["/app/history", "Mes audiences", HistoryIcon],
  ["/app/progress", "Ma progression", TrendingUp],
  ["/app/settings", "Paramètres", Settings],
  ["/app/local-model", "Modèle local", Scale],
] as const;
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Action({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={"button " + (secondary ? "secondary" : "")} to={to}>
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
export function Heading({
  title,
  description,
  back,
}: {
  title: string;
  description: string;
  back?: string;
}) {
  return (
    <header className="page-heading">
      {back && (
        <Link className="back" to={back}>
          <ArrowLeft size={15} /> Retour
        </Link>
      )}
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
export function CourtArt() {
  return (
    <div className="court-art" aria-hidden="true">
      <div className="court-columns" />
      <div className="court-judges">
        {[0, 1, 2].map((i) => (
          <span className="person" key={i} />
        ))}
      </div>
      <div className="court-bench" />
      <div className="court-parties">
        <span className="person" />
        <Scale size={42} />
        <span className="person" />
      </div>
    </div>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const inAudience = /^\/app\/trials\/[^/]+$/.test(location.pathname);
  const [open, setOpen] = useState(false);
  const [localProfile, setLocalProfile] = useState(getDemoProfile);
  const profileQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => serverApi.getProfile(),
    enabled: serverMode,
  });
  const profile = serverMode ? profileQuery.data : localProfile;
  const name = profile?.name || "Profil indisponible";
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const aside = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const prior = document.activeElement;
    const root = aside.current;
    const focusable = () =>
      Array.from(root?.querySelectorAll<HTMLElement>("a,button") || []).filter(
        (el) => el.offsetParent !== null,
      );
    focusable()[0]?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", keys);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keys);
      if (prior instanceof HTMLElement) prior.focus();
    };
  }, [open]);
  useEffect(() => {
    const update = () => setLocalProfile(getDemoProfile());
    window.addEventListener("lexora-storage", update);
    return () => window.removeEventListener("lexora-storage", update);
  }, []);
  return (
    <div className={inAudience ? "shell trial-active" : "shell"}>
      <aside
        ref={aside}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Menu de navigation"
        className={open ? "sidebar open" : "sidebar"}
      >
        <Link to="/app" className="brand">
          LEXORA<span>L’art de convaincre.</span>
        </Link>
        <button
          className="icon-button close-menu"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <nav aria-label="Navigation principale">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              end={to === "/app"}
              key={to}
              to={to}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="level-card">
          {!profile ? (
            <p>Profil non chargé</p>
          ) : (
            <>
              <span>NIVEAU {String(profile.level).padStart(2, "0")}</span>
              <strong>Apprenti plaideur</strong>
              <div className="progress-track">
                <i
                  style={{
                    width:
                      Math.min(100, (profile.xp / profile.nextLevelXp) * 100) +
                      "%",
                  }}
                />
              </div>
              <small>
                {profile.xp} / {profile.nextLevelXp} XP
                {!serverMode ? " · Démonstration" : ""}
              </small>
            </>
          )}
        </div>
        <Link className="profile" to="/app/settings">
          <span className="avatar">{initials}</span>
          <span>
            {name}
            <small>Espace étudiant</small>
          </span>
        </Link>
      </aside>
      <div className="workspace" inert={open}>
        <header className="topbar">
          <button
            className="icon-button menu"
            aria-label="Ouvrir le menu"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <span>
            ESPACE ÉTUDIANT <b>/</b> DROIT CONGOLAIS
          </span>
          <div>
            <span className="language">FR</span>
            <Link to="/app/settings" aria-label="Mon profil" className="avatar">
              {initials}
            </Link>
          </div>
        </header>
        <div className={"demo-banner " + (serverMode ? "server" : "")}>
          <span className="status-dot" />
          {serverMode
            ? "Mode serveur — intégration en cours de validation"
            : "Démonstration — données fictives"}
          <span className="banner-note">
            Un espace pour apprendre, pratiquer et progresser.
          </span>
        </div>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <nav className="bottom-nav" aria-label="Navigation mobile">
          {nav.slice(0, 4).map(([to, label, Icon], i) => (
            <NavLink end={i === 0} key={to} to={to}>
              <Icon size={20} />
              <span>
                {["Accueil", "Simuler", "Historique", "Progression"][i]}
              </span>
              <span className="sr-only">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
