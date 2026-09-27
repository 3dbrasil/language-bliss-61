import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";

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

// Public translation endpoint — no auth required.
export const translateLessonLines = createServerFn({ method: "POST" })
  .inputValidator((input) => TranslationInput.parse(input))
  .handler(async ({ data }) => {
    const payload = data.lines.map((line) => ({ id: line.id, text: line.text }));
    const providers = [
      { name: "Groq", key: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
      { name: "NVIDIA", key: process.env.NVIDIA_API_KEY, baseURL: "https://integrate.api.nvidia.com/v1", model: "meta/llama-3.3-70b-instruct" },
    ].filter((provider) => Boolean(provider.key));
    if (!providers.length) throw new Error("Configure uma chave Groq ou NVIDIA para tradução.");
    let lastError: unknown;
    for (const provider of providers) {
      try {
        const client = createOpenAICompatible({
          name: provider.name.toLowerCase(),
          baseURL: provider.baseURL,
          headers: { Authorization: `Bearer ${provider.key}` },
        });
        const result = await generateText({
          model: client(provider.model),
          temperature: 0.1,
          system: "You translate English lesson dialogue lines into natural Brazilian Portuguese. Return only valid JSON.",
          prompt: `Translate each text to Brazilian Portuguese, keeping the same meaning and tone. Return exactly one JSON object where each key is the id and each value is the Portuguese translation. Do not include markdown.\n\n${JSON.stringify(payload)}`,
        });
        const translations = parseTranslations(result.text);
        if (Object.keys(translations).length) return translations;
        lastError = new Error(`${provider.name}: resposta vazia`);
      } catch (error) { lastError = error; }
    }
    throw lastError ?? new Error("Tradução indisponível no momento.");
  });
