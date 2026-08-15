import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { loadBoroughs, loadHonesty, loadLabels, loadRawTemplates } from "@/lib/data";
import { breakdown, cosmeticShare, regroup } from "@/lib/honesty";
import HonestyIndex, { type IndexRow } from "@/components/HonestyIndex";
import { OutcomeLegend } from "@/components/OutcomeBar";

export const dynamic = "force-dynamic";

function pipelineReady(): boolean {
  return fs.existsSync(path.join(process.cwd(), "data", "honesty.json"));
}

export default function Home() {
  if (!pipelineReady()) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-24">
        <h1 className="font-display text-4xl font-black uppercase">Case Closed?</h1>
        <p className="mt-4 text-ink-2">
          The data pipeline hasn&apos;t run yet. Run <code className="font-mono">npm run pipeline</code>{" "}
          (needs <code className="font-mono">GEMINI_API_KEY</code> in <code className="font-mono">.env.local</code>),
          then reload.
        </p>
      </main>
    );
  }

  const honesty = loadHonesty();
  const { labels } = loadLabels();
  const raw = loadRawTemplates();
  const boroughsRaw = loadBoroughs();

  const boroughsFor = (complaintType: string) => {
    const entry = boroughsRaw?.types.find((b) => b.complaint_type === complaintType);
    if (!entry) return undefined;
    const byBorough = new Map<string, { text: string; n: number }[]>();
    for (const r of entry.rows) {
      if (!byBorough.has(r.borough)) byBorough.set(r.borough, []);
      byBorough.get(r.borough)!.push({ text: r.text, n: r.n });
    }
    return [...byBorough.entries()]
      .map(([name, templates]) => {
        const b = breakdown(templates, labels);
        return { name, grouped: regroup(b), cosmeticShare: cosmeticShare(b) };
      })
      .sort((a, b) => b.cosmeticShare - a.cosmeticShare);
  };

  const rows: IndexRow[] = honesty.types
    .map((t) => {
      const rawType = raw.types.find((r) => r.complaint_type === t.complaint_type);
      return {
        boroughs: boroughsFor(t.complaint_type),
        complaint_type: t.complaint_type,
        total: t.total,
        grouped: regroup(t.breakdown),
        cosmeticShare: t.cosmeticShare,
        receiptUrl: t.receiptUrl,
        templates: (rawType?.templates ?? []).slice(0, 8).map((x) => ({
          n: x.n,
          text: x.text,
          outcome: labels[x.text]?.outcome ?? "unknown",
          gloss: labels[x.text]?.gloss ?? "unclassified closure text",
        })),
      };
    })
    .sort((a, b) => b.cosmeticShare * b.total - a.cosmeticShare * a.total);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const grandCosmetic = rows.reduce((s, r) => s + r.grouped.cosmetic, 0);
  const heroRow = rows.find((r) => r.complaint_type === honesty.hero) ?? rows[0];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-24">
      {/* ACT 1 — the reveal */}
      <header className="border-b border-hairline pt-16 pb-10">
        <p className="font-mono text-[13px] uppercase tracking-widest text-ink-3">
          NYC 311 · the year since {new Date(honesty.since).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {grandTotal.toLocaleString()} complaints, top 15 types
        </p>
        <h1 className="mt-6 font-display text-5xl font-black uppercase leading-[1.05] sm:text-6xl">
          Almost every one:{" "}
          <span className="stamp stamp-hero text-stamp px-3 align-middle text-4xl sm:text-5xl">Closed</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
          But <em>closed</em> is a status code, not an outcome. We read the closure text the city
          attaches to every ticket — {grandTotal.toLocaleString()} complaints collapse into a few
          hundred templates — and asked an AI what each one actually means.
        </p>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed">
          <strong className="text-cosmetic">
            {((grandCosmetic / grandTotal) * 100).toFixed(0)}% —{" "}
            {grandCosmetic.toLocaleString()} complaints
          </strong>{" "}
          were closed without the problem being verified fixed: nobody got inside, the condition was
          gone on arrival, or it was somebody else&apos;s desk.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/ask"
            className="rounded bg-ink px-5 py-2.5 font-display font-bold uppercase tracking-wide text-paper hover:bg-ink-2"
          >
            Check your complaint →
          </Link>
          <span className="text-[13px] text-ink-2">
            What really happens to complaints like yours, on your block.
          </span>
        </div>
      </header>

      {/* The Honesty Index */}
      <section className="pt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-black uppercase">The Honesty Index</h2>
            <p className="mt-1 text-[14px] text-ink-2">
              What &ldquo;closed&rdquo; really meant, by complaint type. Click a row for the actual
              closure language{heroRow ? ` — start with ${heroRow.complaint_type}` : ""}.
            </p>
          </div>
          <OutcomeLegend />
        </div>
        <HonestyIndex rows={rows} />
        <p className="mt-4 text-[13px]">
          <Link href="/atlas" className="font-mono text-receipt hover:underline">
            Browse the full Template Atlas — every sentence the city closes with →
          </Link>
        </p>
      </section>

      <footer className="mt-16 border-t border-hairline pt-6 text-[13px] leading-relaxed text-ink-2">
        <p>
          Method: complaint outcomes are locked in free-text resolution descriptions no query can
          filter. Grouping by that text collapses {grandTotal.toLocaleString()} rows into a few
          hundred templates; Gemini classifies each template once; the labels join back to every
          row. Every number above expands to the exact NYC Open Data query that produced it.
        </p>
        <p className="mt-2">
          Data: NYC Open Data, 311 Service Requests (erm2-nwe9), refreshed daily. Built at the NYPL
          Built for NYC AI Hackathon, Aug 2026.
        </p>
      </footer>
    </main>
  );
}
