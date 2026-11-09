/** Untrusted API links are never passed directly to browser navigation. */
export function safeUrl(
  value: string | undefined,
  external = true,
): string | undefined {
  if (!value) return undefined;
  try {
    const base =
      typeof location === "undefined" ? "http://localhost" : location.origin;
    const url = new URL(value, base);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return undefined;
    if (!external && url.origin !== base) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
export function websocketUrl(value: string): string {
  const base =
    typeof location === "undefined" ? "http://localhost" : location.origin;
  const url = new URL(value, base.replace(/^http/, "ws"));
  const allowed = new URL(
    import.meta.env.VITE_WS_BASE_URL || base.replace(/^http/, "ws"),
  );
  if (
    !["ws:", "wss:"].includes(url.protocol) ||
    url.origin !== allowed.origin ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Adresse WebSocket non autorisée.");
  if (base.startsWith("https:") && url.protocol !== "wss:")
    throw new Error("Une connexion WSS est requise.");
  return url.href;
}
