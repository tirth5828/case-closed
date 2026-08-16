import { query } from "@/lib/socrata";

const SINCE = "2024-08-16T00:00:00"; // one recent year is enough to prove an address exists, and keeps the scan fast

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

interface Row {
  incident_address?: string;
  n: string;
}

/**
 * Address typeahead: token-match what the user typed against the addresses the
 * city actually writes, so "125 110 st" finds "125 WEST 110 STREET".
 */
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

  const tokens = clean.split(" ").filter(Boolean).slice(0, 6);
  const conds = tokens.map((t, i) =>
    // Anchor a leading house number to the start of the address; every other
    // token can appear anywhere ("110" may follow an unspelled "WEST").
    i === 0 && /^\d+[A-Z]?$/.test(t)
      ? `starts_with(incident_address, '${esc(t)} ')`
      : `contains(incident_address, '${esc(t)}')`,
  );

  try {
    const res = await query<Row>({
      $select: "incident_address, count(unique_key) as n",
      $where: `created_date > '${SINCE}' AND incident_address IS NOT NULL AND ${conds.join(" AND ")}`,
      $group: "incident_address",
      $order: "n DESC",
      $limit: "8",
    });
    return Response.json({
      suggestions: res.rows
        .filter((r) => r.incident_address)
        .map((r) => ({ address: r.incident_address!, n: Number(r.n) })),
    });
  } catch {
    // A typeahead must never surface an error; the plain lookup still works.
    return Response.json({ suggestions: [] });
  }
}
