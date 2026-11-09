import { FileText, Download } from "lucide-react";
import type { Exhibit } from "../services/contracts";
import { safeUrl } from "../services/urls";
export function ExhibitViewer({ exhibit }: { exhibit: Exhibit }) {
  const url = safeUrl(exhibit.url, false);
  function download() {
    if (url) return;
    const blob = new Blob(
      [
        exhibit.title +
          "\n\n" +
          (exhibit.content || "") +
          "\n\nDocument pédagogique fictif.",
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const object = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = object;
    a.download = exhibit.caseId + "-" + exhibit.id + ".txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(object), 1000);
  }
  return (
    <div className="exhibit-preview">
      <FileText aria-hidden="true" />
      <h3>
        {exhibit.id} · {exhibit.title}
      </h3>
      {exhibit.mediaType === "text" ? (
        <p>{exhibit.content || "Contenu textuel indisponible."}</p>
      ) : url ? (
        exhibit.mediaType === "image" ? (
          <img
            src={url}
            alt={"Pièce : " + exhibit.title}
            className="exhibit-image"
          />
        ) : (
          <iframe
            title={"Aperçu PDF : " + exhibit.title}
            src={url}
            sandbox=""
            className="exhibit-pdf"
          />
        )
      ) : (
        <p role="alert">
          L’adresse de cette pièce n’est pas autorisée ou est absente.
        </p>
      )}
      {exhibit.downloadAllowed &&
        (url ? (
          <a
            className="button secondary"
            href={url}
            download
            rel="noopener noreferrer"
          >
            <Download size={16} />
            Télécharger
          </a>
        ) : exhibit.mediaType === "text" ? (
          <button type="button" className="button secondary" onClick={download}>
            <Download size={16} />
            Télécharger le texte
          </button>
        ) : null)}
    </div>
  );
}
