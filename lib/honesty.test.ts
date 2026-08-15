import { describe, expect, it } from "vitest";
import { breakdown, cosmeticShare, honestyForType, pickHero, resolvedShare } from "./honesty";
import type { TemplateLabel, TypeHonesty } from "./types";

const labels: Record<string, TemplateLabel> = {
  "fixed it": { outcome: "resolved", gloss: "fixed" },
  "no access": { outcome: "no_access", gloss: "closed without site access" },
  "gone on arrival": { outcome: "condition_gone", gloss: "condition gone on arrival" },
};

describe("breakdown", () => {
  it("sums counts by outcome class", () => {
    const b = breakdown(
      [
        { text: "fixed it", n: 10 },
        { text: "no access", n: 5 },
        { text: "gone on arrival", n: 5 },
      ],
      labels,
    );
    expect(b.counts).toEqual({ resolved: 10, no_access: 5, condition_gone: 5 });
    expect(b.total).toBe(20);
  });

  it("counts unlabeled templates and null-resolution remainder as unknown", () => {
    const b = breakdown([{ text: "fixed it", n: 10 }, { text: "mystery", n: 3 }], labels, 20);
    expect(b.counts["unknown"]).toBe(3 + 7); // 3 unlabeled + 7 missing rows
    expect(b.total).toBe(20);
  });
});

describe("shares", () => {
  it("computes cosmetic and resolved shares", () => {
    const b = breakdown(
      [
        { text: "fixed it", n: 6 },
        { text: "no access", n: 3 },
        { text: "gone on arrival", n: 1 },
      ],
      labels,
    );
    expect(resolvedShare(b)).toBeCloseTo(0.6);
    expect(cosmeticShare(b)).toBeCloseTo(0.4);
  });

  it("handles empty breakdowns without dividing by zero", () => {
    const b = breakdown([], labels);
    expect(cosmeticShare(b)).toBe(0);
    expect(resolvedShare(b)).toBe(0);
  });
});

describe("pickHero", () => {
  it("picks the type with the most cosmetically-closed complaints in absolute terms", () => {
    const mk = (name: string, total: number, cosmetic: number): TypeHonesty => ({
      complaint_type: name,
      total,
      breakdown: { counts: {}, total },
      cosmeticShare: cosmetic / total,
      resolvedShare: 0,
      receiptUrl: "",
    });
    // 90% of 100 (=90) loses to 30% of 1000 (=300)
    expect(pickHero([mk("small-bad", 100, 90), mk("big-mixed", 1000, 300)])).toBe("big-mixed");
  });
});

describe("honestyForType", () => {
  it("carries the receipt URL through", () => {
    const t = honestyForType(
      { complaint_type: "X", total: 10, templates: [{ text: "fixed it", n: 10 }] },
      labels,
      "https://example.com/receipt",
    );
    expect(t.receiptUrl).toBe("https://example.com/receipt");
    expect(t.resolvedShare).toBe(1);
  });
});
