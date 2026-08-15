/**
 * The Boomerang Rate: when a complaint is closed cosmetically, how often does
 * the same address re-file the same complaint within 30 days? Compared against
 * the re-file rate after VERIFIED fixes, this is the proof that cosmetic
 * closures hide unfixed problems.
 *
 * Cohort: HEAT/HOT WATER complaints created Nov 2025 - Jan 2026 (peak season),
 * with refile lookups through Feb. Also computes median days-to-closure per
 * outcome class from the same rows (fast != fixed).
 *
 * Usage: npm run boomerang   (needs the portal up; row-level pull, ~4-6 calls)
 */
import fs from "node:fs";
import path from "node:path";
import { query } from "../lib/socrata";
import { loadLabels } from "../lib/data";
import { COSMETIC_CLASSES } from "../lib/types";
import type { OutcomeClass } from "../lib/types";

const TYPE = "HEAT/HOT WATER";
const COHORT_START = "2025-11-01T00:00:00";
const COHORT_END = "2026-02-01T00:00:00";
const LOOKAHEAD_END = "2026-03-05T00:00:00"; // cohort end + 30d + slack
const WINDOW_DAYS = 30;
const PAGE = 50000;
const OUT = path.join(process.cwd(), "data", "boomerang.json");

interface Row {
  unique_key: string;
  incident_address?: string;
  created_date?: string;
  closed_date?: string;
  resolution_description?: string;
}

async function pullAll(): Promise<{ rows: Row[]; receiptUrl: string }> {
  const rows: Row[] = [];
  let receiptUrl = "";
  for (let offset = 0; ; offset += PAGE) {
    const res = await query<Row>({
      $select: "unique_key, incident_address, created_date, closed_date, resolution_description",
      $where: `complaint_type = '${TYPE}' AND created_date >= '${COHORT_START}' AND created_date < '${LOOKAHEAD_END}'`,
      $order: "unique_key",
      $limit: String(PAGE),
      $offset: String(offset),
    });
    rows.push(...res.rows);
    if (!receiptUrl) receiptUrl = res.url;
    console.log(`  pulled ${rows.length} rows${res.fromCache ? " (cache)" : ""}`);
    if (res.rows.length < PAGE) break;
  }
  return { rows, receiptUrl };
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

async function main() {
  const { labels } = loadLabels();
  console.log(`Pulling ${TYPE} rows ${COHORT_START} -> ${LOOKAHEAD_END}...`);
  const { rows, receiptUrl } = await pullAll();

  const outcomeOf = (r: Row): OutcomeClass | "unknown" =>
    labels[r.resolution_description?.trim() ?? ""]?.outcome ?? "unknown";

  // All filings per address, sorted by time — the refile lookup table.
  const filingsByAddress = new Map<string, number[]>();
  for (const r of rows) {
    const addr = r.incident_address?.trim();
    if (!addr || !r.created_date) continue;
    if (!filingsByAddress.has(addr)) filingsByAddress.set(addr, []);
    filingsByAddress.get(addr)!.push(new Date(r.created_date).getTime());
  }
  for (const list of filingsByAddress.values()) list.sort((a, b) => a - b);

  // Cohort = complaints CREATED in the cohort window that are closed with a known outcome.
  // Stratified by address filing volume: at a big chronic building the refile
  // probability is ~1 regardless of any single closure's quality, so the honest
  // comparison lives at low-volume addresses.
  const cohortEnd = new Date(COHORT_END).getTime();
  const windowMs = WINDOW_DAYS * 24 * 3600 * 1000;
  const stats: Record<string, { n: number; refiled: number; daysToClose: number[] }> = {};
  const strata: Record<string, Record<string, { n: number; refiled: number }>> = {};

  const sizeOf = (addr: string): string => {
    const c = filingsByAddress.get(addr)!.length;
    return c <= 2 ? "small(1-2)" : c <= 9 ? "medium(3-9)" : "large(10+)";
  };

  for (const r of rows) {
    const addr = r.incident_address?.trim();
    if (!addr || !r.created_date || !r.closed_date) continue;
    const created = new Date(r.created_date).getTime();
    if (created >= cohortEnd) continue; // lookahead rows are refile targets only
    const closed = new Date(r.closed_date).getTime();
    if (Number.isNaN(closed) || closed < created) continue;

    const outcome = outcomeOf(r);
    const bucket = outcome === "resolved" ? "resolved" : COSMETIC_CLASSES.includes(outcome as OutcomeClass) ? "cosmetic" : "neutral";
    stats[bucket] ??= { n: 0, refiled: 0, daysToClose: [] };
    stats[bucket].n++;
    stats[bucket].daysToClose.push((closed - created) / (24 * 3600 * 1000));

    const later = filingsByAddress.get(addr)!;
    const refiled = later.some((t) => t > closed && t <= closed + windowMs);
    if (refiled) stats[bucket].refiled++;

    const size = sizeOf(addr);
    strata[size] ??= {};
    strata[size][bucket] ??= { n: 0, refiled: 0 };
    strata[size][bucket].n++;
    if (refiled) strata[size][bucket].refiled++;
  }

  const out = {
    builtAt: new Date().toISOString(),
    complaint_type: TYPE,
    cohort: { start: COHORT_START, end: COHORT_END, windowDays: WINDOW_DAYS },
    receiptUrl,
    // Refile rates stratified by how often the address filed overall. Finding:
    // closure outcome does NOT predict refiling (hypothesis tested and
    // rejected); address volume does. At large chronic buildings, ~94% of ALL
    // closures — including verified fixes — are followed by another complaint.
    strata: Object.fromEntries(
      Object.entries(strata).map(([size, buckets]) => [
        size,
        Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [k, { n: v.n, refiled: v.refiled, rate: v.refiled / v.n }]),
        ),
      ]),
    ),
    buckets: Object.fromEntries(
      Object.entries(stats).map(([k, v]) => [
        k,
        {
          n: v.n,
          refiled: v.refiled,
          rate: v.refiled / v.n,
          medianDaysToClose: median(v.daysToClose),
        },
      ]),
    ),
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

  console.log("\nBoomerang (same address, same type, refiled within 30 days of closure):");
  for (const [k, v] of Object.entries(out.buckets)) {
    console.log(
      `  ${k.padEnd(9)} n=${v.n.toLocaleString().padStart(8)}  refiled=${(v.rate * 100).toFixed(1)}%  median days to close=${v.medianDaysToClose?.toFixed(1)}`,
    );
  }
  console.log("\nStratified by address filing volume:");
  for (const [size, buckets] of Object.entries(strata)) {
    for (const [k, v] of Object.entries(buckets)) {
      console.log(
        `  ${size.padEnd(12)} ${k.padEnd(9)} n=${v.n.toLocaleString().padStart(8)}  refiled=${((v.refiled / v.n) * 100).toFixed(1)}%`,
      );
    }
  }
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
