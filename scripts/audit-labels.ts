/**
 * The Audit: every label gets re-examined by a SECOND, adversarial model pass
 * whose job is to overturn the first. Upheld labels are notarized; confident
 * overturns are adopted (and marked); low-confidence disagreements are
 * published as contested, with both readings shown. AI auditing AI, with the
 * disagreements on the record.
 *
 * Usage: npm run audit   (rerun aggregate/worst/boomerang after — labels may change)
 */
import fs from "node:fs";
import path from "node:path";
import { generateJson } from "../lib/gemini";
import { OUTCOME_CLASSES } from "../lib/types";
import type { OutcomeClass, TemplatesFile } from "../lib/types";

const FILE = path.join(process.cwd(), "data", "templates.json");
const BATCH = 25;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          verdict: { type: "string", enum: ["uphold", "overturn"] },
          outcome: { type: "string", enum: OUTCOME_CLASSES, description: "Your reading (same as assigned if upholding)" },
          confidence: { type: "string", enum: ["high", "low"] },
          note: { type: "string", description: "<=15 words; if overturning, why the assigned label misreads the text" },
        },
        required: ["id", "verdict", "outcome", "confidence", "note"],
      },
    },
  },
  required: ["items"],
};

async function main() {
  const file = JSON.parse(fs.readFileSync(FILE, "utf8")) as TemplatesFile;
  const entries = Object.entries(file.labels).filter(([, l]) => !l.audit);
  console.log(`${entries.length} labels to audit (batches of ${BATCH})...`);

  let upheld = 0,
    corrected = 0,
    contested = 0;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const numbered = batch
      .map(([text, l], j) => `[${j}] ASSIGNED: ${l.outcome}\nTEXT: ${text}`)
      .join("\n\n");

    const prompt = `You are an adversarial auditor reviewing outcome labels assigned to NYC 311 closure texts by another model. Your job is to OVERTURN wrong labels — do not rubber-stamp. Judge only what the text states the agency did.

Classes: resolved (condition verifiably fixed, or enforcement like a summons/violation issued after confirming the problem), no_access (couldn't get in to inspect), no_jurisdiction (not this agency's rules/responsibility), condition_gone (nothing observed on arrival / condition already gone), referred (handed to another agency or person), no_action (explicitly no action taken), duplicate, in_progress (still pending, not final), other.

Be STRICT about "resolved": phone confirmations by the complainant count, but "attempted to inspect", "more information available online", or vague completions do not. If the assigned label overstates or understates what happened, overturn it. Use confidence "high" only when the text clearly supports your reading.

${numbered}`;

    const res = await generateJson<{
      items: { id: number; verdict: "uphold" | "overturn"; outcome: OutcomeClass; confidence: "high" | "low"; note: string }[];
    }>(prompt, RESPONSE_SCHEMA, { temperature: 0.1 });

    for (const item of res.items) {
      const entry = batch[item.id];
      if (!entry) continue;
      const [, label] = entry;
      if (item.verdict === "uphold" || item.outcome === label.outcome) {
        label.audit = { verdict: "upheld" };
        upheld++;
      } else if (item.confidence === "high") {
        label.audit = { verdict: "corrected", original: label.outcome, note: item.note };
        label.outcome = item.outcome;
        corrected++;
      } else {
        label.audit = { verdict: "contested", dissent: item.outcome, note: item.note };
        contested++;
      }
    }
    fs.writeFileSync(FILE, JSON.stringify(file, null, 2));
    console.log(`  batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(entries.length / BATCH)} (${upheld} upheld · ${corrected} corrected · ${contested} contested)`);
  }

  console.log(`\nAudit complete: ${upheld} upheld, ${corrected} corrected, ${contested} contested.`);
  if (corrected > 0) console.log("Labels changed — rerun: npm run aggregate && npm run worst && npm run boomerang");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
