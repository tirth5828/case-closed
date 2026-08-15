/**
 * The Time Machine: closure templates per calendar year since 2019, so the
 * honesty math can run across time. Old years use old template wordings —
 * the classify sweep picks them up.
 *
 * Usage: npm run years
 */
import fs from "node:fs";
import path from "node:path";
import { query } from "../lib/socrata";

const OUT = path.join(process.cwd(), "data", "years-raw.json");
const FIRST_YEAR = 2019;
const LAST_YEAR = 2025;

async function main() {
  const years: { year: number; templates: { text: string; n: number }[]; receiptUrl: string }[] = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    const res = await query<{ resolution_description?: string; n: string }>({
      $select: "resolution_description, count(unique_key) as n",
      $where: `created_date >= '${year}-01-01T00:00:00' AND created_date < '${year + 1}-01-01T00:00:00'`,
      $group: "resolution_description",
      $order: "n DESC",
      $limit: "2000",
    });
    const templates = res.rows
      .filter((r) => r.resolution_description?.trim())
      .map((r) => ({ text: r.resolution_description!.trim(), n: Number(r.n) }));
    const total = templates.reduce((s, t) => s + t.n, 0);
    years.push({ year, templates, receiptUrl: res.url });
    console.log(`  ${year}: ${total.toLocaleString()} closures across ${templates.length} templates${res.fromCache ? " (cache)" : ""}`);
  }

  fs.writeFileSync(OUT, JSON.stringify({ pulledAt: new Date().toISOString(), years }, null, 2));
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
