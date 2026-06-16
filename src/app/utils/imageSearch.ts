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
  return `https://picsum.photos/seed/${encodeURIComponent(seedFor(title, situation, lessonId))}/900/500`;
}

export async function findCoverImage(title: string, situation?: string, lessonId?: string, avoidUrls: string[] = []): Promise<string> {
  try {
    const url = await getLessonCoverImage({ data: { title, situation, lessonId, avoidUrls } });
    return url || fallbackCoverImage(title, situation, lessonId);
  } catch (_) {
    return fallbackCoverImage(title, situation, lessonId);
  }
}
