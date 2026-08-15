import { COSMETIC_CLASSES } from "./types";
import type {
  OutcomeBreakdown,
  TemplateCount,
  TemplateLabel,
  TypeHonesty,
  TypeTemplates,
} from "./types";

/**
 * Join template counts with their LLM-assigned outcome classes.
 * `total` may exceed the sum of template counts (rows with a null/blank
 * resolution); the remainder is counted as "unknown".
 */
export function breakdown(
  templates: TemplateCount[],
  labels: Record<string, TemplateLabel>,
  total?: number,
): OutcomeBreakdown {
  const counts: Record<string, number> = {};
  let seen = 0;
  for (const t of templates) {
    const outcome = labels[t.text]?.outcome ?? "unknown";
    counts[outcome] = (counts[outcome] ?? 0) + t.n;
    seen += t.n;
  }
  const grandTotal = total ?? seen;
  if (grandTotal > seen) counts["unknown"] = (counts["unknown"] ?? 0) + (grandTotal - seen);
  return { counts, total: grandTotal };
}

export function cosmeticShare(b: OutcomeBreakdown): number {
  if (b.total === 0) return 0;
  const cosmetic = COSMETIC_CLASSES.reduce((s, c) => s + (b.counts[c] ?? 0), 0);
  return cosmetic / b.total;
}

export function resolvedShare(b: OutcomeBreakdown): number {
  if (b.total === 0) return 0;
  return (b.counts["resolved"] ?? 0) / b.total;
}

export function honestyForType(
  t: TypeTemplates,
  labels: Record<string, TemplateLabel>,
  receiptUrl: string,
): TypeHonesty {
  const b = breakdown(t.templates, labels, t.total);
  return {
    complaint_type: t.complaint_type,
    total: t.total,
    breakdown: b,
    cosmeticShare: cosmeticShare(b),
    resolvedShare: resolvedShare(b),
    receiptUrl,
  };
}

/**
 * Hero = the complaint type whose story is most damning: the absolute number
 * of cosmetically-closed complaints (share x volume).
 */
export function pickHero(types: TypeHonesty[]): string {
  let best = types[0];
  for (const t of types) {
    if (t.cosmeticShare * t.total > best.cosmeticShare * best.total) best = t;
  }
  return best.complaint_type;
}
