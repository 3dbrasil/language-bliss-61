import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TranslationInput = z.object({
  lines: z.array(z.object({
    id: z.string().trim().min(1).max(160),
    text: z.string().trim().min(1).max(800),
  })).min(1).max(40),
});

function parseTranslations(raw: string): Record<string, string> {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === "string" && value.trim())
        .map(([key, value]) => [key, String(value).trim()]),
    );
  } catch (_) {
    return {};
  }
}

export const translateLessonLines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => TranslationInput.parse(input))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) return {} as Record<string, string>;

    const gateway = createLovableAiGatewayProvider(lovableKey);
    const model = gateway("google/gemini-3-flash-preview");
    const payload = data.lines.map((line) => ({ id: line.id, text: line.text }));

    const result = await generateText({
      model,
      temperature: 0.1,
      system: "You translate English lesson dialogue lines into natural Brazilian Portuguese. Return only valid JSON.",
      prompt: `Translate each text to Brazilian Portuguese, keeping the same meaning and tone. Return exactly one JSON object where each key is the id and each value is the Portuguese translation. Do not include markdown.\n\n${JSON.stringify(payload)}`,
    });

    return parseTranslations(result.text);
  });