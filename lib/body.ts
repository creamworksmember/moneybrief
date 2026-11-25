/**
 * 워드프레스 본문 HTML 정리 — 화면 렌더링 직전에 적용해요.
 *
 * 현재 에디터들이 소제목을 "제목 2" 블록이 아니라 굵은 글씨 문단으로 쓰고 있어요.
 *   <p><strong>🧮 먼저, 내 학자금 대출부터 알아봐요<br></strong>본문…</p>
 * 이러면 페이지에 <h2> 가 하나도 없어서 목차가 비고, 검색엔진·AI 가 글을 섹션 단위로
 * 나누지 못해요. 그래서 이 패턴을 진짜 소제목(h2/h3)으로 바꿔 줍니다.
 *
 * 본문에 <h2> 가 이미 하나라도 있으면(에디터가 제목 블록을 쓰기 시작하면) 손대지 않아요.
 * FAQ·출처 추출은 원본 HTML 기준이라 이 변환과 무관해요.
 */
import { stripHtml, stripEmoji, EMOJI_AT_START } from "@/lib/wp";

/** href 없는 <a> — 구글 문서에서 붙여넣을 때 딸려 오는 빈 앵커. 내용만 남겨요. */
export const unwrapBareAnchors = (html: string) =>
  html.replace(/<a(?![^>]*\bhref=)[^>]*>([\s\S]*?)<\/a>/gi, "$1");

/** 하위 소제목(h3)으로 볼 머리말: 1. / 1단계 / ①~⑳ / 1️⃣ / 📌 */
const SUB_HEAD = /^(\d+\s*(\.|단계)|[①-⑳]|\d️?⃣|\u{1F4CC})/u;
/** 강조 문단이지만 소제목이 아닌 것: FAQ 의 Q./A., 대시로 시작하는 목록 */
const NOT_HEAD = /^(Q|A)\s*[.:)]|^[–\-•※]/;

function headingLevel(text: string): 2 | 3 | 0 {
  if (!text || text.length > 80 || NOT_HEAD.test(text)) return 0;
  if (stripEmoji(text).replace(/^[\d.\s①-⑳]+/, "").trim().length < 2) return 0;
  if (SUB_HEAD.test(text)) return 3;
  if (EMOJI_AT_START.test(text)) return 2;
  return 0;
}

export function promoteBoldHeadings(html: string): string {
  if (/<h2[\s>]/i.test(html)) return html;
  return html.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi, (whole, attrs = "", inner: string) => {
    // "<br></strong>" 처럼 줄바꿈이 굵은 글씨 안에 있는 경우를 "</strong><br>" 로 정규화
    const norm = inner.replace(/(<br\s*\/?>)(\s*)<\/strong>/gi, "</strong>$1");
    const br = norm.search(/<br\s*\/?>/i);
    const head = br < 0 ? norm : norm.slice(0, br);
    // 머리말은 굵은 글씨 덩어리로만 이뤄져야 해요 (문장 중간의 강조는 제외)
    if (!/^\s*(<strong>[\s\S]*?<\/strong>\s*)+$/i.test(head)) return whole;
    const text = stripHtml(head).replace(/\s+/g, " ").trim();
    const level = headingLevel(text);
    if (!level) return whole;
    const body = br < 0 ? "" : norm.slice(br).replace(/^(\s*<br\s*\/?>)+/i, "").trim();
    const h = `<h${level}>${head.replace(/<\/?strong>/gi, "").replace(/\s+/g, " ").trim()}</h${level}>`;
    return stripHtml(body) || /<img/i.test(body) ? `${h}\n<p${attrs}>${body}</p>` : h;
  });
}

export const cleanBody = (html: string) => promoteBoldHeadings(unwrapBareAnchors(html || ""));
