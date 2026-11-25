import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import ReadingProgress from "./ReadingProgress";
import ArticleRail from "./ArticleRail";
import Feedback from "./Feedback";
import HelpfulCount from "./HelpfulCount";
import { wpFetch, stripHtml, stripEmoji, cleanSummary, getMediaMap, catImage, GUIDE_CATEGORIES } from "@/lib/wp";
import { cleanBody } from "@/lib/body";
import { getTagNames } from "@/lib/wp";
import { guideUrl } from "@/lib/site";
import { geoOverride } from "@/lib/geo-overrides";
import { splitTitle } from "@/lib/title";
import JsonLd from "@/components/JsonLd";
import {
  abs,
  baseNodes,
  reviewerNode,
  breadcrumbNode,
  webPageNode,
  articleNode,
  extractFaqFromHtml,
  extractCitations,
  extractSourcesFromHtml,
  countWords,
  type Crumb,
} from "@/lib/schema";

type WpPost = {
  id: number;
  slug: string;
  title: { rendered: string };
  content?: { rendered: string };
  excerpt?: { rendered: string };
  date: string;
  modified: string;
  categories: number[];
  featured_media?: number;
  tags?: number[];
  acf?: { subtitle?: string; read_time?: number | string; sources?: string; helpful_count?: number };
};
type WpCat = { id: number; name: string };

async function getPost(slug: string): Promise<WpPost | null> {
  const arr = await wpFetch<WpPost[]>(
    `/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id,slug,title,content,excerpt,date,modified,categories,featured_media,tags,acf`,
  );
  return arr && arr[0] ? arr[0] : null;
}

function processBody(html: string) {
  const toc: { id: string; text: string }[] = [];
  let i = 0;
  // 굵은 글씨 소제목 → h2/h3, 빈 앵커 제거 (lib/body.ts)
  const out = cleanBody(html).replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, inner) => {
    i++;
    const id = `s${i}`;
    toc.push({ id, text: stripEmoji(stripHtml(inner)).trim() });
    const num = String(i).padStart(2, "0");
    return `<h2 id="${id}"><span style="color:var(--blue);font-size:0.8em;margin-right:12px;font-feature-settings:'tnum' 1">${num}</span>${inner}</h2>`;
  });
  return { html: out, toc };
}

const fmt = (iso: string) => (iso || "").slice(0, 10).replace(/-/g, ".");

const Chev = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "가이드 — money brief" };
  const title = splitTitle(stripHtml(post.title.rendered)).title;
  // 큐레이션 설명이 있으면 meta description 과 JSON-LD description 을 같은 문장으로 맞춰요.
  const curated = geoOverride(post.id).description;
  const desc =
    curated ||
    cleanSummary(post.excerpt?.rendered || "", 150) ||
    "money brief — 신용·대출·금융사기를 쉬운 말로, 정확하게 검증해 드립니다.";
  const media = await getMediaMap([post.featured_media || 0]);
  const ogCats =
    (await wpFetch<{ id: number; name: string }[]>(
      `/wp/v2/categories?include=${post.categories?.[0] || 0}&_fields=id,name`,
    )) || [];
  const ogImage =
    (post.featured_media && media[post.featured_media]) || catImage(ogCats[0]?.name || "");
  return {
    title: `${title} — money brief`,
    description: desc,
    alternates: { canonical: `/guides/${encodeURIComponent(slug)}` },
    openGraph: {
      title,
      description: desc,
      type: "article",
      url: `/guides/${encodeURIComponent(slug)}`,
      siteName: "money brief",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
  };
}

export default async function GuideDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const cats = (await wpFetch<WpCat[]>("/wp/v2/categories?per_page=100&_fields=id,name")) || [];
  const catName: Record<number, string> = {};
  const guideIds: number[] = [];
  for (const c of cats) {
    catName[c.id] = c.name;
    if (GUIDE_CATEGORIES.includes(c.name)) guideIds.push(c.id);
  }
  const catLabel = catName[post.categories?.[0]] || "";
  const readTime = Number(post.acf?.read_time) || 0;
  const { html, toc } = processBody(post.content?.rendered || "");
  // 제목에 부제가 이어 붙어 저장된 글이 있어 첫 문장까지만 제목으로 씁니다.
  const { title, subtitle: autoSubtitle } = splitTitle(stripHtml(post.title.rendered));
  const pageSubtitle = post.acf?.subtitle || autoSubtitle;
  // JSON-LD 설명문 — 이모지·"[…]" 를 걷어 낸 발췌 (meta description 과 같은 규칙)
  const summary = cleanSummary(post.excerpt?.rendered || "", 300);
  const helpfulCount = Number(post.acf?.helpful_count) || 0;

  const rel =
    (await wpFetch<WpPost[]>(
      `/wp/v2/posts?categories=${guideIds.join(",")}&exclude=${post.id}&per_page=3&_fields=id,slug,title,categories,featured_media,acf`,
    )) || [];

  // 대표 이미지(본문 hero + 관련글 썸네일)
  const media = await getMediaMap([post.featured_media || 0, ...rel.map((r) => r.featured_media || 0)]);
  const heroImage = (post.featured_media && media[post.featured_media]) || catImage(catLabel);

  /* ---------- 구조화 데이터(JSON-LD) ---------- */
  const cleanSlug = decodeURIComponent(post.slug);
  const pageUrl = guideUrl(cleanSlug);
  const rawBody = post.content?.rendered || "";
  // 사람이 큐레이션한 설명·키워드·FAQ가 있으면 우선 사용하고, 없으면 자동 생성으로 대체
  const geo = geoOverride(post.id);
  const faq = geo.faq?.length ? geo.faq : extractFaqFromHtml(rawBody);
  const tagNames = await getTagNames(post.tags || []);
  const keywords = geo.keywords?.length ? geo.keywords : tagNames;
  const schemaDesc = geo.description || summary;
  const crumbs: Crumb[] = [
    { name: "홈", path: "/" },
    { name: "금융가이드", path: "/guides" },
    ...(catLabel
      ? [{ name: catLabel, path: `/guides?cat=${encodeURIComponent(catLabel)}` }]
      : []),
    { name: title, path: `/guides/${encodeURIComponent(cleanSlug)}` },
  ];
  const jsonLd = [
    ...baseNodes(),
    reviewerNode(),
    breadcrumbNode(pageUrl, crumbs),
    webPageNode({
      url: pageUrl,
      name: title,
      description: schemaDesc,
      crumbs,
      datePublished: post.date,
      dateModified: post.modified,
      primaryImage: abs(heroImage),
      faq,
      reviewed: true,
    }),
    articleNode({
      url: pageUrl,
      // headline 은 반드시 화면 H1(워드프레스 제목)과 같아야 해요.
      headline: title,
      alternativeHeadline: pageSubtitle,
      description: schemaDesc,
      image: abs(heroImage),
      datePublished: post.date,
      dateModified: post.modified,
      section: catLabel,
      keywords,
      wordCount: countWords(rawBody),
      readMinutes: readTime,
      // 1순위: 본문 끝 "출처" 코너, 없으면 기존 출처 칸(acf.sources)
      citations: extractSourcesFromHtml(rawBody).length
        ? extractSourcesFromHtml(rawBody)
        : extractCitations(post.acf?.sources),
    }),
  ];

  return (
    <>
      <JsonLd nodes={jsonLd} />
      <ReadingProgress />

      <div className={styles.artHead}>
        <div className={styles.wrap}>
          <nav className={styles.crumb}>
            <Link href="/">홈</Link>
            <Chev />
            <Link href="/guides">금융가이드</Link>
            <Chev />
            <span>{catLabel}</span>
          </nav>
          <div className={styles.headInner}>
            <span className={styles.catPill}>{catLabel}</span>
            <h1>{title}</h1>
            {pageSubtitle && (
              <p className={styles.artSubtitle}>{pageSubtitle}</p>
            )}
            {summary && <p className={styles.deck}>{summary}</p>}
            <div className={styles.byline}>
              <div className={styles.who}>
                <span className={styles.a}>money brief 편집팀</span>
              </div>
              <span className={styles.vert} />
              <div className={styles.dates}>
                <span>발행 <span className="tnum">{fmt(post.date)}</span></span>
                <span>·</span>
                <span>읽는 시간 <span className="tnum">{readTime}</span>분</span>
                <span>·</span>
                <HelpfulCount slug={post.slug} count={helpfulCount} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.artHero}>
        <div className={styles.wrap}>
          <div className={styles.heroImg}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt="" />
          </div>
        </div>
      </div>

      <div className={styles.wrap}>
        <div className={styles.layout}>
          <div>
            <article className={styles.body} dangerouslySetInnerHTML={{ __html: html }} />

            {post.acf?.sources && (
              <div className={styles.sources}>
                <h3>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                  </svg>
                  출처
                </h3>
                <div dangerouslySetInnerHTML={{ __html: post.acf.sources }} />
              </div>
            )}

            <Feedback slug={post.slug} id={post.id} count={helpfulCount} />
          </div>

          <ArticleRail toc={toc} title={title} />
        </div>
      </div>

      {rel.length > 0 && (
        <div className={styles.related}>
          <div className={styles.wrap}>
            <h3>이어서 읽으면 좋은 글</h3>
            <div className={styles.relGrid}>
              {rel.map((r) => (
                <Link className={styles.relCard} href={`/guides/${decodeURIComponent(r.slug)}`} key={r.id}>
                  <div className={styles.relThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={(r.featured_media && media[r.featured_media]) || catImage(catName[r.categories?.[0]] || "")} alt="" />
                  </div>
                  <div className={styles.rb}>
                    <h4>{splitTitle(stripHtml(r.title.rendered)).title}</h4>
                    <div className={styles.relMeta}>
                      <span>{catName[r.categories?.[0]] || ""}</span>
                      <span>·</span>
                      <span>읽는 시간 {Number(r.acf?.read_time) || 0}분</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
