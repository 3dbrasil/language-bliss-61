import { getLessonCoverImage } from '@/lib/lessonImages.functions';

export async function findCoverImage(title: string, situation?: string, lessonId?: string, avoidUrls: string[] = []): Promise<string> {
  return getLessonCoverImage({ data: { title, situation, lessonId, avoidUrls } });
}
