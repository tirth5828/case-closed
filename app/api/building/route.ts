import { query } from "@/lib/socrata";
import { loadLabels } from "@/lib/data";
import { breakdown, cosmeticShare, regroup, resolvedShare } from "@/lib/honesty";

const SINCE = "2020-08-15T00:00:00"; // five years: buildings have longer memories than headlines

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

interface Row {
  complaint_type?: string;
  resolution_description?: string;
  n: string;
}

/**
 * The building dossier: everything the city has written about one address.
 * Tries an exact match on the normalized address, then a prefix match.
 */
export async function POST(request: Request) {
  const { address } = (await request.json()) as { address?: string };
  const clean = address
    ?.trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\bSTREET\b/g, "STREET")
    .replace(/\bST\.?$/g, "STREET")
    .replace(/\bAVE\.?(\s|$)/g, "AVENUE$1")
    .replace(/\bBLVD\.?(\s|$)/g, "BOULEVARD$1")
    .replace(/\bRD\.?(\s|$)/g, "ROAD$1");
  if (!clean || clean.length < 5) {
    return Response.json({ error: "Enter a street address, like '100 GOLD STREET'." }, { status: 400 });
  }

  const { labels } = loadLabels();
  const attempts = [
    `incident_address = '${esc(clean)}'`,
    `starts_with(incident_address, '${esc(clean)}')`,
  ];

  for (const where of attempts) {
    try {
      const res = await query<Row>({
        $select: "complaint_type, resolution_description, count(unique_key) as n",
        $where: `created_date > '${SINCE}' AND ${where}`,
        $group: "complaint_type, resolution_description",
        $order: "n DESC",
        $limit: "2000",
      });
      const total = res.rows.reduce((s, r) => s + Number(r.n), 0);
      if (total === 0) continue;

      // Overall breakdown across everything filed from this address.
      const allTemplates = new Map<string, number>();
      const byType = new Map<string, { text: string; n: number }[]>();
      for (const r of res.rows) {
        const text = r.resolution_description?.trim();
        if (!text || !r.complaint_type) continue;
        allTemplates.set(text, (allTemplates.get(text) ?? 0) + Number(r.n));
        if (!byType.has(r.complaint_type)) byType.set(r.complaint_type, []);
        byType.get(r.complaint_type)!.push({ text, n: Number(r.n) });
      }
      const overallTemplates = [...allTemplates.entries()].map(([text, n]) => ({ text, n }));
      const b = breakdown(overallTemplates, labels, total);

      const types = [...byType.entries()]
        .map(([complaint_type, templates]) => {
          const tb = breakdown(templates, labels);
          return {
            complaint_type,
            total: tb.total,
            grouped: regroup(tb),
            cosmeticShare: cosmeticShare(tb),
          };
        })
        .sort((x, y) => y.total - x.total);

      const topSentence = overallTemplates.sort((x, y) => y.n - x.n)[0];

      return Response.json({
        address: clean,
        total,
        since: SINCE,
        grouped: regroup(b),
        resolvedShare: resolvedShare(b),
        cosmeticShare: cosmeticShare(b),
        types: types.slice(0, 8),
        topSentence: topSentence
          ? {
              text: topSentence.text,
              n: topSentence.n,
              outcome: labels[topSentence.text]?.outcome ?? "unknown",
              gloss: labels[topSentence.text]?.gloss ?? "unclassified closure text",
            }
          : null,
        receiptUrl: res.url,
        fromCache: res.fromCache,
      });
    } catch {
      continue;
    }
  }

  return Response.json(
    { error: "No 311 complaints found for that address (or the data portal is unreachable). Try the street spelled out: '100 GOLD STREET'." },
    { status: 404 },
  );
}
