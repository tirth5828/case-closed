/**
 * Borough drill-down data: per complaint type, group closures by
 * borough x resolution template. One query per type. Requires the portal
 * to be up; run alongside `npm run warm` after the pipeline.
 *
 * Usage: npm run boroughs
 */
import fs from "node:fs";
import path from "node:path";
import { query } from "../lib/socrata";
import { loadRawTemplates } from "../lib/data";

const OUT = path.join(process.cwd(), "data", "boroughs-raw.json");
const BOROUGHS = ["MANHATTAN", "BRONX", "BROOKLYN", "QUEENS", "STATEN ISLAND"];

export interface BoroughRow {
  borough: string;
  text: string;
  n: number;
}

export interface BoroughsRawFile {
  pulledAt: string;
  since: string;
  types: { complaint_type: string; rows: BoroughRow[]; receiptUrl: string }[];
}

async function main() {
  const raw = loadRawTemplates();
  const types: BoroughsRawFile["types"] = [];

  for (const t of raw.types) {
    const res = await query<{ borough?: string; resolution_description?: string; n: string }>({
      $select: "borough, resolution_description, count(unique_key) as n",
      $where: `created_date > '${raw.since}' AND complaint_type = '${t.complaint_type.replace(/'/g, "''")}'`,
      $group: "borough, resolution_description",
      $order: "n DESC",
      $limit: "5000",
    });
    const rows = res.rows
      .filter((r) => r.borough && BOROUGHS.includes(r.borough.trim()) && r.resolution_description?.trim())
      .map((r) => ({ borough: r.borough!.trim(), text: r.resolution_description!.trim(), n: Number(r.n) }));
    types.push({ complaint_type: t.complaint_type, rows, receiptUrl: res.url });
    console.log(`  ${t.complaint_type}: ${rows.length} borough x template rows${res.fromCache ? " (cache)" : ""}`);
  }

  const out: BoroughsRawFile = { pulledAt: new Date().toISOString(), since: raw.since, types };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
