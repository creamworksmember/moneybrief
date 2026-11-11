/**
 * money brief — 구조화 데이터(JSON-LD) 엔티티 정의
 *
 * 설계 원칙
 *  1) 페이지마다 @graph 하나만 출력하고, 노드끼리는 @id 로 연결해요.
 *     (같은 회사를 페이지마다 새 엔티티로 반복 선언하면 검색엔진이 다른 실체로 오해할 수 있어요)
 *  2) 회사 정보는 여기 한 곳에서만 관리해요. Footer/About 화면 표기와 값이 반드시 같아야 해요.
 *  3) 화면에 없는 정보는 넣지 않아요. 구조화 데이터와 실제 화면이 다르면 스팸으로 판정될 수 있어요.
 */
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { stripHtml, decodeEntities } from "@/lib/wp";

export type Node = Record<string, unknown>;

/** 상대 경로를 절대 URL로. 구조화 데이터의 url/image 는 반드시 절대 경로여야 해요. */
export const abs = (u: string) => (u && u.startsWith("http") ? u : `${SITE_URL}${u || ""}`);

export const ORG_ID = `${SITE_URL}/#organization`;
// 법인(㈜바로크레디트대부) @id — 바로보다(baroboda.net)와 머니브리프가 "같은 값"을 공유해서 AI 가 한 회사로 합치게 한다.
// 바로보다 clients/barocredit/site.py 의 CORP_ID 와 반드시 동일해야 해요. (SITE_URL 에 묶지 않음)
export const PARENT_ORG_ID = "https://www.barocredit.com/#organization";
// 같은 법인이 운영하는 형제 사이트 — 법인 노드의 subOrganization 으로 선언
export const BAROBODA_ORG_ID = "https://baroboda.net/#org";
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const EDITORIAL_ID = `${SITE_URL}/#editorial-team`;
export const REVIEWER_ID = `${SITE_URL}/#reviewer`;
export const LOGO_ID = `${SITE_URL}/#logo`;

/* ------------------------------------------------------------------ *
 * sameAs — "이 채널들의 주인이 같은 실체"임을 선언
 *
 * 브랜드(money brief)와 운영사(㈜바로크레디트대부)는 다른 엔티티라서 따로 관리해요.
 * money brief 이름으로 운영하는 채널은 SAME_AS 에,
 * 회사(바로크레디트/바로바로론) 이름의 채널은 PARENT_SAME_AS 에 넣으세요.
 *
 * ⚠️ 넣기 전 확인: 직접 운영하는 공식 채널인가 / 그 페이지에 이름이 명시돼 있는가 / 지금 접속되는가.
 * 확인 안 된 URL은 넣지 말고 비워 두는 편이 안전해요.
 * ------------------------------------------------------------------ */
export const SAME_AS: string[] = [
  // money brief 브랜드 계정 (예: 네이버 블로그, 유튜브)
];

export const PARENT_SAME_AS: string[] = [
  "https://www.barocredit.com",
  "https://m.barocredit.com/",
  "https://www.youtube.com/@barobaroloan",
  "https://blog.naver.com/barobaroloan1899",
  // "https://www.instagram.com/____",
  // "https://map.naver.com/p/entry/place/____",
];

/* ------------------------------------------------------------------ *
 * 운영사 — ㈜바로크레디트대부
 * 값의 출처: components/Footer.tsx, app/about/page.tsx (화면 표기와 동일)
 * ------------------------------------------------------------------ */
/**
 * 사이트를 발행하는 주체 = 브랜드 money brief.
 * 실제 법인은 parentOrganization 으로 연결해요. (GEO 레퍼런스 구조 반영)
 */
export function organizationNode(): Node {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    alternateName: "머니브리프",
    url: `${SITE_URL}/`,
    description:
      "㈜바로크레디트대부가 운영하는 금융교육 콘텐츠 플랫폼. 신용관리·대출상식·금융생활·금융사기예방 정보를 쉽게 제공합니다.",
    logo: { "@id": LOGO_ID },
    image: { "@id": LOGO_ID },
    knowsAbout: [
      "신용관리",
      "개인신용평점",
      "대출",
      "대부업",
      "불법 사금융",
      "금융사기 예방",
      "보이스피싱",
      "DSR",
      "서민금융 지원제도",
      "채무조정",
    ],
    publishingPrinciples: `${SITE_URL}/about`,
    ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
    parentOrganization: { "@id": PARENT_ORG_ID },
  };
}

/**
 * 운영 법인 — ㈜바로크레디트대부.
 * 값의 출처: components/Footer.tsx, app/about/page.tsx (화면 표기와 반드시 동일해야 해요)
 */
export function parentOrganizationNode(): Node {
  return {
    "@type": ["Organization", "FinancialService"],
    "@id": PARENT_ORG_ID,
    name: "㈜바로크레디트대부",
    alternateName: ["바로크레디트대부", "바로바로론", "Baro Credit"],
    legalName: "주식회사 바로크레디트대부",
    url: "https://www.barocredit.com/",
    description:
      "금융감독원에 등록된 대부업·대부중개업체이며, 대출 브랜드 '바로바로론'과 정보 사이트 baroboda(바로보다)·금융교육 콘텐츠 브랜드 money brief를 운영합니다.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "영등포로 150 (당산동1가, 생각공장)",
      addressLocality: "영등포구",
      addressRegion: "서울특별시",
      postalCode: "07292",
      addressCountry: "KR",
    },
    telephone: "+82-1899-8500",
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+82-1899-8500",
        contactType: "customer service",
        areaServed: "KR",
        availableLanguage: ["Korean"],
      },
      {
        "@type": "ContactPoint",
        telephone: "+82-2-2093-6111",
        contactType: "금융소비자보호",
        name: "보호감시인",
        areaServed: "KR",
        availableLanguage: ["Korean"],
      },
    ],
    identifier: [
      { "@type": "PropertyValue", name: "사업자등록번호", value: "210-81-42659" },
      {
        "@type": "PropertyValue",
        name: "대부업·대부중개업 등록번호",
        value: "2016-금감원-0006",
      },
    ],
    // 감독기관 등록 사실 — 합법 등록업체임을 기계가 읽을 수 있는 형태로 선언
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "대부업·대부중개업 등록",
      identifier: "2016-금감원-0006",
      recognizedBy: {
        "@type": "GovernmentOrganization",
        name: "금융감독원",
        url: "https://www.fss.or.kr",
      },
    },
    areaServed: { "@type": "Country", name: "대한민국" },
    subOrganization: [{ "@id": ORG_ID }, { "@id": BAROBODA_ORG_ID }],
    sameAs: PARENT_SAME_AS,
  };
}

/**
 * 로고 노드.
 * 구글의 Organization logo 는 SVG 를 받지 않아요(.png/.jpg/.gif 만 인정).
 * 그래서 화면용 SVG 와 별개로 래스터 PNG 를 구조화 데이터 전용으로 씁니다.
 */
export function logoNode(): Node {
  return {
    "@type": "ImageObject",
    "@id": LOGO_ID,
    url: `${SITE_URL}/logo.png`,
    contentUrl: `${SITE_URL}/logo.png`,
    width: 704,
    height: 128,
    caption: SITE_NAME,
  };
}

/** 편집팀 — 아티클의 author */
export function editorialNode(): Node {
  return {
    "@type": "Organization",
    "@id": EDITORIAL_ID,
    name: "money brief 편집팀",
    url: `${SITE_URL}/`,
    description:
      "법령·금융감독원 공식 자료·공인 통계를 근거로 금융교육 콘텐츠를 제작하고 검증하는 팀이에요.",
    parentOrganization: { "@id": ORG_ID },
  };
}

/** 감수자 — 금융소비자보호 담당(보호감시인) */
export function reviewerNode(): Node {
  return {
    "@type": "Person",
    "@id": REVIEWER_ID,
    name: "김인호",
    jobTitle: "보호감시인(금융소비자보호 담당)",
    worksFor: { "@id": ORG_ID },
    telephone: "+82-2-2093-6111",
  };
}

export function websiteNode(): Node {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    alternateName: "머니브리프",
    description:
      "신용관리, 대출상식, 금융생활, 금융사기예방을 쉽게 풀어주는 금융교육 콘텐츠와 금융계산기를 제공합니다.",
    publisher: { "@id": ORG_ID },
    inLanguage: "ko-KR",
  };
}

/** 모든 페이지가 공통으로 싣는 앵커 노드 */
export const baseNodes = (): Node[] => [
  organizationNode(),
  parentOrganizationNode(),
  logoNode(),
  websiteNode(),
  editorialNode(),
];

/* ------------------------------------------------------------------ *
 * 페이지 단위 노드
 * ------------------------------------------------------------------ */
export type Crumb = { name: string; path: string };

export function breadcrumbNode(url: string, crumbs: Crumb[]): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.path.startsWith("http") ? c.path : `${SITE_URL}${c.path}`,
    })),
  };
}

export type FaqItem = { q: string; a: string };

export function webPageNode(opts: {
  url: string;
  type?: string | string[];
  name: string;
  description?: string;
  crumbs?: Crumb[];
  datePublished?: string;
  dateModified?: string;
  primaryImage?: string;
  faq?: FaqItem[];
  reviewed?: boolean;
}): Node {
  const node: Node = {
    "@type": opts.faq && opts.faq.length
      ? [...(Array.isArray(opts.type) ? opts.type : [opts.type || "WebPage"]), "FAQPage"]
      : opts.type || "WebPage",
    "@id": `${opts.url}#webpage`,
    url: opts.url,
    name: opts.name,
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: "ko-KR",
  };
  if (opts.description) node.description = opts.description;
  if (opts.crumbs?.length) node.breadcrumb = { "@id": `${opts.url}#breadcrumb` };
  if (opts.datePublished) node.datePublished = opts.datePublished;
  if (opts.dateModified) node.dateModified = opts.dateModified;
  if (opts.primaryImage) {
    node.primaryImageOfPage = {
      "@type": "ImageObject",
      "@id": `${opts.url}#primaryimage`,
      url: opts.primaryImage,
      contentUrl: opts.primaryImage,
    };
  }
  if (opts.reviewed) node.reviewedBy = { "@id": REVIEWER_ID };
  if (opts.faq?.length) {
    node.mainEntity = opts.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    }));
  }
  return node;
}

export function articleNode(opts: {
  url: string;
  headline: string;
  alternativeHeadline?: string;
  description?: string;
  image?: string;
  datePublished: string;
  dateModified: string;
  section?: string;
  keywords?: string[];
  wordCount?: number;
  readMinutes?: number;
  citations?: { name: string; url?: string }[];
}): Node {
  const node: Node = {
    // 레퍼런스(moneybrief-geo)와 동일하게 BlogPosting 사용. Article 의 하위 타입이에요.
    "@type": "BlogPosting",
    "@id": `${opts.url}#article`,
    isPartOf: { "@id": `${opts.url}#webpage` },
    mainEntityOfPage: { "@id": `${opts.url}#webpage` },
    // 구글은 headline 110자 초과를 무시해요.
    headline: opts.headline.slice(0, 110),
    author: { "@id": EDITORIAL_ID },
    publisher: { "@id": ORG_ID },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    isFamilyFriendly: true,
  };
  if (opts.alternativeHeadline) node.alternativeHeadline = opts.alternativeHeadline;
  if (opts.description) node.description = opts.description;
  if (opts.image) node.image = [opts.image];
  if (opts.section) {
    node.articleSection = opts.section;
    node.about = { "@type": "Thing", name: opts.section };
  }
  if (opts.keywords?.length) node.keywords = opts.keywords.join(", ");
  if (opts.wordCount) node.wordCount = opts.wordCount;
  if (opts.readMinutes) node.timeRequired = `PT${opts.readMinutes}M`;
  if (opts.citations?.length) {
    node.citation = opts.citations.map((c) =>
      c.url
        ? { "@type": "CreativeWork", name: c.name, url: c.url }
        : { "@type": "CreativeWork", name: c.name },
    );
  }
  return node;
}

export function webApplicationNode(url: string): Node {
  return {
    "@type": "WebApplication",
    "@id": `${url}#app`,
    name: "money brief 금융계산기",
    url,
    applicationCategory: "FinanceApplication",
    applicationSubCategory: "대출 계산기",
    operatingSystem: "All",
    browserRequirements: "JavaScript를 지원하는 최신 브라우저",
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
    featureList: [
      "원리금균등·원금균등·만기일시 상환 방식 비교",
      "대출이자 총액 계산",
      "DSR(총부채원리금상환비율) 계산",
      "중도상환수수료 계산",
    ],
    provider: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
  };
}

export function itemListNode(
  url: string,
  items: { name: string; url: string }[],
): Node {
  return {
    "@type": "ItemList",
    "@id": `${url}#itemlist`,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

/* ------------------------------------------------------------------ *
 * 워드프레스 본문에서 FAQ 자동 추출
 *
 * 에디터가 본문에 "제목 3(H3)"으로 질문형 문장을 쓰면
 * 다음 제목이 나오기 전까지의 문단을 답변으로 묶어 FAQ 스키마를 만들어요.
 * 별도 입력 필드가 필요 없어요.
 * ------------------------------------------------------------------ */
const QUESTION_TAIL =
  /(\?|나요|가요|까요|는가|은가|인가|할까|될까|무엇|어떻게|왜|어디서|언제|얼마)\s*$/;

/**
 * 본문 끝의 "자주 묻는 질문" 코너(Q. … / A. …)를 FAQ로 변환.
 * 소제목(H3)이 아니라 굵은 글씨 문단으로 쓰인 형식이라 아래 H3 추출로는 잡히지 않아요.
 * 화면에 보이는 질문·답변을 그대로 쓰므로 구조화 데이터와 화면 내용이 항상 일치해요.
 * A. 표시가 없는 질문은 답변을 알 수 없어 건너뜁니다.
 */
const EMOJI = /[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u27BF\uFE0F\u200D]/g;

export function extractQaFromHtml(html: string, limit = 10): FaqItem[] {
  if (!html) return [];
  const text = decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|h[1-6]|div|ul|ol|figure)>/gi, "\n\n")
      .replace(/<[^>]+>/g, ""),
  ).replace(/\r/g, "");
  const marker = text.search(/자주\s*묻는\s*질문/);
  if (marker < 0) return [];
  const lines = text.slice(marker).replace(/^[^\n]*\n/, "").split("\n");

  const out: FaqItem[] = [];
  let cur: { q: string; a: string } | null = null;
  let mode: "q" | "a" | null = null;
  const clean = (s: string) => s.replace(EMOJI, "").replace(/\s+/g, " ").trim();
  const flush = () => {
    if (cur && cur.q && cur.a.trim().length >= 10) {
      out.push({ q: clean(cur.q), a: clean(cur.a).slice(0, 900) });
    }
    cur = null;
    mode = null;
  };

  for (const raw of lines) {
    const l = raw.trim();
    if (/^Q\s*[.:)]/.test(l)) {
      flush();
      cur = { q: l.replace(/^Q\s*[.:)]\s*/, ""), a: "" };
      mode = "q";
      continue;
    }
    if (cur && /^A\s*[.:)]/.test(l)) {
      cur.a = l.replace(/^A\s*[.:)]\s*/, "");
      mode = "a";
      continue;
    }
    if (!cur) continue;
    if (l === "") {
      // 답변이 끝난 뒤 빈 줄이 나오면 그 항목은 종료(뒤따르는 안내문이 섞이지 않게)
      if (mode === "a" && cur.a) flush();
      continue;
    }
    if (mode === "q") cur.q += " " + l;
    else if (mode === "a") cur.a += " " + l;
  }
  flush();
  return out.slice(0, limit);
}

export function extractFaqFromHtml(html: string, limit = 10): FaqItem[] {
  if (!html) return [];
  // 1순위: 본문 끝 "자주 묻는 질문" 코너(Q./A.). 없으면 아래 H3 방식으로 대체.
  const qa = extractQaFromHtml(html, limit);
  if (qa.length) return qa;
  const out: FaqItem[] = [];
  // H3 위치를 모두 찾고, 그 다음 제목(h2/h3) 전까지를 답변 본문으로 봅니다.
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  const heads: { q: string; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    heads.push({ q: stripHtml(m[1]), end: m.index + m[0].length });
  }
  for (let i = 0; i < heads.length; i++) {
    const q = heads[i].q.replace(/^\s*Q\s*[.:)]?\s*/i, "").trim();
    if (!q || !QUESTION_TAIL.test(q)) continue;
    const nextIdx = html.slice(heads[i].end).search(/<h[23][^>]*>/i);
    const chunk =
      nextIdx === -1
        ? html.slice(heads[i].end)
        : html.slice(heads[i].end, heads[i].end + nextIdx);
    const a = stripHtml(chunk).replace(/\s+/g, " ").trim();
    if (a.length < 20) continue;
    out.push({ q, a: a.slice(0, 900) });
    if (out.length >= limit) break;
  }
  return out;
}

/** acf.sources(HTML)에서 출처 목록을 뽑아 citation 으로 변환 */
export function extractCitations(html?: string): { name: string; url?: string }[] {
  if (!html) return [];
  const out: { name: string; url?: string }[] = [];
  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const name = stripHtml(m[2]);
    if (name) out.push({ name, url: m[1] });
  }
  if (out.length) return out.slice(0, 12);
  // 링크가 없으면 줄 단위 텍스트를 출처명으로 사용
  return stripHtml(html)
    .split(/\n|·|,/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, 12)
    .map((name) => ({ name }));
}

/**
 * 본문 끝의 "출처" 코너를 인용(citation) 목록으로 변환.
 * 문단 전체가 "출처"(또는 "참고 자료")뿐인 줄 바로 뒤의 글머리 목록(li)을 읽어요.
 * 링크가 있으면 이름+주소, 없으면 이름만 담아요.
 * "출처를 알 수 없는 앱 설치"처럼 본문 속에 섞인 단어는 문단 전체가 "출처"일 때만 인식하므로 걸리지 않아요.
 */
export function extractSourcesFromHtml(html: string): { name: string; url?: string }[] {
  if (!html) return [];
  const head =
    /<(p|h[2-6]|div)[^>]*>(?:<[^>]+>|\s|[^\s<>\w가-힣])*(?:출처|참고\s*자료|출처\s*및\s*참고\s*자료)(?:<[^>]+>|\s)*<\/\1>/i;
  const m = head.exec(html);
  if (!m) return [];
  const rest = html.slice(m.index + m[0].length);
  const out: { name: string; url?: string }[] = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let li: RegExpExecArray | null;
  while ((li = liRe.exec(rest)) !== null && out.length < 12) {
    const a = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(li[1]);
    const name = stripHtml(a ? a[2] : li[1]).replace(/\s+/g, " ").trim();
    if (!name) continue;
    out.push(a ? { name, url: a[1] } : { name });
  }
  return out;
}

/** 본문 글자 수(한국어 기준 대략치) */
export const countWords = (html: string) => stripHtml(html).replace(/\s+/g, "").length;

/** @graph 한 덩어리로 직렬화 */
export const graph = (nodes: Node[]) => ({
  "@context": "https://schema.org",
  "@graph": nodes.filter(Boolean),
});
