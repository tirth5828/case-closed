/**
 * Community board honesty data: closures grouped by community_board x
 * resolution template. Community board meetings are where 311 patterns
 * actually get discussed with city officials in the room — this data feeds
 * the printable one-page brief on /board.
 *
 * Usage: npm run boards
 */
import fs from "node:fs";
import path from "node:path";
import { query } from "../lib/socrata";
import { loadRawTemplates } from "../lib/data";

const OUT = path.join(process.cwd(), "data", "boards-raw.json");

async function main() {
  const raw = loadRawTemplates();
  const res = await query<{ community_board?: string; resolution_description?: string; n: string }>({
    $select: "community_board, resolution_description, count(unique_key) as n",
    $where: `created_date > '${raw.since}'`,
    $group: "community_board, resolution_description",
    $order: "n DESC",
    $limit: "50000",
  });

  // Keep real boards only: "NN BOROUGH" (drops "0 Unspecified", "Unspecified BRONX" etc.)
  const rows = res.rows
    .filter(
      (r) =>
        r.community_board?.trim().match(/^\d{2} (MANHATTAN|BRONX|BROOKLYN|QUEENS|STATEN ISLAND)$/) &&
        r.resolution_description?.trim(),
    )
    .map((r) => ({ board: r.community_board!.trim(), text: r.resolution_description!.trim(), n: Number(r.n) }));

  fs.writeFileSync(
    OUT,
    JSON.stringify({ pulledAt: new Date().toISOString(), since: raw.since, receiptUrl: res.url, rows }, null, 2),
  );
  const boards = new Set(rows.map((r) => r.board));
  console.log(`Wrote ${OUT}: ${rows.length} board x template rows across ${boards.size} community boards.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
