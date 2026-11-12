import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import { read, write } from "../services/storage";
import { serverMode, serverApi } from "../services/api";
import {
  getPreferences,
  savePreferences,
  type Preferences as PreferencesType,
} from "../services/preferences";
import { Heading, CourtArt } from "../components/Layout";
export function Preferences() {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => serverApi.getProfile(),
    enabled: serverMode,
  });
  const [name, setName] = useState(read("name", "Étudiant démo"));
  const [prefs, setPrefs] = useState<PreferencesType>(getPreferences);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remotePreferences = useQuery({ queryKey: ["preferences"], queryFn: () => serverApi.getPreferences(), enabled: serverMode });
  useEffect(() => { if (remotePreferences.data) setPrefs(remotePreferences.data); }, [remotePreferences.data]);
  const navigate = useNavigate();
  useEffect(() => {
    if (me.data) setName(me.data.name);
  }, [me.data]);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const update = () =>
      setVoices(
        speechSynthesis.getVoices().filter((v) => v.lang.startsWith("fr")),
      );
    update();
    speechSynthesis.addEventListener("voiceschanged", update);
    return () => speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  function update<K extends keyof PreferencesType>(
    key: K,
    value: PreferencesType[K],
  ) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }
  return (
    <>
      <Heading
        title="Un espace à votre mesure."
        description="Profil et préférences d’accessibilité, voix et qualité 3D"
      />
      <form
        className="panel settings-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (serverMode) {
              await serverApi.saveProfile(name.trim());
              await serverApi.savePreferences(prefs);
              await queryClient.invalidateQueries({ queryKey: ["me"] });
            } else write("name", name.trim());
            savePreferences(prefs);
            setSaved(true);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Enregistrement impossible.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Mon profil</h2>
        <label htmlFor="name">Nom affiché</label>
        <input
          id="name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
        />
        <label htmlFor="language">Langue de l’interface</label>
        <select id="language">
          <option>Français</option>
        </select>
        <h3>Accessibilité</h3>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={prefs.reduced}
            onChange={(e) => update("reduced", e.target.checked)}
          />
          Réduire les animations
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={prefs.subtitles}
            onChange={(e) => update("subtitles", e.target.checked)}
          />
          Afficher les sous-titres dans la scène
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={prefs.captureMode === "toggle"}
            onChange={(e) =>
              update("captureMode", e.target.checked ? "toggle" : "hold")
            }
          />
          Utiliser le mode vocal démarrer / arrêter
        </label>
        <h3>Voix et audio</h3>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={prefs.sound}
            onChange={(e) => update("sound", e.target.checked)}
          />
          Activer le son par défaut, après interaction
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={prefs.localVoice}
            disabled={!("speechSynthesis" in window)}
            onChange={(e) => update("localVoice", e.target.checked)}
          />
          Lecture locale simulée en démonstration
        </label>
        <label htmlFor="voice">Voix locale de simulation</label>
        <select
          id="voice"
          value={prefs.voiceUri}
          onChange={(e) => update("voiceUri", e.target.value)}
        >
          <option value="">Voix française par défaut</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
        <p className="footnote">
          La disponibilité des voix dépend de votre appareil. La voix locale ne
          remplace pas le TTS Django.
        </p>
        <label htmlFor="quality">Qualité 3D</label>
        <select
          id="quality"
          value={prefs.quality}
          onChange={(e) =>
            update("quality", e.target.value as PreferencesType["quality"])
          }
        >
          <option value="auto">Automatique</option>
          <option value="low">Faible — appareil modeste</option>
          <option value="high">Élevée</option>
        </select>
        <p>
          {serverMode ? "Profil et préférences sont enregistrés dans votre compte LEXORA." : "Les préférences sont enregistrées sur cet appareil."}
        </p>
        <button className="button" disabled={busy || !name.trim()}>
          {busy ? "Enregistrement…" : "Enregistrer mes préférences"}
          <Check size={16} />
        </button>
        {saved && (
          <p className="success" role="status">
            {serverMode ? "Préférences enregistrées dans votre compte." : "Préférences enregistrées sur cet appareil."}
          </p>
        )}
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
      </form>
      {serverMode && (
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await serverApi.logout();
              queryClient.clear();
              navigate("/login", { replace: true });
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Déconnexion impossible.",
              );
            }
          }}
        >
          Se déconnecter
        </button>
      )}
    </>
  );
}
export function Auth({
  kind = "login",
}: {
  kind?: "login" | "register" | "forgot" | "reset";
}) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const title =
    kind === "register"
      ? "Votre parcours commence ici."
      : kind === "forgot"
        ? "Retrouvez votre accès."
        : kind === "reset"
          ? "Choisissez un nouveau mot de passe."
          : "Heureux de vous retrouver.";
  async function submit(form: HTMLFormElement) {
    setNotice("");
    setError("");
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    if (
      (kind === "register" || kind === "reset") &&
      password !== data.get("confirmation")
    ) {
      setError("Les mots de passe ne correspondent pas.");
      form.querySelector<HTMLInputElement>("#confirmation")?.focus();
      return;
    }
    if (!serverMode) {
      if (kind === "login") {
        navigate("/app");
        return;
      }
      setNotice(
        kind === "forgot"
          ? "Si un compte correspond à cette adresse, les instructions seront envoyées lorsque Django sera connecté."
          : "Le formulaire est valide. La création ou modification de compte requiert Django ; aucune donnée n’a été envoyée.",
      );
      return;
    }
    setBusy(true);
    try {
      if (kind === "login") {
        const profile = await serverApi.login(email, password);
        queryClient.clear();
        queryClient.setQueryData(["me"], profile);
        form.reset();
        navigate("/app", { replace: true });
      } else if (kind === "register") {
        await serverApi.register(
          String(data.get("name") || "").trim(),
          email,
          password,
        );
        form.reset();
        setNotice(
          "Compte créé. Vous pouvez maintenant vous connecter à LEXORA.",
        );
      } else if (kind === "forgot") {
        await serverApi.forgot(email);
        setNotice(
          "Si un compte correspond à cette adresse, les instructions de récupération seront envoyées.",
        );
      } else {
        const uid = params.get("uid"),
          token = params.get("token");
        if (!uid || !token)
          throw new Error(
            "Le lien de réinitialisation est absent ou incomplet.",
          );
        await serverApi.reset(uid, token, password);
        form.reset();
        navigate("/login", { replace: true });
      }
    } catch (err) {
      if (kind === "forgot")
        setNotice(
          "Si un compte correspond à cette adresse, les instructions de récupération seront envoyées lorsque le service sera disponible.",
        );
      else
        setError(
          kind === "login"
            ? "Connexion impossible. Vérifiez vos identifiants ou réessayez plus tard."
            : err instanceof Error
              ? err.message
              : "La demande n’a pas pu être traitée.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page" id="main-content" tabIndex={-1}>
      <Link className="auth-brand" to="/app">
        LEXORA
      </Link>
      <div className="auth-layout">
        <section className="auth-story">
          <span className="eyebrow">L’ART DE CONVAINCRE</span>
          <h1>
            La conviction
            <br />
            se travaille.
          </h1>
          <p>Préparez. Plaidez. Progressez.</p>
          <CourtArt />
          <small>Votre terrain d’entraînement au raisonnement juridique.</small>
        </section>
        <section className="auth-form panel">
          <h2>{title}</h2>
          <p>
            {kind === "login"
              ? "Accédez à votre espace de pratique."
              : "Un espace pour apprendre par la pratique."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            {kind === "register" && (
              <>
                <label htmlFor="fullname">Nom complet</label>
                <input
                  id="fullname"
                  name="name"
                  required
                  maxLength={100}
                  autoComplete="name"
                />
              </>
            )}
            {kind !== "reset" && (
              <>
                <label htmlFor="email">Adresse e-mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                />
              </>
            )}
            {kind !== "forgot" && (
              <>
                <label htmlFor="password">Mot de passe</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete={
                    kind === "login" ? "current-password" : "new-password"
                  }
                />
              </>
            )}
            {(kind === "register" || kind === "reset") && (
              <>
                <label htmlFor="confirmation">Confirmer le mot de passe</label>
                <input
                  id="confirmation"
                  name="confirmation"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  aria-invalid={!!error}
                  aria-describedby={error ? "auth-error" : undefined}
                  autoComplete="new-password"
                />
              </>
            )}
            {error && (
              <p id="auth-error" role="alert" className="notice">
                {error}
              </p>
            )}
            {kind === "login" && (
              <Link className="forgot-link" to="/forgot-password">
                Mot de passe oublié ?
              </Link>
            )}
            <button className="button" disabled={busy}>
              {busy
                ? "Veuillez patienter…"
                : kind === "login"
                  ? serverMode
                    ? "Se connecter"
                    : "Entrer dans la démonstration"
                  : kind === "register"
                    ? "Créer mon compte"
                    : kind === "forgot"
                      ? "Recevoir les instructions"
                      : "Modifier le mot de passe"}
              <ArrowRight size={17} />
            </button>
          </form>
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
          <p className="auth-switch">
            {kind === "login" ? (
              <>
                Pas encore de compte ? <Link to="/register">S’inscrire</Link>
              </>
            ) : (
              <Link to="/login">Retour à la connexion</Link>
            )}
          </p>
          {!serverMode && (
            <p className="footnote">
              Démonstration : aucune authentification réelle. Utilisez des
              identifiants fictifs.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
