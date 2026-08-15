import { generateJson } from "@/lib/gemini";

interface TemplateSummary {
  n: number;
  outcome: string;
  gloss: string;
  text: string;
}

/**
 * Act 3: the model reads the actual failure templates for this complaint
 * type and writes concrete advice for landing in the resolved cohort.
 * Filing advice derived from outcomes, not FAQ pages.
 */
export async function POST(request: Request) {
  const { problem, complaint_type, scope, total, resolvedShare, cosmeticShare, templates } =
    (await request.json()) as {
      problem?: string;
      complaint_type?: string;
      scope?: string;
      total?: number;
      resolvedShare?: number;
      cosmeticShare?: number;
      templates?: TemplateSummary[];
    };
  if (!complaint_type || !templates?.length) {
    return Response.json({ error: "complaint_type and templates required" }, { status: 400 });
  }

  const schema = {
    type: "object",
    properties: {
      odds: {
        type: "string",
        description: "Two sentences, plain English: what really happens to complaints like theirs, grounded ONLY in the numbers provided",
      },
      steps: {
        type: "array",
        items: { type: "string" },
        description: "3-5 concrete actions, each derived from a specific failure template, each <=25 words",
      },
    },
    required: ["odds", "steps"],
  };

  const templateLines = templates
    .map((t) => `- ${t.n.toLocaleString()} complaints closed as [${t.outcome}]: "${t.text.slice(0, 300)}"`)
    .join("\n");

  const prompt = `You advise a New Yorker about to file a 311 complaint${problem ? ` about: "${problem.slice(0, 300)}"` : ""} (official type: ${complaint_type}).

What actually happened to ${total?.toLocaleString()} ${scope ?? "similar complaints"}: ${((resolvedShare ?? 0) * 100).toFixed(0)}% verifiably resolved, ${((cosmeticShare ?? 0) * 100).toFixed(0)}% closed cosmetically (without the problem being verified fixed). The actual closure texts and their volumes:

${templateLines}

Write the honest odds and concrete steps to land in the resolved group. Each step must counter a SPECIFIC failure mode visible in the closure texts above (e.g. if many closures say the inspector couldn't get in, the step is about being reachable/present for the inspection). Never invent statistics not given here.

Tone rules: neutral and factual about the city — say "closed without site access", never "ignored". The villain is a closure code that hides outcomes, not city workers. Be direct and practical with the reader.`;

  try {
    const result = await generateJson<{ odds: string; steps: string[] }>(prompt, schema);
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: `Playbook generation failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }
}
