import fs from "node:fs";
import path from "node:path";
import { generateJson } from "@/lib/gemini";
import { loadHonesty, loadLabels } from "@/lib/data";
import { breakdown, cosmeticShare, regroup, resolvedShare } from "@/lib/honesty";

interface BoardsRawFile {
  pulledAt: string;
  since: string;
  receiptUrl: string;
  rows: { board: string; text: string; n: number }[];
}

function loadBoardsRaw(): BoardsRawFile {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "boards-raw.json"), "utf8"),
  ) as BoardsRawFile;
}

/**
 * The community-board brief: this board's honesty stats vs citywide, plus an
 * AI-drafted one-pager with questions to raise at the next public meeting.
 */
export async function POST(request: Request) {
  const { board, brief } = (await request.json()) as { board?: string; brief?: boolean };
  const data = loadBoardsRaw();
  const { labels } = loadLabels();

  const rows = data.rows.filter((r) => r.board === board);
  if (!rows.length) {
    return Response.json({ error: "Unknown community board." }, { status: 404 });
  }

  const b = breakdown(rows.map((r) => ({ text: r.text, n: r.n })), labels);
  const boardStats = {
    board,
    total: b.total,
    grouped: regroup(b),
    resolvedShare: resolvedShare(b),
    cosmeticShare: cosmeticShare(b),
  };

  // Citywide baseline from the main pipeline output.
  const honesty = loadHonesty();
  const cityTotal = honesty.types.reduce((s, t) => s + t.total, 0);
  const cityCosmetic = honesty.types.reduce((s, t) => s + t.cosmeticShare * t.total, 0);
  const cityCosmeticShare = cityCosmetic / cityTotal;

  const failures = rows
    .filter((r) => {
      const o = labels[r.text]?.outcome;
      return o && o !== "resolved" && o !== "duplicate" && o !== "in_progress";
    })
    .slice(0, 8)
    .map((r) => ({
      n: r.n,
      outcome: labels[r.text]?.outcome ?? "unknown",
      gloss: labels[r.text]?.gloss ?? "unclassified closure text",
      text: r.text,
    }));

  const base = {
    ...boardStats,
    cityCosmeticShare,
    failures: failures.map((f) => ({ n: f.n, outcome: f.outcome, gloss: f.gloss })),
    receiptUrl: data.receiptUrl,
    since: data.since,
  };

  if (!brief) return Response.json(base);

  const schema = {
    type: "object",
    properties: {
      headline: { type: "string", description: "One factual sentence, <=25 words, the single most important thing this board should know" },
      summary: { type: "string", description: "One paragraph, 60-90 words, plain English, grounded ONLY in the numbers provided" },
      questions: {
        type: "array",
        items: { type: "string" },
        description: "Exactly 3 specific, respectful questions for agency representatives at the meeting, each tied to a failure mode in the data, each <=30 words",
      },
    },
    required: ["headline", "summary", "questions"],
  };

  const prompt = `Draft a one-page data brief for NYC Community Board ${board}'s next public meeting, based on 311 closure data.

This district, last 12 months: ${boardStats.total.toLocaleString()} complaints closed. ${(boardStats.resolvedShare * 100).toFixed(1)}% verifiably resolved; ${(boardStats.cosmeticShare * 100).toFixed(1)}% closed cosmetically (without the problem being verified fixed). Citywide cosmetic rate: ${(cityCosmeticShare * 100).toFixed(1)}%.

The district's largest non-resolved closure categories:
${failures.map((f) => `- ${f.n.toLocaleString()} closed as [${f.outcome}]: ${f.gloss}`).join("\n")}

Rules: ground every claim in these numbers only; never invent statistics. Tone: neutral, constructive, respectful of agency staff — the issue is closure codes that hide outcomes, not workers. Say "closed without site access", never "ignored". Questions should be answerable by an agency representative and aimed at improving outcomes, not assigning blame.`;

  try {
    const result = await generateJson<{ headline: string; summary: string; questions: string[] }>(prompt, schema);
    return Response.json({ ...base, brief: result });
  } catch (e) {
    return Response.json(
      { error: `Brief generation failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }
}

/** List available boards for the selector. */
export async function GET() {
  const data = loadBoardsRaw();
  const totals = new Map<string, number>();
  for (const r of data.rows) totals.set(r.board, (totals.get(r.board) ?? 0) + r.n);
  const boards = [...totals.entries()]
    .map(([board, total]) => ({ board, total }))
    .sort((a, b) => a.board.localeCompare(b.board));
  return Response.json({ boards });
}
