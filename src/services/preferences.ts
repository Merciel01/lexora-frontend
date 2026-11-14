import { z } from "zod";
import { read, write } from "./storage";
import { preferencesSchema } from "./contracts";
export { preferencesSchema } from "./contracts";
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaults: Preferences = {
  reduced: false,
  sound: false,
  subtitles: true,
  quality: "auto",
  localVoice: false,
  voiceUri: "",
  captureMode: "toggle",
};
export function getPreferences(): Preferences {
  const value = preferencesSchema.safeParse(read("preferences", defaults));
  return value.success ? value.data : defaults;
}
export function savePreferences(p: Preferences) {
  write("preferences", preferencesSchema.parse(p));
  write("reduced", p.reduced);
  document.documentElement.dataset.reduced = String(p.reduced);
}
