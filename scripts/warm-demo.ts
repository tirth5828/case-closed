/**
 * Warm the disk cache for the planned demo path so the stage demo survives
 * dead wifi (or another portal outage). Run this the morning of the demo,
 * after the pipeline, while the network is good:
 *
 *   npm run warm
 *
 * Edit DEMO_QUERIES to match the exact demo script.
 */
import { query } from "../lib/socrata";
import { loadRawTemplates } from "../lib/data";

const SINCE = "2025-08-15T00:00:00";

/** The ZIPs likely to be typed on stage. 10016 = the venue (455 5th Ave). */
const DEMO_ZIPS = ["10016", "11375", "10458", "11221"];

/** The complaint types the demo is likely to route through. */
const DEMO_TYPES = ["Illegal Parking", "HEAT/HOT WATER", "Noise - Residential", "Blocked Driveway"];

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

async function warm(where: string, label: string) {
  try {
    const res = await query({
      $select: "resolution_description, count(unique_key) as n",
      $where: where,
      $group: "resolution_description",
      $order: "n DESC",
      $limit: "500",
    });
    const total = res.rows.reduce((s, r) => s + Number((r as { n: string }).n), 0);
    console.log(`  ok ${label}: ${total.toLocaleString()} complaints${res.fromCache ? " (was already cached)" : ""}`);
  } catch (e) {
    console.log(`  FAILED ${label}: ${e instanceof Error ? e.message.slice(0, 80) : e}`);
  }
}

async function main() {
  const raw = loadRawTemplates();
  for (const type of DEMO_TYPES) {
    const base = `created_date > '${SINCE}' AND complaint_type = '${esc(type)}'`;
    console.log(type);
    await warm(base, "citywide");
    const descriptors = (raw.types.find((t) => t.complaint_type === type)?.descriptors ?? []).slice(0, 3);
    for (const zip of DEMO_ZIPS) {
      await warm(`${base} AND incident_zip = '${zip}'`, `zip ${zip}`);
      for (const d of descriptors) {
        await warm(`${base} AND descriptor = '${esc(d.text)}' AND incident_zip = '${zip}'`, `zip ${zip} + "${d.text}"`);
      }
    }
  }
  console.log("\nDemo cache warmed. The stage demo now survives dead wifi for these paths.");
}

main();
