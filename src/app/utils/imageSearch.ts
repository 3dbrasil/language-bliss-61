import { getLessonCoverImage } from '@/lib/lessonImages.functions';
import catAchievement from '@/assets/cat-achievement.jpg';
import catConversation from '@/assets/cat-conversation.jpg';
import catPronunciation from '@/assets/cat-pronunciation.jpg';
import conceptUnified from '@/assets/concept-unified.jpg';
import landingHero from '@/assets/landing-hero.jpg';
import mapBanner from '@/assets/map-banner.jpg';

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
  const covers = [catConversation, catPronunciation, catAchievement, conceptUnified, landingHero, mapBanner];
  return covers[hash(seed) % covers.length];
}

export function isLikelyBrokenCoverImageUrl(url?: string | null): boolean {
  const value = typeof url === 'string' ? url.trim() : '';
  if (!value) return false;
  return /loremflickr\.com|placeholder|undefined|null|data:image\/svg\+xml/i.test(value.replace(/\\/g, '')) || !/^(https?:\/\/|data:image\/|\/|blob:)/i.test(value);
}

export async function findCoverImage(title: string, situation?: string, lessonId?: string, avoidUrls: string[] = []): Promise<string> {
  try {
    const url = await getLessonCoverImage({ data: { title, situation, lessonId, avoidUrls } });
    return url && !isLikelyBrokenCoverImageUrl(url) ? url : fallbackCoverImage(title, situation, lessonId);
  } catch (_) {
    return fallbackCoverImage(title, situation, lessonId);
  }
}
