import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
// Serverless filesystems are read-only outside /tmp; locally we keep the
// cache in the repo so it survives restarts and ships nothing.
const CACHE_DIR = process.env.VERCEL
  ? path.join("/tmp", "socrata-cache")
  : path.join(process.cwd(), ".cache", "socrata");

export interface SocrataResult<T> {
  rows: T[];
  /** The literal URL queried - shown to users as the receipt. */
  url: string;
  fromCache: boolean;
}

export function buildUrl(params: Record<string, string>): string {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${BASE}?${qs}`;
}

function cachePath(url: string): string {
  const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 24);
  return path.join(CACHE_DIR, `${hash}.json`);
}

function readCache<T>(url: string): T[] | null {
  try {
    return JSON.parse(fs.readFileSync(cachePath(url), "utf8")) as T[];
  } catch {
    return null;
  }
}

function writeCache(url: string, rows: unknown): void {
  // Cache writes are best-effort - never let a full disk or read-only fs
  // turn a successful query into a failure.
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath(url), JSON.stringify(rows));
  } catch {}
}

/** Trips after the first token-bearing failure so a broken token costs one
    slow request per process, not one per query. */
let tokenBroken = false;

async function fetchRows<T>(url: string, token: string | undefined, timeoutMs: number): Promise<T[]> {
  const headers: Record<string, string> = {};
  if (token) headers["X-App-Token"] = token;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`Socrata ${res.status}: ${await res.text()}`);
  return (await res.json()) as T[];
}

/**
 * Query Socrata. The app token is strictly additive: if a token-bearing
 * request fails or times out, we retry anonymously before falling back to
 * the disk cache - so a bad/unpropagated token can never take the app down.
 */
export async function query<T = Record<string, string>>(
  params: Record<string, string>,
): Promise<SocrataResult<T>> {
  const url = buildUrl(params);
  const token = tokenBroken ? undefined : process.env.SOCRATA_APP_TOKEN?.trim() || undefined;

  try {
    const rows = await fetchRows<T>(url, token, token ? 12_000 : 25_000);
    writeCache(url, rows);
    return { rows, url, fromCache: false };
  } catch {
    // Token-bearing request failed - the token may be stale or unpropagated.
    if (token) {
      tokenBroken = true;
      try {
        const rows = await fetchRows<T>(url, undefined, 25_000);
        writeCache(url, rows);
        return { rows, url, fromCache: false };
      } catch (err2) {
        const cached = readCache<T>(url);
        if (cached) return { rows: cached, url, fromCache: true };
        throw err2;
      }
    }
    const cached = readCache<T>(url);
    if (cached) return { rows: cached, url, fromCache: true };
    throw new Error(`Socrata unreachable for ${url}`);
  }
}
