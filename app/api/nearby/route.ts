import { query } from "@/lib/socrata";
import { loadLabels } from "@/lib/data";
import { breakdown, cosmeticShare, resolvedShare } from "@/lib/honesty";

const SINCE = "2025-08-15T00:00:00";

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

interface Row {
  resolution_description?: string;
  n: string;
}

/**
 * Act 2, step 2: what happened to identical complaints near you.
 * Zero-row fallback chain (descriptor+ZIP -> type+ZIP -> type citywide)
 * guarantees a blank screen is impossible.
 */
export async function POST(request: Request) {
  const { complaint_type, descriptor, zip } = (await request.json()) as {
    complaint_type?: string;
    descriptor?: string;
    zip?: string;
  };
  if (!complaint_type) {
    return Response.json({ error: "complaint_type required" }, { status: 400 });
  }

  const zipClean = zip?.trim().match(/^\d{5}$/) ? zip.trim() : undefined;
  const base = `created_date > '${SINCE}' AND complaint_type = '${esc(complaint_type)}'`;

  const attempts: { scope: string; where: string }[] = [];
  if (descriptor && zipClean)
    attempts.push({
      scope: "identical complaints in your ZIP",
      where: `${base} AND descriptor = '${esc(descriptor)}' AND incident_zip = '${zipClean}'`,
    });
  if (zipClean)
    attempts.push({ scope: "same complaint type in your ZIP", where: `${base} AND incident_zip = '${zipClean}'` });
  attempts.push({ scope: "same complaint type citywide", where: base });

  const { labels } = loadLabels();

  for (const attempt of attempts) {
    try {
      const res = await query<Row>({
        $select: "resolution_description, count(unique_key) as n",
        $where: attempt.where,
        $group: "resolution_description",
        $order: "n DESC",
        $limit: "500",
      });
      const templates = res.rows
        .filter((r) => r.resolution_description?.trim())
        .map((r) => ({ text: r.resolution_description!.trim(), n: Number(r.n) }));
      const total = res.rows.reduce((s, r) => s + Number(r.n), 0);
      if (total === 0) continue;

      const b = breakdown(templates, labels, total);
      return Response.json({
        scope: attempt.scope,
        total,
        breakdown: b,
        resolvedShare: resolvedShare(b),
        cosmeticShare: cosmeticShare(b),
        templates: templates.slice(0, 12).map((t) => ({
          n: t.n,
          text: t.text,
          outcome: labels[t.text]?.outcome ?? "unknown",
          gloss: labels[t.text]?.gloss ?? "unclassified closure text",
        })),
        receiptUrl: res.url,
        fromCache: res.fromCache,
      });
    } catch {
      continue; // network/query failure -> try the next, broader scope
    }
  }

  return Response.json(
    { error: "No data reachable for this complaint type, even citywide. Check the connection." },
    { status: 502 },
  );
}
