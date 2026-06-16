import { translateLessonLines } from "@/lib/translations.functions";
import { Dialogue } from "../types";

function isMissingTranslation(value?: string): boolean {
  const clean = (value || "").trim();
  return !clean || /^[•.\s]+$/.test(clean) || /^tradu[cç][aã]o\s+(indispon[ií]vel|pendente)/i.test(clean);
}

export function hasMissingTranslations(dialogues: Dialogue[]): boolean {
  return dialogues.some((dialogue) => dialogue.lines.some((line) => isMissingTranslation(line.translation)));
}

export async function fillMissingLineTranslations(dialogues: Dialogue[]): Promise<Dialogue[]> {
  if (!hasMissingTranslations(dialogues)) return dialogues;

  const next = dialogues.map((dialogue) => ({
    ...dialogue,
    lines: dialogue.lines.map((line) => ({ ...line })),
  }));

  const missing = next.flatMap((dialogue) =>
    dialogue.lines
      .filter((line) => isMissingTranslation(line.translation) && line.text.trim())
      .map((line) => ({ id: line.id, text: line.text })),
  );

  const translations: Record<string, string> = {};
  for (let i = 0; i < missing.length; i += 40) {
    try {
      const chunk = missing.slice(i, i + 40);
      Object.assign(translations, await translateLessonLines({ data: { lines: chunk } }));
    } catch (error) {
      console.warn("translation fill failed", error);
    }
  }

  return next.map((dialogue) => ({
    ...dialogue,
    lines: dialogue.lines.map((line) => ({
      ...line,
      translation: isMissingTranslation(line.translation) ? (translations[line.id] || line.translation || "") : line.translation,
      keyVocabulary: line.keyVocabulary?.map((item) => ({
        ...item,
        translation: item.translation === "ver tradução da frase" && translations[line.id] ? translations[line.id] : item.translation,
      })),
    })),
  }));
}