/**
 * Gate 1, step 3: join template counts x outcome classes -> honesty stats
 * per complaint type, and pick the demo hero empirically.
 *
 * Usage: npm run aggregate
 */
import fs from "node:fs";
import path from "node:path";
import { buildUrl } from "../lib/socrata";
import { honestyForType, pickHero } from "../lib/honesty";
import type { HonestyFile, RawTemplatesFile, TemplatesFile } from "../lib/types";

const RAW = path.join(process.cwd(), "data", "raw-templates.json");
const LABELS = path.join(process.cwd(), "data", "templates.json");
const OUT = path.join(process.cwd(), "data", "honesty.json");

function receiptFor(complaintType: string, since: string): string {
  return buildUrl({
    $select: "resolution_description, count(unique_key) as n",
    $where: `created_date > '${since}' AND complaint_type = '${complaintType.replace(/'/g, "''")}'`,
    $group: "resolution_description",
    $order: "n DESC",
    $limit: "500",
  });
}

function main() {
  const raw = JSON.parse(fs.readFileSync(RAW, "utf8")) as RawTemplatesFile;
  const { labels } = JSON.parse(fs.readFileSync(LABELS, "utf8")) as TemplatesFile;

  const types = raw.types.map((t) =>
    honestyForType(t, labels, receiptFor(t.complaint_type, raw.since)),
  );
  const hero = pickHero(types);

  const out: HonestyFile = { builtAt: new Date().toISOString(), since: raw.since, types, hero };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

  console.log("Complaint type                    total   resolved  cosmetic  cosmetic#");
  for (const t of [...types].sort((a, b) => b.cosmeticShare * b.total - a.cosmeticShare * a.total)) {
    console.log(
      `${t.complaint_type.padEnd(32)} ${t.total.toLocaleString().padStart(8)}  ${(t.resolvedShare * 100).toFixed(1).padStart(6)}%  ${(t.cosmeticShare * 100).toFixed(1).padStart(6)}%  ${Math.round(t.cosmeticShare * t.total).toLocaleString().padStart(9)}`,
    );
  }
  console.log(`\nHERO: ${hero}`);
  console.log(`Wrote ${OUT}`);
}

main();
