"use client";

import { useMemo, useState } from "react";
import Stamp from "./Stamp";
import { MoreButton } from "./HonestyIndex";
import type { OutcomeClass, TemplateAudit } from "@/lib/types";

export interface AtlasEntry {
  text: string;
  gloss: string;
  outcome: OutcomeClass;
  n: number;
  types: string[];
  audit?: TemplateAudit;
}

function AuditMark({ audit }: { audit?: TemplateAudit }) {
  if (!audit) return null;
  if (audit.verdict === "upheld") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--fixed)" }}>
        ✓ notarized
      </span>
    );
  }
  if (audit.verdict === "corrected") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
        corrected on review{audit.original ? ` — was ${audit.original}` : ""}
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-cosmetic" title={audit.note}>
      contested — auditor read: {audit.dissent}
    </span>
  );
}

export interface AtlasSection {
  outcome: OutcomeClass;
  intro: string;
  items: AtlasEntry[];
}

const INITIAL_ITEMS = 5;

export default function AtlasSections({ sections, grand }: { sections: AtlasSection[]; grand: number }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (e) =>
            e.text.toLowerCase().includes(q) ||
            e.gloss.toLowerCase().includes(q) ||
            e.types.some((t) => t.toLowerCase().includes(q)),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [sections, q]);

  const matchCount = q ? filtered.reduce((s, x) => s + x.items.length, 0) : null;

  return (
    <>
      <div className="mt-8">
        <label htmlFor="atlas-search" className="font-mono text-[12px] uppercase tracking-widest text-ink-3">
          Search the record
        </label>
        <input
          id="atlas-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="access · summons · duplicate · HEAT/HOT WATER · mold…"
          className="mt-2 w-full rounded border border-hairline bg-card px-3 py-2 font-mono text-[14px] outline-none focus:border-ink-3"
        />
        {matchCount !== null && (
          <p className="mt-2 font-mono text-[12px] text-ink-3">
            {matchCount === 0
              ? "No templates match — try a shorter word."
              : `${matchCount} template${matchCount === 1 ? "" : "s"} match.`}
          </p>
        )}
      </div>

      {filtered.map((s) => {
        const total = s.items.reduce((x, e) => x + e.n, 0);
        const showAll = q ? true : !!expanded[s.outcome];
        const visible = showAll ? s.items : s.items.slice(0, INITIAL_ITEMS);
        const sectionIndex = sections.findIndex((x) => x.outcome === s.outcome);
        return (
          <section key={s.outcome} className="pt-10">
            <div className="form-sec mb-3">exhibit {String.fromCharCode(65 + sectionIndex)}</div>
            <div className="flex flex-wrap items-baseline gap-3">
              <Stamp outcome={s.outcome} flat className="text-[13px]" />
              <span className="font-mono text-[13px] text-ink-3">
                {s.items.length} templates · {total.toLocaleString()} complaints ·{" "}
                {((total / grand) * 100).toFixed(1)}% of all outcomes
              </span>
            </div>
            <p className="mt-2 text-[14px] text-ink-2">{s.intro}</p>
            <ul className="mt-4 space-y-3">
              {visible.map((e) => (
                <li key={e.text} className="rounded border border-hairline bg-card p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[14px] font-medium">{e.gloss}</p>
                    <span className="flex items-baseline gap-3">
                      <AuditMark audit={e.audit} />
                      <p className="font-mono text-[12px] text-ink-3">×{e.n.toLocaleString()}</p>
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-ink-2">&ldquo;{e.text}&rdquo;</p>
                  <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-3">
                    {e.types.join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
            {!q && s.items.length > INITIAL_ITEMS && (
              <MoreButton
                showAll={showAll}
                onToggle={() => setExpanded({ ...expanded, [s.outcome]: !showAll })}
                hiddenCount={s.items.length - INITIAL_ITEMS}
              />
            )}
          </section>
        );
      })}
    </>
  );
}
