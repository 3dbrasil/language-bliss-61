import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type UnsplashPhoto = { urls?: { raw?: unknown } };

const CoverImageInput = z.object({
  title: z.string().trim().min(1).max(180),
  situation: z.string().trim().max(240).optional().nullable(),
  lessonId: z.string().trim().min(1).max(160).optional().nullable(),
  avoidUrls: z.array(z.string().trim().min(1).max(1200)).max(200).optional(),
});

const CURATED_PHOTO_COVERS = [
  {
    test: /coffee|cafe|cafeteria|barista|latte|espresso/i,
    url: "https://images.pexels.com/photos/19373865/pexels-photo-19373865.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900",
  },
  {
    test: /work|office|job|interview|empresa|trabalho|co-?worker|startup/i,
    url: "https://images.pexels.com/photos/5439153/pexels-photo-5439153.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900",
  },
  {
    test: /grocery|store|market|supermercado|compras|ingredients|pasta/i,
    url: "https://images.pexels.com/photos/9705821/pexels-photo-9705821.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900",
  },
  {
    test: /directions|subway|city|street|cidade|rua|metro|station/i,
    url: "https://images.pexels.com/photos/17758034/pexels-photo-17758034.png?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900",
  },
  {
    test: /restaurant|waiter|dinner|jantar|garcom|pedido|menu/i,
    url: "https://images.pexels.com/photos/370984/pexels-photo-370984.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900",
  },
  {
    test: /doctor|medical|clinic|hospital|medico|consulta|symptoms/i,
    url: "https://images.pexels.com/photos/7579823/pexels-photo-7579823.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900",
  },
  {
    test: /business|negotiation|contract|client|corporate|negociando/i,
    url: "https://images.pexels.com/photos/7433853/pexels-photo-7433853.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900",
  },
  {
    test: /academic|debate|university|education|intelligence|educacao/i,
    url: "https://images.pexels.com/photos/8199151/pexels-photo-8199151.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900",
  },
  {
    test: /travel|airport|hotel|trip|viagem|aeroporto/i,
    url: "https://images.pexels.com/photos/3769138/pexels-photo-3769138.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900",
  },
  {
    test: /conversation|people|friend|meeting|dialogue|english|aula|lesson/i,
    url: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900",
  },
];

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
  } catch {
    return url;
  }
}

function imageIdentity(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.includes("images.unsplash.com") ||
      parsed.hostname.includes("images.pexels.com")
    ) {
      return `${parsed.origin}${parsed.pathname}`;
    }
  } catch {
    return normalizeImageUrl(url);
  }
  return normalizeImageUrl(url);
}

function isBadStoredImage(url?: string | null): boolean {
  return (
    !url ||
    /picsum\.photos|loremflickr\.com|placeholder|undefined|null|data:image\/svg\+xml/i.test(
      url.replace(/\\/g, ""),
    )
  );
}

function curatedFallbackUrl(
  title: string,
  situation?: string | null,
  lessonId?: string | null,
): string {
  const haystack = `${title} ${situation ?? ""}`;
  const matched = CURATED_PHOTO_COVERS.find((cover) => cover.test.test(haystack));
  if (matched) return matched.url;
  const seed = `${lessonId || "lesson"}|${title}|${situation ?? ""}`;
  return CURATED_PHOTO_COVERS[hash(seed) % CURATED_PHOTO_COVERS.length].url;
}

function searchQuery(title: string, situation?: string | null): string {
  const generic = new Set([
    "dialogo",
    "dialogue",
    "lesson",
    "aula",
    "importado",
    "importada",
    "falas",
    "linhas",
    "nivel",
    "pdf",
    "english",
    "ingles",
    "licao",
    "licoes",
  ]);
  const words = normalize(`${title} ${situation ?? ""}`)
    .split(" ")
    .filter((word) => word.length > 2 && !generic.has(word))
    .slice(0, 4);

  return words.length ? `${words.join(" ")} english conversation` : "english conversation people";
}

function unsplashUrl(photo: UnsplashPhoto): string | null {
  const raw = photo.urls?.raw;
  if (!raw || typeof raw !== "string") return null;
  const join = raw.includes("?") ? "&" : "?";
  return `${raw}${join}auto=format&fit=crop&w=900&h=500&q=80`;
}

export const getLessonCoverImage = createServerFn({ method: "POST" })
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
    if (
      existing?.image_url &&
      !isBadStoredImage(existing.image_url) &&
      !avoid.has(imageIdentity(existing.image_url))
    ) {
      return existing.image_url;
    }
    const shouldReplaceExisting = !!existing?.image_url;

    const { data: usedRows } = await supabaseAdmin
      .from("lesson_cover_images")
      .select("image_url")
      .limit(1000);
    const used = new Set(
      (usedRows ?? []).map((row: { image_url: string }) => imageIdentity(row.image_url)),
    );

    const candidates: Array<{ url: string; identity: string }> = [];
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      try {
        const params = new URLSearchParams({
          query: searchQuery(data.title, data.situation),
          orientation: "landscape",
          per_page: "30",
        });
        const response = await fetch(
          `https://api.unsplash.com/search/photos?${params.toString()}`,
          { headers: { Authorization: `Client-ID ${unsplashKey}` } },
        );
        if (response.ok) {
          const payload = await response.json();
          for (const photo of payload?.results ?? []) {
            const url = unsplashUrl(photo);
            const normalizedUrl = url ? normalizeImageUrl(url) : null;
            const identity = normalizedUrl ? imageIdentity(normalizedUrl) : null;
            if (
              normalizedUrl &&
              identity &&
              !candidates.some((candidate) => candidate.identity === identity)
            ) {
              candidates.push({ url: normalizedUrl, identity });
            }
          }
        }
      } catch {
        // Fallback below keeps imports working even if Unsplash is temporarily unavailable.
      }
    }

    const unique = candidates.filter(
      (candidate) => !used.has(candidate.identity) && !avoid.has(candidate.identity),
    );
    const ordered = unique.length
      ? unique
      : candidates.filter((candidate) => !avoid.has(candidate.identity));
    for (const candidate of ordered) {
      const imageUrl = candidate.url;
      const payload = {
        cache_key: key,
        title: data.title,
        situation: data.situation ?? null,
        image_url: imageUrl,
        source: "unsplash",
      };
      const { data: saved, error } = shouldReplaceExisting
        ? await supabaseAdmin
            .from("lesson_cover_images")
            .update(payload)
            .eq("cache_key", key)
            .select("image_url")
            .single()
        : await supabaseAdmin
            .from("lesson_cover_images")
            .insert(payload)
            .select("image_url")
            .single();
      if (!error && saved?.image_url) return saved.image_url;
      if (error?.code === "23505") {
        const { data: raced } = await supabaseAdmin
          .from("lesson_cover_images")
          .select("image_url")
          .eq("cache_key", key)
          .maybeSingle();
        if (raced?.image_url && !avoid.has(imageIdentity(raced.image_url))) return raced.image_url;
      }
    }

    const imageUrl = curatedFallbackUrl(data.title, data.situation, data.lessonId);
    const payload = {
      cache_key: key,
      title: data.title,
      situation: data.situation ?? null,
      image_url: imageUrl,
      source: "fallback",
    };
    const { data: saved } = shouldReplaceExisting
      ? await supabaseAdmin
          .from("lesson_cover_images")
          .update(payload)
          .eq("cache_key", key)
          .select("image_url")
          .single()
      : await supabaseAdmin
          .from("lesson_cover_images")
          .insert(payload)
          .select("image_url")
          .single();
    return saved?.image_url ?? imageUrl;
  });
