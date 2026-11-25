// WordPress REST helpers
const WP = (process.env.WORDPRESS_API_URL || "http://localhost:8080/wp-json").replace(/\/$/, "");

export const wpUrl = (path: string) => `${WP}${path}`;

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&middot;/g, "·")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export const stripHtml = (s: string) =>
  decodeEntities((s || "").replace(/<[^>]+>/g, "")).trim();

/** 그림 이모지(🎓·✅·⚠️ 등)와 이모지 조합 문자. 화살표·괄호 숫자(①) 같은 일반 기호는 건드리지 않아요. */
const EMOJI_CHARS = "\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{FE0F}\\u{200D}\\u{20E3}";
const EMOJI_RE = new RegExp(`[${EMOJI_CHARS}]`, "gu");
/** 문자열이 그림 이모지로 시작하는지 (소제목 판별용) */
export const EMOJI_AT_START = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
export const stripEmoji = (s: string) => (s || "").replace(EMOJI_RE, "");

/**
 * 검색결과·JSON-LD 설명문용 요약 정리.
 * 워드프레스 자동 발췌는 이모지·줄바꿈 붙음("있죠.바로")·끝의 "[…]"가 섞여 그대로 쓰기 어려워요.
 * 이모지와 "[…]"를 지우고, 문장 단위로 max 글자 안에서 자릅니다.
 */
export function cleanSummary(html: string, max = 160): string {
  const t = stripEmoji(
    decodeEntities((html || "").replace(/<br\s*\/?>|<\/p>/gi, " ").replace(/<[^>]+>/g, "")),
  )
    .replace(/\[\s*(…|\.\.\.)\s*\]/g, "")
    .replace(/([.?!])(?=[가-힣A-Za-z“"‘'])/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  // 마지막 문장 끝(. ? ! 뒤에 닫는 따옴표가 올 수 있음) 위치
  let end = -1;
  for (const m of cut.matchAll(/[.?!][”"’']?(?=\s)/g)) end = m.index + m[0].length;
  if (end > max * 0.5) return cut.slice(0, end);
  const sp = cut.lastIndexOf(" ");
  return (sp > 0 ? cut.slice(0, sp) : cut).trim() + "…";
}

export async function wpFetch<T>(path: string): Promise<T | null> {
  try {
    // 워드프레스 응답을 60초 동안 저장해 두고 재사용해요. (새 글·수정 내용은 최대 1분 뒤 반영)
    const res = await fetch(wpUrl(path), { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// featured_media(대표 이미지) ID들을 source_url로 해석. 한 번의 호출로 일괄 조회.
export async function getMediaMap(ids: number[]): Promise<Record<number, string>> {
  const uniq = [...new Set(ids.filter((n) => n && n > 0))];
  if (!uniq.length) return {};
  const media =
    (await wpFetch<{ id: number; source_url: string }[]>(
      `/wp/v2/media?include=${uniq.join(",")}&per_page=100&_fields=id,source_url`,
    )) || [];
  const map: Record<number, string> = {};
  for (const m of media) map[m.id] = m.source_url;
  return map;
}

/** 태그 ID -> 이름. Article 스키마의 keywords 로 씁니다. */
export async function getTagNames(ids: number[]): Promise<string[]> {
  const uniq = [...new Set((ids || []).filter((n) => n && n > 0))];
  if (!uniq.length) return [];
  const tags =
    (await wpFetch<{ id: number; name: string }[]>(
      `/wp/v2/tags?include=${uniq.join(",")}&per_page=100&_fields=id,name`,
    )) || [];
  return tags.map((t) => decodeEntities(t.name)).filter(Boolean);
}

export const GUIDE_CATEGORIES = [
  "신용관리",
  "대출상식",
  "금융생활",
  "금융사기예방",
  "금융이슈·인사이트",
];

// 대표 이미지가 없는 글에 쓰는 카테고리별 기본 커버
const CAT_IMAGE: Record<string, string> = {
  신용관리: "/img/cat/credit.webp",
  대출상식: "/img/cat/loan.webp",
  금융생활: "/img/cat/life.webp",
  금융사기예방: "/img/cat/fraud.webp",
  "금융이슈·인사이트": "/img/cat/issue.webp",
};
export const catImage = (cat: string) => CAT_IMAGE[cat] || "/img/guide-article.webp";
