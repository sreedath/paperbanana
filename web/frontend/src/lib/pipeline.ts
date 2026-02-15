import type { PipelineStatus } from "./types";
import { generateText, generateImage, generateTextWithImage } from "./gemini";
import { PLANNER_PROMPT, VISUALIZER_PROMPT, CRITIC_PROMPT } from "./prompts";

export interface PipelineInput {
  sourceContext: string;
  caption: string;
  diagramType: string;
  iterations: number;
}

export interface PipelineResult {
  imageBase64: string;
  mimeType: string;
  description: string;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export async function runPipeline(
  input: PipelineInput,
  onStatus: (status: PipelineStatus, message?: string) => void
): Promise<PipelineResult> {
  try {
    // Step 1: Plan
    onStatus("planning", "Creating diagram description...");
    const plannerPrompt = fillTemplate(PLANNER_PROMPT, {
      source_context: input.sourceContext,
      caption: input.caption,
    });
    let description = await generateText(plannerPrompt);

    // Step 2: Generate initial image
    onStatus("generating", "Generating diagram image...");
    const vizPrompt = fillTemplate(VISUALIZER_PROMPT, { description });
    let imageResult = await generateImage(vizPrompt);

    // Step 3: Critique loop (if iterations > 1)
    for (let i = 1; i < input.iterations; i++) {
      onStatus("critiquing", `Critiquing iteration ${i}/${input.iterations - 1}...`);

      const criticPrompt = fillTemplate(CRITIC_PROMPT, {
        source_context: input.sourceContext,
        caption: input.caption,
        description,
      });

      const criticRaw = await generateTextWithImage(
        criticPrompt,
        imageResult.imageBase64,
        imageResult.mimeType
      );

      // Parse critic response
      let revisedDescription: string | null = null;
      try {
        // Extract JSON from potential markdown code blocks
        const jsonMatch = criticRaw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, criticRaw];
        const parsed = JSON.parse(jsonMatch[1]!.trim());
        revisedDescription = parsed.revised_description ?? null;
      } catch {
        // If parsing fails, skip this iteration
        continue;
      }

      if (!revisedDescription) {
        // Critic says it's good — stop iterating
        break;
      }

      // Re-generate with revised description
      description = revisedDescription;
      onStatus("generating", `Regenerating image (iteration ${i + 1})...`);
      const newVizPrompt = fillTemplate(VISUALIZER_PROMPT, { description });
      imageResult = await generateImage(newVizPrompt);
    }

    onStatus("done");
    return {
      imageBase64: imageResult.imageBase64,
      mimeType: imageResult.mimeType,
      description,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    onStatus("error", message);
    throw err;
  }
}
