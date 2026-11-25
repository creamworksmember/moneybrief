// 사이트 공통 상수 + 사이트맵/llms.txt 가 함께 쓰는 글 목록 조회
import { wpUrl, stripHtml, cleanSummary, GUIDE_CATEGORIES } from "@/lib/wp";
import { mainTitle } from "@/lib/title";

export const SITE_URL = (process.env.SITE_URL || "https://www.moneybrief.net").replace(/\/$/, "");
export const SITE_NAME = "money brief";

export type SitePost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cat: string;
  date: string;
  modified: string;
};

type WpCat = { id: number; name: string };
/**
 * sitemap / llms.txt 전용 fetch.
 * lib/wp.ts 의 wpFetch 는 cache:"no-store" 라서 라우트의 revalidate 설정과 충돌해요.
 * 여기서는 1시간 ISR 캐시를 써서 크롤러가 자주 때려도 WordPress 부하가 없게 합니다.
 */
async function wpCached<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(wpUrl(path), { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type WpPost = {
  id: number;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  modified: string;
  categories: number[];
};

/** 가이드 카테고리에 속한 공개 글 전체 (페이지네이션 포함, 최신순) */
export async function getAllPosts(): Promise<SitePost[]> {
  const cats = (await wpCached<WpCat[]>("/wp/v2/categories?per_page=100&_fields=id,name")) || [];
  const catName: Record<number, string> = {};
  const ids: number[] = [];
  for (const c of cats) {
    catName[c.id] = c.name;
    if (GUIDE_CATEGORIES.includes(c.name)) ids.push(c.id);
  }
  if (!ids.length) return [];

  const out: SitePost[] = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await wpCached<WpPost[]>(
      `/wp/v2/posts?categories=${ids.join(",")}&per_page=100&page=${page}&orderby=date&order=desc&_fields=id,slug,title,excerpt,date,modified,categories`,
    );
    if (!batch || !batch.length) break;
    for (const p of batch) {
      out.push({
        id: p.id,
        slug: decodeURIComponent(p.slug),
        // llms.txt 목록에도 부제가 붙은 제목이 그대로 나가지 않게 첫 문장만 사용
        title: mainTitle(stripHtml(p.title?.rendered || "")),
        excerpt: cleanSummary(p.excerpt?.rendered || "", 160),
        cat: (p.categories || []).map((id) => catName[id]).find((n) => GUIDE_CATEGORIES.includes(n)) || "",
        date: p.date,
        modified: p.modified || p.date,
      });
    }
    if (batch.length < 100) break;
  }
  return out;
}

/** 사이트맵·JSON-LD용 — 퍼센트 인코딩 (XML 사이트맵 규격 요구사항) */
export const guideUrl = (slug: string) => `${SITE_URL}/guides/${encodeURIComponent(slug)}`;

/**
 * llms.txt용 — 한글을 그대로 노출.
 * 같은 URL이지만 사람이 읽는 문서에서는 인코딩되지 않은 쪽이 훨씬 읽기 쉽고,
 * 레퍼런스(moneybrief-geo/llms.txt) 표기와도 일치해요.
 */
export const guideUrlReadable = (slug: string) => `${SITE_URL}/guides/${slug}`;
