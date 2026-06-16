import { getLessonCoverImage } from '@/lib/lessonImages.functions';

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = ((h << 5) - h + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seedFor(title: string, situation?: string, lessonId?: string): string {
  return `${lessonId || 'lesson'}-${hash(`${lessonId || ''}|${title}|${situation || ''}`)}`;
}

export function fallbackCoverImage(title: string, situation?: string, lessonId?: string): string {
  const seed = seedFor(title, situation, lessonId);
  const palettes = [
    ['#0A0F1A', '#2A7FFF', '#00D4A0'],
    ['#101827', '#F59E0B', '#2A7FFF'],
    ['#111827', '#EC4899', '#00D4A0'],
    ['#0F172A', '#A855F7', '#F59E0B'],
    ['#08111F', '#5BA0FF', '#5EEAC4'],
  ];
  const [bg, a, b] = palettes[hash(seed) % palettes.length];
  const x1 = 120 + (hash(`${seed}-x1`) % 220);
  const x2 = 610 + (hash(`${seed}-x2`) % 170);
  const y1 = 80 + (hash(`${seed}-y1`) % 120);
  const y2 = 250 + (hash(`${seed}-y2`) % 150);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 500" role="img"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset=".58" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="28"/></filter></defs><rect width="900" height="500" fill="url(#g)"/><circle cx="${x1}" cy="${y1}" r="170" fill="${b}" opacity=".28" filter="url(#blur)"/><circle cx="${x2}" cy="${y2}" r="210" fill="${a}" opacity=".28" filter="url(#blur)"/><path d="M0 350 C150 285 260 420 420 345 S680 290 900 355 V500 H0 Z" fill="#ffffff" opacity=".10"/><path d="M0 395 C180 330 300 460 500 385 S710 345 900 405 V500 H0 Z" fill="#ffffff" opacity=".12"/><g opacity=".18" stroke="#fff" stroke-width="2" fill="none"><path d="M92 116h220M92 154h150M92 192h260"/><path d="M620 128c58 0 105 47 105 105s-47 105-105 105-105-47-105-105 47-105 105-105Z"/><path d="M572 233h96M620 185v96"/></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function isLikelyBrokenCoverImageUrl(url?: string | null): boolean {
  const value = typeof url === 'string' ? url.trim() : '';
  if (!value) return false;
  return /loremflickr\.com|placeholder|undefined|null/i.test(value) || !/^(https?:\/\/|data:image\/|\/|blob:)/i.test(value);
}

export async function findCoverImage(title: string, situation?: string, lessonId?: string, avoidUrls: string[] = []): Promise<string> {
  try {
    const url = await getLessonCoverImage({ data: { title, situation, lessonId, avoidUrls } });
    return url || fallbackCoverImage(title, situation, lessonId);
  } catch (_) {
    return fallbackCoverImage(title, situation, lessonId);
  }
}
