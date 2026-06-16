import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CoverImageInput = z.object({
  title: z.string().trim().min(1).max(180),
  situation: z.string().trim().max(240).optional().nullable(),
  lessonId: z.string().trim().min(1).max(160).optional().nullable(),
  avoidUrls: z.array(z.string().trim().min(1).max(1200)).max(200).optional(),
});

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = ((h << 5) - h + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cacheKey(title: string, situation?: string | null, lessonId?: string | null): string {
  const raw = `${lessonId || "lesson"}|${title}|${situation ?? ""}`;
  const slug = normalize(raw).replace(/\s+/g, "-").slice(0, 120) || "lesson";
  return `${slug}-${hash(raw)}`;
}

function normalizeImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("ixid");
    return parsed.toString();
  } catch (_) {
    return url;
  }
}

function imageIdentity(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("images.unsplash.com") || parsed.hostname.includes("images.pexels.com")) {
      return `${parsed.origin}${parsed.pathname}`;
    }
  } catch (_) {}
  return normalizeImageUrl(url);
}

function searchQuery(title: string, situation?: string | null): string {
  const generic = new Set([
    "dialogo", "dialogue", "lesson", "aula", "importado", "importada", "falas",
    "linhas", "nivel", "pdf", "english", "ingles", "licao", "licoes",
  ]);
  const words = normalize(`${title} ${situation ?? ""}`)
    .split(" ")
    .filter((word) => word.length > 2 && !generic.has(word))
    .slice(0, 4);

  return words.length ? `${words.join(" ")} english conversation` : "english conversation people";
}

function unsplashUrl(photo: any): string | null {
  const raw = photo?.urls?.raw;
  if (!raw || typeof raw !== "string") return null;
  const join = raw.includes("?") ? "&" : "?";
  return `${raw}${join}auto=format&fit=crop&w=900&h=500&q=80`;
}

export const getLessonCoverImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CoverImageInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = cacheKey(data.title, data.situation, data.lessonId);
    const avoid = new Set((data.avoidUrls ?? []).map(imageIdentity));

    const { data: existing } = await supabaseAdmin
      .from("lesson_cover_images")
      .select("image_url")
      .eq("cache_key", key)
      .maybeSingle();
    if (existing?.image_url && !avoid.has(imageIdentity(existing.image_url))) return existing.image_url;
    const shouldReplaceExisting = !!existing?.image_url;

    const { data: usedRows } = await supabaseAdmin
      .from("lesson_cover_images")
      .select("image_url")
      .limit(1000);
    const used = new Set((usedRows ?? []).map((row: { image_url: string }) => imageIdentity(row.image_url)));

    const candidates: Array<{ url: string; identity: string }> = [];
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      try {
        const params = new URLSearchParams({
          query: searchQuery(data.title, data.situation),
          orientation: "landscape",
          per_page: "30",
        });
        const response = await fetch(`https://api.unsplash.com/search/photos?${params.toString()}`, {
          headers: { Authorization: `Client-ID ${unsplashKey}` },
        });
        if (response.ok) {
          const payload = await response.json();
          for (const photo of payload?.results ?? []) {
            const url = unsplashUrl(photo);
            const normalizedUrl = url ? normalizeImageUrl(url) : null;
            const identity = normalizedUrl ? imageIdentity(normalizedUrl) : null;
            if (normalizedUrl && identity && !candidates.some((candidate) => candidate.identity === identity)) {
              candidates.push({ url: normalizedUrl, identity });
            }
          }
        }
      } catch (_) {
        // Fallback below keeps imports working even if Unsplash is temporarily unavailable.
      }
    }

    const ordered = candidates.filter((candidate) => !used.has(candidate.identity) && !avoid.has(candidate.identity));
    for (const candidate of ordered) {
      const imageUrl = candidate.url;
      const payload = { cache_key: key, title: data.title, situation: data.situation ?? null, image_url: imageUrl, source: "unsplash" };
      const { data: saved, error } = shouldReplaceExisting
        ? await supabaseAdmin.from("lesson_cover_images").update(payload).eq("cache_key", key).select("image_url").single()
        : await supabaseAdmin.from("lesson_cover_images").insert(payload).select("image_url").single();
      if (!error && saved?.image_url) return saved.image_url;
      if (error?.code === "23505") {
        const { data: raced } = await supabaseAdmin.from("lesson_cover_images").select("image_url").eq("cache_key", key).maybeSingle();
        if (raced?.image_url && !avoid.has(imageIdentity(raced.image_url))) return raced.image_url;
      }
    }

    const q = encodeURIComponent(searchQuery(data.title, data.situation).replace(/\s+/g, ","));
    for (let i = 0; i < 10; i++) {
      const imageUrl = `https://loremflickr.com/900/500/${q}?lock=${hash(`${key}-${i}`)}`;
      if (used.has(imageIdentity(imageUrl)) || avoid.has(imageIdentity(imageUrl))) continue;
      const payload = { cache_key: key, title: data.title, situation: data.situation ?? null, image_url: imageUrl, source: "fallback" };
      const { data: saved, error } = shouldReplaceExisting
        ? await supabaseAdmin.from("lesson_cover_images").update(payload).eq("cache_key", key).select("image_url").single()
        : await supabaseAdmin.from("lesson_cover_images").insert(payload).select("image_url").single();
      if (!error && saved?.image_url) return saved.image_url;
      if (error?.code === "23505") {
        const { data: raced } = await supabaseAdmin.from("lesson_cover_images").select("image_url").eq("cache_key", key).maybeSingle();
        if (raced?.image_url && !avoid.has(imageIdentity(raced.image_url))) return raced.image_url;
      }
    }

    return `https://loremflickr.com/900/500/${q}?lock=${hash(key)}`;
  });