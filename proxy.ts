/**
 * 없는 가이드 주소에 진짜 404 상태 코드를 돌려주기 위한 proxy.
 *
 * 왜 필요한가:
 *   app/loading.tsx · app/guides/[slug]/loading.tsx 가 있어서 페이지가 "스트리밍"으로 나가요.
 *   스트리밍이 시작되면 상태 코드(200)가 이미 전송돼서, 페이지 안의 notFound() 로는
 *   404 를 만들 수 없어요(Next 16 문서 streaming.md "Status codes"). 실제 사이트에서는 500 이 나가고 있었어요.
 *   proxy 는 렌더링 전에 실행되므로 여기서 걸러 내면 정상적인 404 가 나갑니다.
 *
 * 동작:
 *   워드프레스 공개 글 슬러그 목록을 5분간 메모리에 들고 있다가, 목록에 없는 슬러그면
 *   존재하지 않는 내부 경로로 rewrite → 루트 not-found 화면 + 404 상태 코드.
 *   목록에 없더라도 마지막 조회가 1분 이상 지났으면 한 번 더 조회해요(방금 올린 새 글 보호).
 *   워드프레스 조회에 실패하면 아무것도 막지 않고 그대로 통과시켜요(장애 시 정상 글이 404 가 되지 않게).
 */
import { NextResponse, type NextRequest } from "next/server";
import { wpUrl } from "@/lib/wp";

const TTL = 5 * 60_000;
const MIN_REFETCH = 60_000;

let slugs: Set<string> | null = null;
let fetchedAt = 0;
let inflight: Promise<void> | null = null;

const norm = (s: string) => {
  try {
    return decodeURIComponent(s).normalize("NFC").toLowerCase();
  } catch {
    return s.toLowerCase();
  }
};

async function loadSlugs(): Promise<void> {
  const next = new Set<string>();
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(wpUrl(`/wp/v2/posts?per_page=100&page=${page}&_fields=slug`), {
      cache: "no-store",
    });
    if (!res.ok) {
      // 마지막 페이지를 넘으면 워드프레스가 400 을 줘요. 첫 페이지 실패는 진짜 장애.
      if (page === 1) throw new Error(`WP ${res.status}`);
      break;
    }
    const batch = (await res.json()) as { slug: string }[];
    for (const p of batch) next.add(norm(p.slug));
    if (batch.length < 100) break;
  }
  slugs = next;
  fetchedAt = Date.now();
}

async function refresh(): Promise<boolean> {
  if (!inflight) {
    inflight = loadSlugs().finally(() => {
      inflight = null;
    });
  }
  try {
    await inflight;
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice("/guides/".length).replace(/\/$/, "");
  if (!slug) return NextResponse.next();

  const age = Date.now() - fetchedAt;
  if (!slugs || age > TTL) {
    if (!(await refresh()) && !slugs) return NextResponse.next();
  }
  if (slugs!.has(norm(slug))) return NextResponse.next();

  // 목록에 없음 — 새 글일 수 있으니 오래된 목록이면 한 번 더 확인
  if (Date.now() - fetchedAt > MIN_REFETCH) {
    if (!(await refresh())) return NextResponse.next();
    if (slugs!.has(norm(slug))) return NextResponse.next();
  }

  // 어떤 라우트에도 걸리지 않는 내부 경로 → 루트 not-found 화면이 404 상태로 렌더링돼요.
  return NextResponse.rewrite(new URL("/_guide-not-found", request.url), { status: 404 });
}

export const config = {
  // 가이드 상세만 대상. 프리페치 요청은 건너뛰어 워드프레스 부하를 줄여요.
  matcher: [
    {
      source: "/guides/:slug",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
