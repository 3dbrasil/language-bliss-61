import coffeeShopCover from "@/assets/lesson-covers/coffee-shop.jpg";
import firstDayWorkCover from "@/assets/lesson-covers/first-day-work.jpg";
import groceryStoreCover from "@/assets/lesson-covers/grocery-store.jpg";
import cityDirectionsCover from "@/assets/lesson-covers/city-directions.jpg";
import restaurantOrderCover from "@/assets/lesson-covers/restaurant-order.jpg";
import doctorOfficeCover from "@/assets/lesson-covers/doctor-office.jpg";
import jobInterviewCover from "@/assets/lesson-covers/job-interview.jpg";
import businessNegotiationCover from "@/assets/lesson-covers/business-negotiation.jpg";
import academicDebateCover from "@/assets/lesson-covers/academic-debate.jpg";
import travelConversationCover from "@/assets/lesson-covers/travel-conversation.jpg";

const PHOTO_COVERS = [
  {
    test: /coffee|cafe|cafeteria|barista|latte|espresso/i,
    url: coffeeShopCover,
  },
  {
    test: /first day|office|work|empresa|trabalho|co-?worker/i,
    url: firstDayWorkCover,
  },
  {
    test: /grocery|store|market|supermercado|compras|ingredients|pasta/i,
    url: groceryStoreCover,
  },
  {
    test: /directions|subway|city|street|cidade|rua|metro|station/i,
    url: cityDirectionsCover,
  },
  {
    test: /restaurant|waiter|dinner|jantar|garcom|pedido|menu/i,
    url: restaurantOrderCover,
  },
  {
    test: /doctor|medical|clinic|hospital|medico|consulta|symptoms/i,
    url: doctorOfficeCover,
  },
  {
    test: /job|interview|startup|entrevista|developer|desenvolvedor/i,
    url: jobInterviewCover,
  },
  {
    test: /business|negotiation|contract|client|corporate|negociando|proposal/i,
    url: businessNegotiationCover,
  },
  {
    test: /academic|debate|university|education|intelligence|educacao/i,
    url: academicDebateCover,
  },
  {
    test: /travel|airport|hotel|trip|viagem|aeroporto/i,
    url: travelConversationCover,
  },
  {
    test: /conversation|people|friend|meeting|dialogue|english|aula|lesson/i,
    url: travelConversationCover,
  },
];

const DEFAULT_PHOTO_COVERS = PHOTO_COVERS.map((cover) => cover.url);

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = ((h << 5) - h + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seedFor(title: string, situation?: string, lessonId?: string): string {
  return `${lessonId || "lesson"}-${hash(`${lessonId || ""}|${title}|${situation || ""}`)}`;
}

export function fallbackCoverImage(title: string, situation?: string, lessonId?: string): string {
  const haystack = `${title} ${situation || ""}`;
  const matched = PHOTO_COVERS.find((cover) => cover.test.test(haystack));
  if (matched) return matched.url;
  const seed = seedFor(title, situation, lessonId);
  return DEFAULT_PHOTO_COVERS[hash(seed) % DEFAULT_PHOTO_COVERS.length];
}

export function isLikelyBrokenCoverImageUrl(url?: string | null): boolean {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) return false;
  return (
    /images\.pexels\.com|images\.unsplash\.com|loremflickr\.com|picsum\.photos|placeholder|undefined|null|data:image\/svg\+xml/i.test(
      value.replace(/\\/g, ""),
    ) || !/^(https?:\/\/|data:image\/|\/|blob:)/i.test(value)
  );
}

export async function findCoverImage(
  title: string,
  situation?: string,
  lessonId?: string,
  avoidUrls: string[] = [],
): Promise<string> {
  return fallbackCoverImage(title, situation, lessonId);
}
