import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { request } from "../services/api";
import { citationSchema } from "../services/contracts";
import { RagSources } from "../components/RagSources";

const answerSchema = z.object({
  text: z.string(), status: z.string(),
  citations: z.array(citationSchema),
  retrievedSources: z.array(citationSchema),
});
export function RagAssistant({ trialId }: { trialId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<z.infer<typeof answerSchema>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), [trialId]);
  async function ask() {
    if (!question.trim() || busy) return;
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError(""); setAnswer(undefined);
    const timeout = setTimeout(() => controller.abort(), 50000);
    try {
      const result = await request("/ai/rag", answerSchema, {
        method: "POST", signal: controller.signal,
        body: JSON.stringify({ trialId, message: question.trim() }),
      });
      if (!controller.signal.aborted) setAnswer(result);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Recherche indisponible.");
      else setError("Recherche interrompue. Votre question est conservée.");
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }
  return <details className="panel rag-assistant">
    <summary>Consulter les sources juridiques</summary>
    <p>Posez une question sur les textes disponibles. Cette aide pédagogique peut signaler des sources insuffisantes.</p>
    <form onSubmit={(event) => { event.preventDefault(); void ask(); }}>
      <label htmlFor="rag-question">Votre question</label>
      <textarea id="rag-question" value={question} maxLength={1500} rows={3}
        onChange={(event) => setQuestion(event.target.value)} required />
      <button className="button secondary" type="submit" disabled={busy || !question.trim()}>
        {busy ? "Recherche en cours…" : "Rechercher"}
      </button>
      {busy && <button type="button" className="text-button" onClick={() => active.current?.abort()}>Annuler</button>}
    </form>
    {error && <p role="alert">{error}</p>}
    {answer && <div role="status">
      {answer.status === "no_validated_source" && <p>Aucune source juridique validée ne correspond à cette recherche.</p>}
      <p style={{ whiteSpace: "pre-wrap" }}>{answer.text}</p>
      <RagSources sources={answer.citations} />
      <RagSources sources={answer.retrievedSources} title="Passages retrouvés (leur présence ne prouve pas leur utilisation)" />
      <small>Vérifiez la pertinence et la version applicable des textes.</small>
    </div>}
  </details>;
}
