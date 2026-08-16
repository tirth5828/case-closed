import { generateJson, generate } from "@/lib/gemini";
import { query } from "@/lib/socrata";

/**
 * Ask the Record: the model writes the SoQL itself, we run it against NYC
 * Open Data, and the query ships with the answer as its receipt. One
 * auto-retry feeds the Socrata error back to the model. Read-only by
 * construction (Socrata GET + whitelisted params).
 */

const SCHEMA_DOC = `Dataset: NYC 311 Service Requests (erm2-nwe9), one row per complaint, 2010-present, ~40M rows.
Columns:
- unique_key (text id)
- created_date, closed_date (floating timestamps, e.g. 2026-08-01T00:00:00)
- agency (e.g. NYPD, HPD, DSNY, DOT, DEP, DOB, DOHMH, DHS)
- complaint_type (e.g. 'Illegal Parking', 'HEAT/HOT WATER', 'Noise - Residential', 'Blocked Driveway', 'UNSANITARY CONDITION', 'Rodent', 'Street Condition', 'PLUMBING', 'Abandoned Vehicle', 'Snow or Ice')
- descriptor (subtype, e.g. 'Blocked Hydrant', 'ENTIRE BUILDING', 'Rat Sighting')
- status (mostly 'Closed')
- resolution_description (free-text closure template)
- incident_zip (5-digit text), incident_address (uppercase street address), city, borough (MANHATTAN/BRONX/BROOKLYN/QUEENS/STATEN ISLAND), community_board (e.g. '12 BRONX')

SoQL rules: SELECT-style aggregation via params. Use count(unique_key) for counts. String literals in single quotes; dates as '2026-01-01T00:00:00'. Useful functions: date_trunc_ymd(created_date), date_extract_dow(created_date) (0=Sunday), date_extract_hh(created_date), upper(). Text search: complaint_type = '...' exact, or contains(upper(complaint_type), 'RAT'). Today is ${new Date().toISOString().slice(0, 10)}.`;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    select: { type: "string", description: "the $select clause, e.g. \"borough, count(unique_key) as n\"" },
    where: { type: "string", description: "the $where clause, or empty string" },
    group: { type: "string", description: "the $group clause, or empty string" },
    order: { type: "string", description: "the $order clause, or empty string" },
    limit: { type: "integer", description: "row limit, <= 50" },
    explanation: { type: "string", description: "one sentence: what this query measures" },
  },
  required: ["select", "where", "group", "order", "limit", "explanation"],
};

interface Plan {
  select: string;
  where: string;
  group: string;
  order: string;
  limit: number;
  explanation: string;
}

function toParams(plan: Plan): Record<string, string> {
  const params: Record<string, string> = { $select: plan.select };
  if (plan.where) params["$where"] = plan.where;
  if (plan.group) params["$group"] = plan.group;
  if (plan.order) params["$order"] = plan.order;
  params["$limit"] = String(Math.min(Math.max(plan.limit || 20, 1), 50));
  return params;
}

export async function POST(request: Request) {
  const { question } = (await request.json()) as { question?: string };
  if (!question?.trim()) {
    return Response.json({ error: "Ask a question first." }, { status: 400 });
  }
  const q = question.trim().slice(0, 300);

  const planPrompt = (feedback?: string) => `Write a Socrata SoQL query (as separate clauses) to answer a question about NYC 311 data.

${SCHEMA_DOC}

Question: "${q}"
${feedback ? `\nYour previous attempt failed with this Socrata error - fix the query:\n${feedback}` : ""}
Prefer aggregations over raw rows. Never select resolution_description unless asked about closure language. Keep limit small.`;

  let plan: Plan | null = null;
  let rows: Record<string, string>[] = [];
  let url = "";
  let fromCache = false;
  let attempts = 0;

  let feedback: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    attempts++;
    try {
      plan = await generateJson<Plan>(planPrompt(feedback), PLAN_SCHEMA, { temperature: 0.1 });
    } catch (e) {
      return Response.json(
        { error: `Couldn't plan a query: ${e instanceof Error ? e.message : String(e)}` },
        { status: 502 },
      );
    }
    try {
      const res = await query(toParams(plan));
      rows = res.rows as Record<string, string>[];
      url = res.url;
      fromCache = res.fromCache;
      break;
    } catch (e) {
      feedback = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      if (attempt === 1) {
        return Response.json(
          { error: `The record didn't accept the query after ${attempts} attempts: ${feedback}`, plan },
          { status: 502 },
        );
      }
    }
  }

  let answer = "";
  try {
    answer = await generate(
      `Question about NYC 311 data: "${q}"
Query run (${plan!.explanation}). Result rows (JSON):
${JSON.stringify(rows).slice(0, 4000)}

Answer the question in 1-2 plain sentences using ONLY these rows. Format big numbers with commas. If the rows don't answer it, say what they do show instead.`,
      { temperature: 0.2 },
    );
  } catch {
    answer = "The query ran - read the rows below.";
  }

  return Response.json({
    question: q,
    plan,
    rows: rows.slice(0, 50),
    answer: answer.trim(),
    receiptUrl: url,
    fromCache,
    attempts,
  });
}
