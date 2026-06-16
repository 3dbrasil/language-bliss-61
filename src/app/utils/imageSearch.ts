import { getLessonCoverImage } from '@/lib/lessonImages.functions';

export async function findCoverImage(title: string, situation?: string): Promise<string> {
  return getLessonCoverImage({ data: { title, situation } });
}
