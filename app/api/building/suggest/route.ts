import { query } from "@/lib/socrata";

const SOCRATA_SINCE = "2024-08-16T00:00:00";
const GEOSEARCH = "https://geosearch.planninglabs.nyc/v2/autocomplete";

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

interface Row {
  incident_address?: string;
  n: string;
}

interface Suggestion {
  address: string;
  borough?: string;
  n?: number;
}

/**
 * Primary: NYC Planning's GeoSearch autocomplete - an indexed service built for
 * exactly this, returning addresses in the same canonical form 311 writes
 * ("125 WEST 110 STREET"), in a few hundred ms.
 */
async function fromGeoSearch(q: string): Promise<Suggestion[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3000);
  try {
    const url = `${GEOSEARCH}?text=${encodeURIComponent(q)}&size=8`;
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: { properties?: { name?: string; borough?: string } }[];
    };
    const seen = new Set<string>();
    const out: Suggestion[] = [];
    for (const f of data.features ?? []) {
      const name = f.properties?.name?.toUpperCase().trim();
      if (!name || !/\d/.test(name)) continue; // building lookups need a house number
      const key = `${name}|${f.properties?.borough ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ address: name, borough: f.properties?.borough });
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fallback: token-match against the addresses in the 311 data itself. Slower
 * (a Socrata scan) but works even if GeoSearch is down, and its responses are
 * disk-cached by lib/socrata for repeated (rehearsed) queries.
 */
async function fromSocrata(clean: string): Promise<Suggestion[]> {
  const tokens = clean.split(" ").filter(Boolean).slice(0, 6);
  const conds = tokens.map((t, i) =>
    i === 0 && /^\d+[A-Z]?$/.test(t)
      ? `starts_with(incident_address, '${esc(t)} ')`
      : `contains(incident_address, '${esc(t)}')`,
  );
  const res = await query<Row>({
    $select: "incident_address, count(unique_key) as n",
    $where: `created_date > '${SOCRATA_SINCE}' AND incident_address IS NOT NULL AND ${conds.join(" AND ")}`,
    $group: "incident_address",
    $order: "n DESC",
    $limit: "8",
  });
  return res.rows
    .filter((r) => r.incident_address)
    .map((r) => ({ address: r.incident_address!, n: Number(r.n) }));
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const clean = q
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\bST\.?$/g, "STREET")
    .replace(/\bAVE\.?(\s|$)/g, "AVENUE$1")
    .replace(/\bBLVD\.?(\s|$)/g, "BOULEVARD$1")
    .replace(/\bRD\.?(\s|$)/g, "ROAD$1");
  if (clean.length < 3) return Response.json({ suggestions: [] });

  try {
    const geo = await fromGeoSearch(clean);
    if (geo.length) return Response.json({ suggestions: geo });
  } catch {
    /* fall through to Socrata */
  }
  try {
    return Response.json({ suggestions: await fromSocrata(clean) });
  } catch {
    // A typeahead must never surface an error; the plain lookup still works.
    return Response.json({ suggestions: [] });
  }
}
