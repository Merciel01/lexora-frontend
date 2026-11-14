/* Report essential script/WebGL failures, not unrelated image/audio load events. */
window.addEventListener("error", event => {
  if (new URLSearchParams(location.search).get("embed") !== "1") return;
  if (!(event instanceof ErrorEvent) && !(event.target instanceof HTMLScriptElement)) return;
  const graphics = event instanceof ErrorEvent && /webgl|graphics|context/i.test(event.message);
  parent.postMessage({channel: "lexora-courtroom", version: 1, type: "unavailable",
    reason: graphics ? "Le navigateur n’a pas pu initialiser le rendu WebGL. Fermez les autres vues 3D puis réessayez." : "Un script nécessaire à la salle a échoué. Rechargez la salle 3D."}, location.origin);
}, true);
