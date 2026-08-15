/**
 * Gate 1, step 1: pull the top complaint types and their resolution templates.
 * Anonymous Socrata queries; server-side GROUP BY collapses millions of rows
 * into a few hundred templates with counts attached. No LLM involved yet.
 *
 * Usage: npm run pull
 */
import fs from "node:fs";
import path from "node:path";
import { query } from "../lib/socrata";
import type { RawTemplatesFile, TypeTemplates } from "../lib/types";

const SINCE = "2025-08-15T00:00:00";
const TOP_N_TYPES = 15;
const OUT = path.join(process.cwd(), "data", "raw-templates.json");

async function main() {
  console.log(`Pulling top ${TOP_N_TYPES} complaint types since ${SINCE}...`);
  const top = await query<{ complaint_type: string; n: string }>({
    $select: "complaint_type, count(unique_key) as n",
    $where: `created_date > '${SINCE}'`,
    $group: "complaint_type",
    $order: "n DESC",
    $limit: String(TOP_N_TYPES),
  });

  const types: TypeTemplates[] = [];
  for (const t of top.rows) {
    const res = await query<{ resolution_description?: string; n: string }>({
      $select: "resolution_description, count(unique_key) as n",
      $where: `created_date > '${SINCE}' AND complaint_type = '${t.complaint_type.replace(/'/g, "''")}'`,
      $group: "resolution_description",
      $order: "n DESC",
      $limit: "500",
    });
    const templates = res.rows
      .filter((r) => r.resolution_description && r.resolution_description.trim().length > 0)
      .map((r) => ({ text: r.resolution_description!.trim(), n: Number(r.n) }));
    types.push({ complaint_type: t.complaint_type, total: Number(t.n), templates });
    console.log(
      `  ${t.complaint_type}: ${Number(t.n).toLocaleString()} complaints -> ${templates.length} templates${res.fromCache ? " (cache)" : ""}`,
    );
  }

  const out: RawTemplatesFile = { pulledAt: new Date().toISOString(), since: SINCE, types };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

  const unique = new Set(types.flatMap((t) => t.templates.map((x) => x.text)));
  console.log(`\nWrote ${OUT}`);
  console.log(
    `${types.reduce((s, t) => s + t.total, 0).toLocaleString()} complaints collapse to ${unique.size} unique templates across ${types.length} types.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
