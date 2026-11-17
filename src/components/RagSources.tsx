import type { Citation } from "../services/contracts";
import { safeUrl } from "../services/urls";

export function RagSources({ sources, title = "Sources citées" }: { sources: Citation[]; title?: string }) {
  if (!sources.length) return null;
  return <details className="rag-sources">
    <summary>{title} ({sources.length})</summary>
    {sources.map((source) => {
      const url = safeUrl(source.url);
      return <article key={source.id}>
        <strong>[{source.id}] {source.title}</strong>
        <p>{source.article}{source.version ? ` · Version ${source.version}` : ""}</p>
        <blockquote>{source.excerpt}</blockquote>
        {url && <a href={url} target="_blank" rel="noopener noreferrer">Consulter la source</a>}
      </article>;
    })}
  </details>;
}
