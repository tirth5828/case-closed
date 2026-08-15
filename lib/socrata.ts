import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";
const CACHE_DIR = path.join(process.cwd(), ".cache", "socrata");

export interface SocrataResult<T> {
  rows: T[];
  /** The literal URL queried — shown to users as the receipt. */
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
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath(url), JSON.stringify(rows));
}

/**
 * Query Socrata. Every successful response is cached to disk; on network
 * failure the cache serves as fallback so the demo survives dead wifi.
 */
export async function query<T = Record<string, string>>(
  params: Record<string, string>,
): Promise<SocrataResult<T>> {
  const url = buildUrl(params);
  const headers: Record<string, string> = {};
  const token = process.env.SOCRATA_APP_TOKEN;
  if (token) headers["X-App-Token"] = token;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Socrata ${res.status}: ${await res.text()}`);
    const rows = (await res.json()) as T[];
    writeCache(url, rows);
    return { rows, url, fromCache: false };
  } catch (err) {
    const cached = readCache<T>(url);
    if (cached) return { rows: cached, url, fromCache: true };
    throw err;
  }
}
