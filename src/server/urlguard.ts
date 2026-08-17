/**
 * Lightweight, synchronous SSRF pre-check for the web ingestion routes. Rejects
 * obviously-internal targets before a Stream is created. The worker does the
 * authoritative DNS-resolution check (worker/src/ssrf.ts) before actually
 * fetching — this is defense in depth + a nicer immediate error.
 */
import net from "node:net";

function isPrivateLiteral(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, "");
  if (!net.isIP(bare)) return false;
  if (net.isIPv4(bare)) {
    const [a, b] = bare.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v = bare.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd");
}

/** Returns an error message if the URL is unsafe to ingest, else null. */
export function checkIngestUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return "not a valid URL";
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return "url must be http(s)";
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    return "that host isn't allowed";
  }
  if (isPrivateLiteral(host)) return "that host isn't allowed";
  return null;
}
