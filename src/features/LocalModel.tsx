import { useState } from "react";
import { z } from "zod";
import { Heading } from "../components/Layout";
import { request } from "../services/api";

const answerSchema = z.object({ text: z.string(), model: z.string(), seconds: z.number(), truncated: z.boolean(), mode: z.enum(["local", "rag"]), citations: z.array(z.unknown()) });

export default function LocalModel() {
  const [message, setMessage] = useState("Explique en trois phrases comment préparer une prise de parole claire.");
  const [mode, setMode] = useState<"local" | "rag">("local");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<z.infer<typeof answerSchema> | null>(null);
  const [error, setError] = useState("");
  return <>
    <Heading title="Modèle local LEXORA" description="Testez le modèle sur cet ordinateur. Chaque question est indépendante." />
    <form className="panel settings-form" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError(""); setAnswer(null);
      try { setAnswer(await request("/ai/local", answerSchema, { method: "POST", body: JSON.stringify({message, mode}) }, 150000)); }
      catch (err) { setError(err instanceof Error ? err.message : "La génération a échoué."); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="llm-mode">Mode</label>
      <select id="llm-mode" value={mode} disabled={busy} onChange={e => setMode(e.target.value as "local" | "rag")}>
        <option value="local">Modèle seul — sans sources juridiques</option>
        <option value="rag">Corpus juridique — en révision</option>
      </select>
      <p>Le test local fonctionne sans Internet. Les documents juridiques en révision ne sont pas utilisés pour générer une réponse.</p>
      <label htmlFor="llm-question">Votre question</label>
      <textarea id="llm-question" rows={5} maxLength={1000} required value={message} disabled={busy} onChange={e => setMessage(e.target.value)} />
      <button className="button" disabled={busy || !message.trim()}>{busy ? "Génération en cours…" : "Envoyer"}</button>
      {busy && <p role="status">Le chargement et la génération peuvent prendre jusqu’à deux minutes.</p>}
      {error && <p role="alert">{error}</p>}
    </form>
    {answer && <section className="panel" aria-live="polite"><h2>Réponse</h2><p style={{whiteSpace: "pre-wrap"}}>{answer.text}</p><p>{answer.model} · {answer.seconds} s · {answer.mode === "local" ? "Sans sources documentaires" : "Recherche juridique non activée"}</p>{answer.truncated && <p>Réponse limitée en longueur. Posez une question plus ciblée pour obtenir une réponse plus courte.</p>}</section>}
  </>;
}
