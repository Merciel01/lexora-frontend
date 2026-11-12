/* Same-origin visual adapter only. It does not send commands to Django. */
(() => {
  if (!LEXORA_EMBED) return;
  const roles = { president: "president", "assessor-1": "assesseur_01", "assessor-2": "assesseur_02", prosecutor: "ministere_public", opposition: "avocat_adverse", clerk: "greffier", student: "etudiant_avocat" };
  let ready = false, pending = null, previous = null;
  const send = (type, extra = {}) => parent.postMessage({ channel: "lexora-courtroom", version: 1, type, ...extra }, location.origin);
  window.lexoraSceneUnavailable = () => send("unavailable");
  window.lexoraSceneReady = () => {
    ready = true;
    schedule = null;
    $("followSpeaker").checked = false;
    renderer.domElement.addEventListener("webglcontextlost", event => { event.preventDefault(); send("unavailable"); });
    if (pending) apply(pending);
    send("ready", { characters: results.loaded.length, sceneVersion: 27 });
  };
  function valid(state) {
    return state && typeof state === "object" && Object.hasOwn(roles, state.activeSpeaker) && typeof state.speaking === "boolean" && typeof state.objection === "boolean" && typeof state.reduced === "boolean" && ["auto", "low", "high"].includes(state.quality) && ["wide", "speaker"].includes(state.cameraMode) && typeof state.gesture === "string" && state.gesture.length < 80 && typeof state.emotion === "string" && state.emotion.length < 80;
  }
  function apply(state) {
    const id = roles[state.activeSpeaker], actor = actors[id];
    schedule = null;
    $("reduceMotion").checked = state.reduced;
    $("mouthDemo").checked = !state.reduced;
    const quality = state.quality === "high" ? "high" : "low";
    if (qualityMode !== quality) setQuality(quality);
    let mode = "idle";
    if (state.speaking) mode = state.objection ? "requesting_floor" : ["present", "presenting", "document"].includes(state.gesture) ? "presenting" : ["read", "reading"].includes(state.gesture) ? "reading" : "speaking";
    if (!actor.map.states[mode]?.length) mode = state.speaking ? "speaking" : "idle";
    const variant = ["firm", "severe"].includes(state.emotion) ? 1 : 0;
    if (!previous || previous.activeSpeaker !== state.activeSpeaker || previous.speaking !== state.speaking || previous.objection !== state.objection || previous.gesture !== state.gesture || previous.emotion !== state.emotion) {
      releaseFloor();
      for (const other of Object.values(actors)) if (other.id !== id && other.state !== "idle") quiet(other);
      if (state.speaking) { speakerId = id; takeFloor(id, mode, null, variant); }
      else { speakerId = id; quiet(actor); }
    }
    if (!previous || previous.cameraMode !== state.cameraMode || (state.cameraMode === "speaker" && previous.activeSpeaker !== state.activeSpeaker)) chooseView(state.cameraMode === "wide" ? "general" : id);
    previous = { ...state };
  }
  window.addEventListener("message", event => {
    if (event.source !== parent || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.channel !== "lexora-courtroom" || data.version !== 1 || data.type !== "state" || !valid(data.state)) return;
    pending = data.state;
    if (ready) apply(pending);
  });
  document.addEventListener("visibilitychange", () => { paused = document.hidden; });
  // Handle cached/failed asset loads that completed before this adapter arrived.
  if (window.lexoraBootFailed) window.lexoraSceneUnavailable();
  else if (window.lexoraBootReady) window.lexoraSceneReady();
})();
