/** Languages WinClipz can dub clips into (ElevenLabs), with display labels. */
export const DUB_LANGUAGES: Record<string, string> = {
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  hi: "Hindi",
  ja: "Japanese",
  ko: "Korean",
  it: "Italian",
  pl: "Polish",
  ar: "Arabic",
};

export function languageLabel(code?: string | null): string | null {
  if (!code) return null;
  return DUB_LANGUAGES[code.toLowerCase()] ?? code.toUpperCase();
}
