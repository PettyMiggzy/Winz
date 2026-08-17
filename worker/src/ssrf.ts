/**
 * SSRF guard. User-submitted source URLs are attacker-controlled, so before we
 * fetch one we resolve its hostname and reject anything pointing at private,
 * loopback, link-local, or cloud-metadata ranges. Applied to the direct-fetch
 * path; yt-dlp links go to real public platforms and are additionally gated by
 * the proxy, but we still block obvious internal hosts there.
 */
import { lookup } from "node:dns/promises";
import net from "node:net";

/** True if an IPv4/IPv6 literal is in a private / loopback / link-local / reserved range. */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true; // 10/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local + AWS/GCP metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fe80")) return true; // link-local
    if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique-local
    // IPv4-mapped (::ffff:a.b.c.d) — check the embedded v4
    const m = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return isPrivateIp(m[1]);
    return false;
  }
  return false;
}

/** Throw if the URL's host resolves to (or is) a non-public address. */
export async function assertPublicUrl(url: string): Promise<void> {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("invalid URL");
  }
  const bare = host.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (net.isIP(bare)) {
    if (isPrivateIp(bare)) throw new Error(`blocked non-public address: ${bare}`);
    return;
  }
  // Resolve the hostname and reject if ANY resolved address is private.
  const addrs = await lookup(bare, { all: true });
  for (const a of addrs) {
    if (isPrivateIp(a.address)) {
      throw new Error(`blocked host ${bare} → private address ${a.address}`);
    }
  }
}
