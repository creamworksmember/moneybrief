import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { SITE_URL, getAllPosts, guideUrl } from "@/lib/site";

/**
 * 사이트맵 — 요청 시점에 생성해요.
 *
 * 예전에는 `revalidate = 3600` 으로 1시간 ISR 을 기대했지만, 배포본에서는 재생성이 일어나지 않아
 * 2026-11-11 배포 시점 사이트맵이 그대로 남고 그 뒤 새 글이 빠졌어요. (sitemap.ts 는 기본적으로
 * 빌드 시 정적으로 굳어요 — Next 16 문서 metadata/sitemap.md)
 * connection() 으로 요청 시점 렌더링을 강제하고, 워드프레스 응답은 getAllPosts 안에서
 * 1시간 캐시하므로 크롤러가 자주 와도 워드프레스 부하는 그대로예요.
 *
 * 카테고리 필터 주소(/guides?cat=…)는 넣지 않아요. 그 페이지들의 canonical 이 /guides 라서
 * 사이트맵에 넣으면 "대표 주소가 아닌 주소"를 제출하는 셈이 돼요.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const posts = await getAllPosts();

  // 홈·가이드 목록은 최신 글이 바뀔 때 함께 바뀌므로 가장 최근 수정일을 씁니다.
  const latest = posts.reduce<Date | undefined>((acc, p) => {
    const d = new Date(p.modified);
    return !acc || d > acc ? d : acc;
  }, undefined);

  const statics: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/guides`, lastModified: latest, changeFrequency: "daily", priority: 0.9 },
    // 정적 페이지는 실제 수정일을 알 수 없어 lastModified 를 비워 둬요. (매번 "지금"을 넣으면 신호가 무의미해져요)
    { url: `${SITE_URL}/calculator`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about-lending`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const articles: MetadataRoute.Sitemap = posts.map((p) => ({
    url: guideUrl(p.slug),
    lastModified: new Date(p.modified),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...statics, ...articles];
}
