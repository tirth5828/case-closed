import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import {
  loadAgencies,
  loadBoomerang,
  loadBoroughs,
  loadHonesty,
  loadLabels,
  loadRawTemplates,
  loadWorstBuildings,
  loadYears,
} from "@/lib/data";
import { breakdown, cosmeticShare, regroup, resolvedShare } from "@/lib/honesty";
import HonestyIndex, { type IndexRow } from "@/components/HonestyIndex";
import OutcomeBar, { OutcomeLegend } from "@/components/OutcomeBar";
import AgencyLeague from "@/components/AgencyLeague";
import ReceiptLink from "@/components/ReceiptLink";

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

  const boomerang = loadBoomerang();
  const worst = loadWorstBuildings();
  const yearsRaw = loadYears();
  const years = yearsRaw
    ? yearsRaw.years
        .filter((y) => y.templates.length > 0)
        .map((y) => {
          const b = breakdown(y.templates, labels);
          return {
            year: y.year,
            total: b.total,
            grouped: regroup(b),
            cosmeticShare: cosmeticShare(b),
            resolvedShare: resolvedShare(b),
            receiptUrl: y.receiptUrl,
          };
        })
    : null;
  const agenciesRaw = loadAgencies();
  const agencies = agenciesRaw
    ? (() => {
        const byAgency = new Map<string, { text: string; n: number }[]>();
        for (const r of agenciesRaw.rows) {
          if (!byAgency.has(r.agency)) byAgency.set(r.agency, []);
          byAgency.get(r.agency)!.push({ text: r.text, n: r.n });
        }
        return [...byAgency.entries()]
          .map(([agency, templates]) => {
            const b = breakdown(templates, labels);
            return {
              agency,
              total: b.total,
              grouped: regroup(b),
              cosmeticShare: cosmeticShare(b),
              resolvedShare: resolvedShare(b),
              templates: templates
                .sort((x, y) => y.n - x.n)
                .slice(0, 6)
                .map((t) => ({
                  n: t.n,
                  gloss: labels[t.text]?.gloss ?? "unclassified closure text",
                  outcome: labels[t.text]?.outcome ?? ("unknown" as const),
                })),
            };
          })
          .filter((a) => a.total >= 10000)
          .sort((a, b) => b.cosmeticShare - a.cosmeticShare);
      })()
    : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-24">
      {/* ACT 1 — the reveal */}
      <header className="relative border-b border-hairline pt-12 pb-10">
        <span className="watermark print:hidden" aria-hidden="true">
          Public record
        </span>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="pt-2 font-mono text-[13px] uppercase tracking-widest text-ink-3">
            NYC 311 · the year since {new Date(honesty.since).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {grandTotal.toLocaleString()} complaints, top 15 types
          </p>
          <span className="datestamp text-[11px] text-ink-2">
            received
            <br />
            {new Date(honesty.builtAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
            <br />
            nyc open data
          </span>
        </div>
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
        {boomerang?.strata?.["large(10+)"] &&
          (() => {
            const large = boomerang.strata["large(10+)"];
            const totalN = Object.values(large).reduce((s, v) => s + v.n, 0);
            const totalRefiled = Object.values(large).reduce((s, v) => s + v.refiled, 0);
            const resolvedRate = large["resolved"]?.rate;
            if (!totalN || resolvedRate === undefined) return null;
            return (
              <div className="mt-6 max-w-2xl rounded border-l-4 bg-card p-4" style={{ borderColor: "var(--cosmetic)" }}>
                <p className="text-[15px] leading-relaxed">
                  The ticket closes. The building doesn&apos;t. At addresses with ten or more heat
                  complaints last winter,{" "}
                  <strong className="text-cosmetic">
                    {((totalRefiled / totalN) * 100).toFixed(0)}% of closures were followed by
                    another complaint within {boomerang.cohort.windowDays} days
                  </strong>{" "}
                  — even closures marked fixed ({(resolvedRate * 100).toFixed(0)}%). The unit of
                  failure isn&apos;t the ticket; it&apos;s the building.
                </p>
                <p className="mt-1.5 font-mono text-[11px] text-ink-3">
                  {totalN.toLocaleString()} closures at chronic-complaint buildings,{" "}
                  {new Date(boomerang.cohort.start).toLocaleDateString("en-US", { month: "short", year: "numeric" })}–
                  {new Date(boomerang.cohort.end).toLocaleDateString("en-US", { month: "short", year: "numeric" })}. We
                  also tested whether cosmetic closures get re-filed more than verified fixes —
                  they don&apos;t (12% vs 12% at small buildings) — so we don&apos;t claim it.
                </p>
                <div className="mt-2">
                  <ReceiptLink url={boomerang.receiptUrl} />
                </div>
              </div>
            );
          })()}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/ask"
            className="rounded bg-ink px-5 py-2.5 font-display font-bold uppercase tracking-wide text-paper hover:bg-ink-2"
          >
            Check your complaint →
          </Link>
          <Link
            href="/building"
            className="rounded border border-ink px-5 py-2.5 font-display font-bold uppercase tracking-wide hover:bg-card"
          >
            Open your building&apos;s file
          </Link>
          <Link
            href="/board"
            className="rounded border border-ink px-5 py-2.5 font-display font-bold uppercase tracking-wide hover:bg-card"
          >
            Take it to your board
          </Link>
        </div>
      </header>

      {/* The Honesty Index */}
      <section className="pt-12">
        <div className="form-sec mb-4">sec. 01 · disposition of complaints</div>
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

      {agencies && agencies.length > 0 && (
        <section className="pt-14">
          <div className="form-sec mb-4">sec. 02 · responding agencies</div>
          <h2 className="font-display text-2xl font-black uppercase">Who actually writes &ldquo;fixed&rdquo;?</h2>
          <p className="mt-1 max-w-2xl text-[14px] text-ink-2">
            The same honesty math, by responding agency. Different agencies end complaints in very
            different ways — a structural fact about how each one works, not a report card on the
            people in the field.
          </p>
          <AgencyLeague rows={agencies} />
          {agenciesRaw && (
            <div className="mt-3">
              <ReceiptLink url={agenciesRaw.receiptUrl} />
            </div>
          )}
        </section>
      )}

      {worst && worst.buildings.length > 0 && (
        <section className="pt-14">
          <div className="form-sec mb-4">sec. 03 · premises of record</div>
          <h2 className="font-display text-2xl font-black uppercase">Where complaints go to die</h2>
          <p className="mt-1 max-w-2xl text-[14px] text-ink-2">
            The buildings with the most housing complaints closed for <em>no access</em> in the
            last year — addresses where inspections keep not happening, complaint after complaint.
          </p>
          <ol className="mt-5 space-y-1.5">
            {worst.buildings.slice(0, 5).map((b, i) => (
              <li key={b.address} className="flex items-baseline gap-3">
                <span className="font-mono text-[13px] text-ink-3">{i + 1}.</span>
                <Link
                  href={`/building?address=${encodeURIComponent(b.address)}`}
                  className="font-mono text-[14px] font-semibold underline decoration-dotted underline-offset-2 hover:text-receipt hover:decoration-solid"
                >
                  {b.address}
                </Link>
                <span className="text-[12px] text-ink-3">{b.borough}</span>
                <span className="ml-auto font-mono text-[13px] font-semibold text-cosmetic">
                  ×{b.noAccess.toLocaleString()} no-access closures
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[13px]">
            <Link href="/building" className="font-mono text-receipt hover:underline">
              Open any building&apos;s file — including the one you&apos;re about to sign a lease in →
            </Link>
          </p>
          <div className="mt-3">
            <ReceiptLink url={worst.receiptUrl} />
          </div>
        </section>
      )}

      {years && years.length >= 2 && (
        <section className="pt-14">
          <div className="form-sec mb-4">sec. 04 · the record over time</div>
          <h2 className="font-display text-2xl font-black uppercase">The Time Machine</h2>
          <p className="mt-1 max-w-2xl text-[14px] text-ink-2">
            Every 311 closure since {years[0].year} — {years.reduce((s, y) => s + y.total, 0).toLocaleString()} of
            them — run through the same honesty math.{" "}
            {(() => {
              const first = years[0];
              const last = years[years.length - 1];
              const d = (last.cosmeticShare - first.cosmeticShare) * 100;
              return (
                <>
                  Cosmetic closure went from{" "}
                  <strong>{(first.cosmeticShare * 100).toFixed(0)}% in {first.year}</strong> to{" "}
                  <strong className="text-cosmetic">{(last.cosmeticShare * 100).toFixed(0)}% in {last.year}</strong>
                  {Math.abs(d) >= 1 ? ` — ${d > 0 ? "up" : "down"} ${Math.abs(d).toFixed(0)} points.` : " — essentially unchanged."}
                </>
              );
            })()}
          </p>
          <ul className="mt-5 space-y-2.5">
            {years.map((y) => (
              <li key={y.year} className="grid grid-cols-[3.5rem_1fr_4rem] items-center gap-4">
                <div>
                  <p className="font-mono text-[13px] font-semibold">{y.year}</p>
                  <p className="font-mono text-[10px] text-ink-3">{(y.total / 1e6).toFixed(1)}M</p>
                </div>
                <OutcomeBar grouped={y.grouped} height={16} showLabels={false} />
                <p className="text-right font-mono text-[13px] font-semibold text-cosmetic">
                  {(y.cosmeticShare * 100).toFixed(0)}%
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <ReceiptLink url={years[years.length - 1].receiptUrl} />
          </div>
        </section>
      )}

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
