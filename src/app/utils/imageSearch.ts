// Busca uma imagem de capa para uma aula.
// - Cacheia por palavra-chave em localStorage (evita refazer a mesma busca)
// - Evita repetir a mesma URL entre aulas diferentes (pede mais resultados e
//   escolhe o primeiro ainda não usado)
// - Usa Unsplash se a chave estiver em Configurações; senão LoremFlickr.

import { getApiConfig } from './apiConfig';

const CACHE_KEY = 'imageSearch.cache.v1';
const USED_KEY = 'imageSearch.used.v1';

type Cache = Record<string, string>; // keyword -> url
type Used = Record<string, true>;    // url -> true

function loadCache(): Cache {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(c: Cache) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}
function loadUsed(): Used {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(USED_KEY) || '{}'); } catch { return {}; }
}
function saveUsed(u: Used) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(USED_KEY, JSON.stringify(u)); } catch {}
}

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

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

export async function findCoverImage(title: string, situation?: string): Promise<string> {
  const q = keywords(title, situation);
  const cache = loadCache();
  const used = loadUsed();

  // Cache hit por palavra-chave → retorna a mesma imagem
  if (cache[q]) return cache[q];

  const UNSPLASH_KEY = getApiConfig().unsplashAccessKey;
  let chosen: string | null = null;

  if (UNSPLASH_KEY) {
    try {
      const r = await fetch(
        `https://api.unsplash.com/search/photos?per_page=20&orientation=landscape&query=${encodeURIComponent(q.replace(/,/g, ' '))}`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
      );
      if (r.ok) {
        const j = await r.json();
        const urls: string[] = (j?.results || []).map((x: any) => x?.urls?.regular).filter(Boolean);
        chosen = urls.find(u => !used[u]) || urls[0] || null;
      }
    } catch (_) {}
  }

  if (!chosen) {
    // Fallback keyless único por título (lock = hash do título → URL distinta por aula)
    chosen = `https://loremflickr.com/800/400/${encodeURIComponent(q)}?lock=${Math.abs(hash(title))}`;
  }

  cache[q] = chosen;
  used[chosen] = true;
  saveCache(cache);
  saveUsed(used);
  return chosen;
}
