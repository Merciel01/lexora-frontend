import { useEffect, Component, type ReactNode } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { getPreferences } from "./services/preferences";
import { serverMode } from "./services/api";
import { Shell, Heading } from "./components/Layout";
import Home from "./features/Home";
import { RolePicker, Library, Reader } from "./features/Cases";
import { Setup, Trial } from "./features/Trial";
import { Result, History, Progress, ServerResult } from "./features/Results";
import { Preferences, Auth } from "./features/Account";
import {
  SessionGuard,
  ServerHome,
  ServerHistory,
  ServerProgress,
} from "./features/ServerWorkspace";
import NotFound from "./features/NotFound";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="panel" role="alert">
        <h1>L’écran n’a pas pu être affiché.</h1>
        <p>Vos données locales n’ont pas été effacées.</p>
        <button
          className="button"
          onClick={() => window.location.assign("/app")}
        >
          Retour à l’accueil
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("main-content")?.focus({ preventScroll: true });
    document.title =
      (document.querySelector("h1")?.textContent || "L’art de convaincre") +
      " — Lexora";
  }, [location.pathname]);
  useEffect(() => {
    document.documentElement.dataset.reduced = String(getPreferences().reduced);
  }, []);
  const workspace = (
    <Shell>
      <Routes>
        <Route index element={serverMode ? <ServerHome /> : <Home />} />
        <Route path="simulation/role" element={<RolePicker />} />
        <Route path="simulation/cases" element={<Library />} />
        <Route path="cases/:caseId" element={<Reader />} />
        <Route path="session/setup" element={<Setup />} />
        <Route path="trials/:trialId" element={<Trial />} />
        <Route
          path="trials/:trialId/result"
          element={serverMode ? <ServerResult /> : <Result />}
        />
        <Route
          path="trials/:trialId/debrief"
          element={serverMode ? <ServerResult debrief /> : <Result debrief />}
        />
        <Route
          path="history"
          element={serverMode ? <ServerHistory /> : <History />}
        />
        <Route
          path="progress"
          element={serverMode ? <ServerProgress /> : <Progress />}
        />
        <Route path="settings" element={<Preferences />} />
        <Route
          path="forbidden"
          element={
            <Heading
              title="Accès refusé"
              description="Ce rôle ou cette audience n’est pas accessible à votre profil."
            />
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
  return (
    <ErrorBoundary key={location.pathname}>
      <a href="#main-content" className="skip-link">
        Aller au contenu
      </a>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth kind="register" />} />
        <Route path="/forgot-password" element={<Auth kind="forgot" />} />
        <Route path="/reset-password" element={<Auth kind="reset" />} />
        <Route
          path="/app/*"
          element={
            serverMode ? <SessionGuard>{workspace}</SessionGuard> : workspace
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
