/**
 * Agency league table: the same honesty math, grouped by responding agency.
 * Different agencies write very different endings.
 *
 * Usage: npm run agencies   (needs the portal up; one query)
 */
import fs from "node:fs";
import path from "node:path";
import { query } from "../lib/socrata";
import { loadRawTemplates } from "../lib/data";

const OUT = path.join(process.cwd(), "data", "agencies-raw.json");

async function main() {
  const raw = loadRawTemplates();
  const res = await query<{ agency?: string; resolution_description?: string; n: string }>({
    $select: "agency, resolution_description, count(unique_key) as n",
    $where: `created_date > '${raw.since}'`,
    $group: "agency, resolution_description",
    $order: "n DESC",
    $limit: "5000",
  });

  const rows = res.rows
    .filter((r) => r.agency?.trim() && r.resolution_description?.trim())
    .map((r) => ({ agency: r.agency!.trim(), text: r.resolution_description!.trim(), n: Number(r.n) }));

  fs.writeFileSync(
    OUT,
    JSON.stringify({ pulledAt: new Date().toISOString(), since: raw.since, receiptUrl: res.url, rows }, null, 2),
  );
  const agencies = new Set(rows.map((r) => r.agency));
  console.log(`Wrote ${OUT}: ${rows.length} agency x template rows across ${agencies.size} agencies.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
