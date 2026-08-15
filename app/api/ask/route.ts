import { generateJson } from "@/lib/gemini";
import { loadRawTemplates } from "@/lib/data";

/**
 * Act 2, step 1: plain-English problem -> the city's own complaint taxonomy.
 * This mapping is the only thing standing between a resident and their own
 * data: a broken radiator is filed as HEAT/HOT WATER under HPD, which nobody
 * finds in a dropdown.
 */
export async function POST(request: Request) {
  const { problem } = (await request.json()) as { problem?: string };
  if (!problem?.trim()) {
    return Response.json({ error: "Describe your problem first." }, { status: 400 });
  }

  const raw = loadRawTemplates();
  const taxonomy = raw.types.map((t) => ({
    complaint_type: t.complaint_type,
    descriptors: t.descriptors.slice(0, 15).map((d) => d.text),
  }));
  const typeNames = taxonomy.map((t) => t.complaint_type);

  const schema = {
    type: "object",
    properties: {
      complaint_type: { type: "string", enum: [...typeNames, "OTHER"] },
      descriptor: {
        type: "string",
        description: "One of the listed descriptors for the chosen type, or empty string if none fits",
      },
      reasoning: { type: "string", description: "One sentence: why this classification, in plain English" },
    },
    required: ["complaint_type", "descriptor", "reasoning"],
  };

  const prompt = `A New Yorker describes a problem in their own words. Map it into NYC 311's official complaint taxonomy so they can find what happened to identical complaints.

Available complaint types and their official descriptors:
${taxonomy.map((t) => `- ${t.complaint_type}: [${t.descriptors.join(" | ")}]`).join("\n")}

If nothing fits, use complaint_type "OTHER" with empty descriptor.
Only choose a descriptor from the chosen type's own list; use "" if unsure.

Their problem: "${problem.trim().slice(0, 500)}"`;

  try {
    const result = await generateJson<{
      complaint_type: string;
      descriptor: string;
      reasoning: string;
    }>(prompt, schema);

    // Guard against hallucinated descriptors: must be in the real list.
    const type = taxonomy.find((t) => t.complaint_type === result.complaint_type);
    const descriptor = type?.descriptors.includes(result.descriptor) ? result.descriptor : "";

    return Response.json({ ...result, descriptor });
  } catch (e) {
    return Response.json(
      { error: `Classification failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }
}
