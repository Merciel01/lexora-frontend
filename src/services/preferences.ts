import { z } from "zod";
import { read, write } from "./storage";
const schema = z.object({
  reduced: z.boolean(),
  sound: z.boolean(),
  subtitles: z.boolean(),
  quality: z.enum(["auto", "low", "high"]),
  localVoice: z.boolean(),
  voiceUri: z.string(),
  captureMode: z.enum(["hold", "toggle"]),
});
export type Preferences = z.infer<typeof schema>;
export const defaults: Preferences = {
  reduced: false,
  sound: false,
  subtitles: true,
  quality: "auto",
  localVoice: false,
  voiceUri: "",
  captureMode: "hold",
};
export function getPreferences(): Preferences {
  const value = schema.safeParse(read("preferences", defaults));
  return value.success ? value.data : defaults;
}
export function savePreferences(p: Preferences) {
  write("preferences", schema.parse(p));
  write("reduced", p.reduced);
  document.documentElement.dataset.reduced = String(p.reduced);
}
