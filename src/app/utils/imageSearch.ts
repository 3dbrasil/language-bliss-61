import { getLessonCoverImage } from '@/lib/lessonImages.functions';
const PHOTO_COVERS = [
  { test: /coffee|cafe|cafeteria|barista|latte|espresso/i, url: 'https://images.pexels.com/photos/19373865/pexels-photo-19373865.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900' },
  { test: /work|office|job|interview|empresa|trabalho|co-?worker|startup/i, url: 'https://images.pexels.com/photos/5439153/pexels-photo-5439153.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900' },
  { test: /grocery|store|market|supermercado|compras|ingredients|pasta/i, url: 'https://images.pexels.com/photos/9705821/pexels-photo-9705821.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900' },
  { test: /directions|subway|city|street|cidade|rua|metro|station/i, url: 'https://images.pexels.com/photos/17758034/pexels-photo-17758034.png?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900' },
  { test: /restaurant|waiter|dinner|jantar|garcom|pedido|menu/i, url: 'https://images.pexels.com/photos/370984/pexels-photo-370984.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900' },
  { test: /doctor|medical|clinic|hospital|medico|consulta|symptoms/i, url: 'https://images.pexels.com/photos/7579823/pexels-photo-7579823.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900' },
  { test: /business|negotiation|contract|client|corporate|negociando/i, url: 'https://images.pexels.com/photos/7433853/pexels-photo-7433853.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900' },
  { test: /academic|debate|university|education|intelligence|educacao/i, url: 'https://images.pexels.com/photos/8199151/pexels-photo-8199151.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900' },
  { test: /travel|airport|hotel|trip|viagem|aeroporto/i, url: 'https://images.pexels.com/photos/3769138/pexels-photo-3769138.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900' },
  { test: /conversation|people|friend|meeting|dialogue|english|aula|lesson/i, url: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=500&w=900' },
];

const DEFAULT_PHOTO_COVERS = PHOTO_COVERS.map((cover) => cover.url);

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = ((h << 5) - h + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seedFor(title: string, situation?: string, lessonId?: string): string {
  return `${lessonId || 'lesson'}-${hash(`${lessonId || ''}|${title}|${situation || ''}`)}`;
}

export function fallbackCoverImage(title: string, situation?: string, lessonId?: string): string {
  const haystack = `${title} ${situation || ''}`;
  const matched = PHOTO_COVERS.find((cover) => cover.test.test(haystack));
  if (matched) return matched.url;
  const seed = seedFor(title, situation, lessonId);
  return DEFAULT_PHOTO_COVERS[hash(seed) % DEFAULT_PHOTO_COVERS.length];
}

export function isLikelyBrokenCoverImageUrl(url?: string | null): boolean {
  const value = typeof url === 'string' ? url.trim() : '';
  if (!value) return false;
  return /loremflickr\.com|picsum\.photos|placeholder|undefined|null|data:image\/svg\+xml/i.test(value.replace(/\\/g, '')) || !/^(https?:\/\/|data:image\/|\/|blob:)/i.test(value);
}

export async function findCoverImage(title: string, situation?: string, lessonId?: string, avoidUrls: string[] = []): Promise<string> {
  try {
    const url = await getLessonCoverImage({ data: { title, situation, lessonId, avoidUrls } });
    return url && !isLikelyBrokenCoverImageUrl(url) ? url : fallbackCoverImage(title, situation, lessonId);
  } catch (_) {
    return fallbackCoverImage(title, situation, lessonId);
  }
}
