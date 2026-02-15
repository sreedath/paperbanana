import type { PipelineStatus, BrandingOptions, IterationImage } from "./types";
import { generateText, generateImage, generateTextWithImage } from "./gemini";
import { PLANNER_PROMPT, LINKEDIN_PLANNER_PROMPT, VISUALIZER_PROMPT, CRITIC_PROMPT } from "./prompts";
import { applyBranding } from "./image-utils";

export interface PipelineInput {
  sourceContext: string;
  caption: string;
  diagramType: string;
  iterations: number;
  branding: BrandingOptions;
  aspectRatio: string;
}

export interface PipelineResult {
  imageBase64: string;
  mimeType: string;
  description: string;
  allIterations: IterationImage[];
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
  const allIterations: IterationImage[] = [];

  try {
    // Step 1: Plan
    onStatus("planning", "Creating diagram description...");
    const promptTemplate =
      input.diagramType === "linkedin" ? LINKEDIN_PLANNER_PROMPT : PLANNER_PROMPT;
    const plannerPrompt = fillTemplate(promptTemplate, {
      source_context: input.sourceContext,
      caption: input.caption,
    });
    let description = await generateText(plannerPrompt);

    // Step 2: Generate initial image
    onStatus("generating", "Generating diagram image...");
    const vizPrompt = fillTemplate(VISUALIZER_PROMPT, { description });
    const ar = input.aspectRatio || undefined;
    let imageResult = await generateImage(vizPrompt, ar);

    allIterations.push({
      dataUrl: `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`,
      label: "Iteration 1 (initial)",
    });

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
        const jsonMatch = criticRaw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, criticRaw];
        const parsed = JSON.parse(jsonMatch[1]!.trim());
        revisedDescription = parsed.revised_description ?? null;
      } catch {
        continue;
      }

      if (!revisedDescription) {
        break;
      }

      // Re-generate with revised description
      description = revisedDescription;
      onStatus("generating", `Regenerating image (iteration ${i + 1})...`);
      const newVizPrompt = fillTemplate(VISUALIZER_PROMPT, { description });
      imageResult = await generateImage(newVizPrompt, ar);

      allIterations.push({
        dataUrl: `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`,
        label: `Iteration ${i + 1}`,
      });
    }

    // Step 4: Apply branding overlay to the final image
    if (input.branding.showLogo || input.branding.showUrl) {
      onStatus("branding", "Applying branding...");
      const finalDataUrl = `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`;
      const branded = await applyBranding(finalDataUrl, input.branding);
      const base64Match = branded.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        imageResult = {
          mimeType: base64Match[1],
          imageBase64: base64Match[2],
        };
      }
      // Update the last iteration with the branded version
      allIterations[allIterations.length - 1] = {
        dataUrl: `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`,
        label: allIterations[allIterations.length - 1].label + " (branded)",
      };
    }

    onStatus("done");
    return {
      imageBase64: imageResult.imageBase64,
      mimeType: imageResult.mimeType,
      description,
      allIterations,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    onStatus("error", message);
    throw err;
  }
}
