/**
 * 계산기 아래 설명 글 + 자주 묻는 질문 + 참고 자료 (서버 컴포넌트).
 * FAQ 는 <details> 로 접어 두되 내용은 HTML 에 그대로 있어서, 크롤러·AI 가 바로 읽을 수 있어요.
 * 원본 데이터: ./guide.ts (FAQ 구조화 데이터와 같은 원본)
 */
import styles from "./CalcGuide.module.css";
import { GUIDE_SECTIONS, CALC_FAQS, GUIDE_SOURCES, GUIDE_AS_OF, RATE_CAVEAT, type Block } from "./guide";

const asOfLabel = GUIDE_AS_OF.replace(/-/g, ".");

function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case "p":
      return <p>{b.text}</p>;
    case "formula":
      return <p className={styles.formula}>{b.text}</p>;
    case "list":
      return (
        <ul>
          {b.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                {b.head.map((h) => (
                  <th key={h} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r) => (
                <tr key={r[0]}>
                  {r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "note":
      return (
        <div className={styles.note}>
          <strong>{b.title}</strong>
          <ul>
            {b.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      );
  }
}

export default function CalcGuide() {
  return (
    <section className={styles.guide} aria-labelledby="calc-guide-title">
      <div className={styles.wrap}>
        <h2 id="calc-guide-title" className={styles.title}>계산기, 이렇게 읽어 보세요</h2>
        <p className={styles.asOf}>
          제도·수치는 <time dateTime={GUIDE_AS_OF}>{asOfLabel}</time> 기준이에요. 예시는 이해를 돕기 위한 단순 계산이에요.
        </p>
        <p className={styles.caveat}>※ {RATE_CAVEAT}</p>

        {GUIDE_SECTIONS.map((s) => (
          <article key={s.key} id={`guide-${s.key}`} className={styles.section}>
            <h2>{s.title}</h2>
            <p className={styles.lead}>{s.lead}</p>
            {s.blocks.map((b, i) => (
              <BlockView key={i} b={b} />
            ))}
          </article>
        ))}

        <div className={styles.section} id="guide-faq">
          <h2>자주 묻는 질문</h2>
          {CALC_FAQS.map((f) => (
            <details key={f.q} className={styles.faq}>
              <summary>
                <span className={styles.qBadge}>Q</span>
                {f.q}
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>

        <div className={styles.sources}>
          <h3>참고 자료</h3>
          <ul>
            {GUIDE_SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
          <p>본 내용은 일반적인 금융 정보 제공을 목적으로 하며 특정 상품을 권유하지 않아요. {RATE_CAVEAT} 정확한 조건은 이용하려는 금융회사에 확인해 주세요.</p>
        </div>
      </div>
    </section>
  );
}
