/**
 * ElevenLabs dubbing adapter. Translates a clip into another language while
 * keeping the creator's own voice — a reach multiplier no competitor pairs
 * with auto-posting.
 *
 * Flow (docs: api.elevenlabs.io):
 *   POST /v1/dubbing                     source_url + target_lang → dubbing_id
 *   GET  /v1/dubbing/{id}                poll until status === "dubbed"
 *   GET  /v1/dubbing/{id}/audio/{lang}   → the dubbed mp4 bytes
 *
 * Cost is real (~$0.30–0.50 per source minute), so dubs are only ever created
 * for clips a human approved, and only for plans that allow it.
 */
const API = process.env.ELEVENLABS_BASE_URL ?? "https://api.elevenlabs.io";

export const dubbingConfigured = (): boolean => Boolean(process.env.ELEVENLABS_API_KEY);

function headers(): Record<string, string> {
  return { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" };
}

/** Kick off a dub. Returns the ElevenLabs dubbing_id. */
export async function startDub(input: {
  mediaUrl: string; // public R2 URL of the rendered clip
  targetLang: string; // ISO code, e.g. "es"
  sourceLang?: string;
  name?: string;
}): Promise<string> {
  if (!dubbingConfigured()) throw new Error("ELEVENLABS_API_KEY not set");
  const form = new FormData();
  form.append("source_url", input.mediaUrl);
  form.append("target_lang", input.targetLang);
  // "0" = auto-detect speaker count (streams often have guests/co-hosts).
  form.append("num_speakers", "0");
  form.append("watermark", "false");
  if (input.sourceLang) form.append("source_lang", input.sourceLang);
  if (input.name) form.append("name", input.name.slice(0, 100));

  const res = await fetch(`${API}/v1/dubbing`, { method: "POST", headers: headers(), body: form });
  if (!res.ok) {
    throw new Error(`elevenlabs /v1/dubbing ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { dubbing_id?: string };
  if (!json.dubbing_id) throw new Error("elevenlabs returned no dubbing_id");
  return json.dubbing_id;
}

/** Current state of a dub: "dubbing" | "dubbed" | "failed". */
export async function dubStatus(dubbingId: string): Promise<{ status: string; error?: string }> {
  const res = await fetch(`${API}/v1/dubbing/${dubbingId}`, { headers: headers() });
  if (!res.ok) throw new Error(`elevenlabs status ${res.status}`);
  const json = (await res.json()) as { status?: string; error?: string };
  return { status: json.status ?? "unknown", error: json.error };
}

/** Download the finished dub (mp4 bytes) for a language. */
export async function downloadDub(dubbingId: string, lang: string): Promise<Buffer> {
  const res = await fetch(`${API}/v1/dubbing/${dubbingId}/audio/${lang}`, { headers: headers() });
  if (!res.ok) throw new Error(`elevenlabs download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Languages we offer, with human labels. */
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
