/**
 * "Where complaints go to die": buildings ranked by housing complaints closed
 * for NO ACCESS — the buildings where inspections never happen. HPD types only
 * (these are building-bound complaints with reliable addresses).
 *
 * Usage: npm run worst   (needs the portal up)
 */
import fs from "node:fs";
import path from "node:path";
import { query } from "../lib/socrata";
import { loadLabels, loadRawTemplates } from "../lib/data";

const HPD_TYPES = ["HEAT/HOT WATER", "UNSANITARY CONDITION", "PLUMBING", "PAINT/PLASTER"];
const OUT = path.join(process.cwd(), "data", "worst-buildings.json");

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

async function main() {
  const raw = loadRawTemplates();
  const { labels } = loadLabels();

  // The exact closure texts that mean "nobody got inside", for these types.
  const noAccessTexts = [
    ...new Set(
      raw.types
        .filter((t) => HPD_TYPES.includes(t.complaint_type))
        .flatMap((t) => t.templates.map((x) => x.text))
        .filter((text) => labels[text]?.outcome === "no_access"),
    ),
  ];
  console.log(`${noAccessTexts.length} no-access templates across ${HPD_TYPES.length} HPD types.`);

  const typeList = HPD_TYPES.map((t) => `'${esc(t)}'`).join(",");
  const textList = noAccessTexts.map((t) => `'${esc(t)}'`).join(",");

  const res = await query<{ incident_address?: string; borough?: string; n: string }>({
    $select: "incident_address, borough, count(unique_key) as n",
    $where: `created_date > '${raw.since}' AND complaint_type IN (${typeList}) AND resolution_description IN (${textList})`,
    $group: "incident_address, borough",
    $order: "n DESC",
    $limit: "100",
  });

  const buildings = res.rows
    .filter((r) => r.incident_address?.trim())
    .map((r) => ({ address: r.incident_address!.trim(), borough: r.borough ?? "", noAccess: Number(r.n) }));

  const out = {
    builtAt: new Date().toISOString(),
    since: raw.since,
    types: HPD_TYPES,
    receiptUrl: res.url,
    buildings,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`Top of the list:`);
  for (const b of buildings.slice(0, 10)) {
    console.log(`  ${String(b.noAccess).padStart(4)}x  ${b.address} (${b.borough})`);
  }
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
