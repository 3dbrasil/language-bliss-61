// Busca uma imagem de capa para uma aula.
// Usa Unsplash API se a chave estiver configurada em Configurações; caso
// contrário, usa LoremFlickr (keyless) como fallback.

import { getApiConfig } from './apiConfig';

function keywords(title: string, situation?: string): string {
  const base = `${title} ${situation || ''}`
    .toLowerCase()
    .replace(/[^a-zà-ÿ0-9\s]/gi, ' ')
    .replace(/\b(diálogo|dialogo|dialogue|lesson|aula|importado|falas?)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 3)
    .join(',');
  return base || 'conversation,people';
}

export async function findCoverImage(title: string, situation?: string): Promise<string> {
  const q = keywords(title, situation);
  const UNSPLASH_KEY = getApiConfig().unsplashAccessKey;
  if (UNSPLASH_KEY) {
    try {
      const r = await fetch(
        `https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&query=${encodeURIComponent(q.replace(/,/g, ' '))}`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
      );
      if (r.ok) {
        const j = await r.json();
        const url = j?.results?.[0]?.urls?.regular;
        if (url) return url;
      }
    } catch (_) {}
  }
  // Fallback keyless — sempre retorna uma imagem
  return `https://loremflickr.com/800/400/${encodeURIComponent(q)}?lock=${Math.abs(hash(title))}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
