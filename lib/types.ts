export type OutcomeClass =
  | "resolved"
  | "no_access"
  | "no_jurisdiction"
  | "condition_gone"
  | "referred"
  | "no_action"
  | "duplicate"
  | "in_progress"
  | "other";

export const OUTCOME_CLASSES: OutcomeClass[] = [
  "resolved",
  "no_access",
  "no_jurisdiction",
  "condition_gone",
  "referred",
  "no_action",
  "duplicate",
  "in_progress",
  "other",
];

/** Closure classes that end the ticket without the underlying problem being verified fixed. */
export const COSMETIC_CLASSES: OutcomeClass[] = [
  "no_access",
  "no_jurisdiction",
  "condition_gone",
  "referred",
  "no_action",
];

export interface TemplateCount {
  text: string;
  n: number;
}

export interface TypeTemplates {
  complaint_type: string;
  total: number;
  templates: TemplateCount[];
}

export interface RawTemplatesFile {
  pulledAt: string;
  since: string;
  types: TypeTemplates[];
}

export interface TemplateLabel {
  outcome: OutcomeClass;
  gloss: string;
}

/** Map from exact template text -> label. */
export interface TemplatesFile {
  classifiedAt: string;
  model: string;
  labels: Record<string, TemplateLabel>;
}

export interface OutcomeBreakdown {
  /** Absolute complaint counts per outcome class (includes "unknown" for null/unclassified). */
  counts: Record<string, number>;
  total: number;
}

export interface TypeHonesty {
  complaint_type: string;
  total: number;
  breakdown: OutcomeBreakdown;
  /** Share of all complaints whose closure was cosmetic (0..1). */
  cosmeticShare: number;
  resolvedShare: number;
  /** The Socrata URL the numbers were derived from (receipts). */
  receiptUrl: string;
}

export interface HonestyFile {
  builtAt: string;
  since: string;
  types: TypeHonesty[];
  hero: string;
}
