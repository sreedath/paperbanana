import { GoogleGenAI } from "@google/genai";
import { getApiKey } from "./storage";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const key = getApiKey();
  if (!key) throw new Error("Gemini API key not set");
  if (!client) {
    client = new GoogleGenAI({ apiKey: key });
  }
  return client;
}

/** Reset the singleton (call when the API key changes). */
export function resetClient(): void {
  client = null;
}

/** Text-only generation using gemini-2.5-flash. */
export async function generateText(prompt: string): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text ?? "";
}

/** Image generation using gemini-2.5-flash-image. */
export async function generateImage(
  prompt: string,
  aspectRatio?: string
): Promise<{ imageBase64: string; mimeType: string }> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      ...(aspectRatio ? { imageConfig: { aspectRatio } } : {}),
    },
  });
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No response from Gemini image generation");
  const imagePart = parts.find((p) => p.inlineData);
  if (!imagePart?.inlineData) throw new Error("No image in Gemini response");
  return {
    imageBase64: imagePart.inlineData.data ?? "",
    mimeType: imagePart.inlineData.mimeType ?? "image/png",
  };
}

/** Multimodal input (text + image) using gemini-2.5-flash. */
export async function generateTextWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { data: imageBase64, mimeType } },
        ],
      },
    ],
  });
  return response.text ?? "";
}
