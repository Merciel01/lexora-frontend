export function read<T>(key: string, fallback: T): T {
  try {
    return (
      JSON.parse(localStorage.getItem("lexora:" + key) || "null") ?? fallback
    );
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown) {
  try {
    localStorage.setItem("lexora:" + key, JSON.stringify(value));
    window.dispatchEvent(new Event("lexora-storage"));
  } catch {
    /* Storage may be unavailable. */
  }
}
