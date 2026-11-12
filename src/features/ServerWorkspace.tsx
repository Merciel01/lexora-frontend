import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { serverApi, ApiError } from "../services/api";
import { savePreferences } from "../services/preferences";
import Home from "./Home";
import { HistoryList, ProgressView } from "./Results";
export function SessionGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ["me"],
    queryFn: () => serverApi.getProfile(),
    retry: false,
    staleTime: 30000,
  });
  const preferences = useQuery({ queryKey: ["preferences"], queryFn: () => serverApi.getPreferences(), enabled: !!session.data, retry: false });
  useEffect(() => { if (preferences.data) savePreferences(preferences.data); }, [preferences.data]);
  useEffect(() => {
    const expire = () => queryClient.setQueryData(["me"], null);
    window.addEventListener("lexora-session-expired", expire);
    return () => window.removeEventListener("lexora-session-expired", expire);
  }, [queryClient]);
  if (session.isPending)
    return (
      <p className="panel" role="status">
        Vérification de votre session…
      </p>
    );
  if (session.isError) {
    if (session.error instanceof ApiError && session.error.status === 401)
      return (
        <Navigate to="/login" state={{ from: location.pathname }} replace />
      );
    if (session.error instanceof ApiError && session.error.status === 403)
      return (
        <div className="panel" role="alert">
          Accès refusé.
        </div>
      );
    return (
      <div className="notice" role="alert">
        <p>{session.error.message}</p>
        <button className="button" onClick={() => void session.refetch()}>
          Réessayer
        </button>
      </div>
    );
  }
  if (!session.data) return <Navigate to="/login" replace />;
  return children;
}
export function ServerHome() {
  const profile = useQuery({
    queryKey: ["me"],
    queryFn: () => serverApi.getProfile(),
  });
  const history = useQuery({
    queryKey: ["history"],
    queryFn: () => serverApi.getHistory(),
  });
  if (!profile.data) return <p role="status">Chargement du profil…</p>;
  return (
    <Home
      profile={profile.data}
      resume={history.data?.results.find(
        (h) => h.status === "interrupted" && h.canResume,
      )}
    />
  );
}
export function ServerHistory() {
  return <HistoryList entries={[]} />;
}
export function ServerProgress() {
  const profile = useQuery({
    queryKey: ["me"],
    queryFn: () => serverApi.getProfile(),
  });
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: () => serverApi.getRoles(),
  });
  if (profile.isError || roles.isError)
    return (
      <div role="alert" className="notice">
        Progression indisponible.{" "}
        <button
          onClick={() => {
            void profile.refetch();
            void roles.refetch();
          }}
        >
          Réessayer
        </button>
      </div>
    );
  if (!profile.data || !roles.data)
    return <p role="status">Chargement de la progression…</p>;
  return <ProgressView profile={profile.data} roles={roles.data} />;
}
