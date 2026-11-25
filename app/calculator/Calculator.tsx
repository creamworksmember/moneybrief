"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { RATE_CAVEAT } from "./guide";

/* ===== formatting + finance helpers ===== */
const comma = (n: number) => n.toLocaleString("ko-KR");
const won = (n: number) => Math.round(n).toLocaleString("ko-KR");
const manToWon = (m: number) => m * 10000;

const annuityPay = (P: number, i: number, n: number) =>
  i === 0 ? P / n : (P * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
const annuityTotalInt = (P: number, i: number, n: number) => annuityPay(P, i, n) * n - P;
const principalTotalInt = (P: number, i: number, n: number) => (i * P * (n + 1)) / 2;
const bulletTotalInt = (P: number, i: number, n: number) => P * i * n;
/** 중도상환수수료 부과 가능 기간(개월) */
const FEE_MAX_MONTHS = 36;

const TABS = [
  { key: "loan", label: "원리금 계산기" },
  { key: "interest", label: "대출이자" },
  { key: "dsr", label: "DSR" },
  { key: "prepay", label: "중도상환수수료" },
];

/* metric colors (Calculator.html) */
const C_BLUE = "#1B64DA";
const C_CORAL = "#C0392B";
const C_DARK = "#1E2E4A";

function Field({
  name,
  display,
  unit,
  raw,
  min,
  max,
  step,
  leftEnd,
  rightEnd,
  onChange,
}: {
  name: string;
  display: string;
  unit: string;
  raw: number;
  min: number;
  max: number;
  step: number;
  leftEnd: string;
  rightEnd: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.flabel}>
        <span className={styles.name}>{name}</span>
        <span className={styles.val}>
          <span className="tnum">{display}</span>
          <span className={styles.unit}>{unit}</span>
        </span>
      </div>
      <input
        className={styles.range}
        type="range"
        min={min}
        max={max}
        step={step}
        value={raw}
        onChange={(e) => onChange(+e.target.value)}
      />
      <div className={styles.rangeEnds}>
        <span>{leftEnd}</span>
        <span>{rightEnd}</span>
      </div>
    </div>
  );
}

function Metric({ k, value, unit, color }: { k: string; value: string; unit: string; color: string }) {
  return (
    <div className={styles.rmetric}>
      <div className={styles.rk}>{k}</div>
      <div className={styles.rv} style={{ color }}>
        <span className="tnum">{value}</span>
        <span className={styles.rvUnit}>{unit}</span>
      </div>
    </div>
  );
}

function ResultCard({
  metrics,
  note,
}: {
  metrics: { k: string; value: string; unit: string; color: string }[];
  note: string;
}) {
  return (
    <div className={styles.result}>
      <div className={styles.metrics}>
        {metrics.map((m) => (
          <Metric key={m.k} {...m} />
        ))}
      </div>
      <div className={styles.resNote}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v4h1" />
        </svg>
        <span>{note}</span>
      </div>
    </div>
  );
}

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <div className={styles.cardTitle}>{children}</div>
);

export default function Calculator({ initialTab }: { initialTab: string }) {
  const [tab, setTab] = useState(TABS.some((t) => t.key === initialTab) ? initialTab : "loan");
  useEffect(() => {
    if (TABS.some((t) => t.key === initialTab)) setTab(initialTab);
  }, [initialTab]);

  const [loan, setLoan] = useState({ amt: 3000, rate: 5, term: 36, method: "annuity" });
  const [intg, setIntg] = useState({ amt: 2000, rate: 6.5, term: 24 });
  const [dsr, setDsr] = useState({ income: 4000, exist: 300, newP: 5000, rate: 5, term: 5 });
  // 수수료율 기본값 0.6% — 2026년 은행 주담대 공시 수수료율(약 0.55~0.95%) 범위. guide.ts 예시와 같아요.
  const [pre, setPre] = useState({ amt: 2000, rate: 0.6, total: 36, elapsed: 12 });

  /* ---------- loan ---------- */
  const L = (() => {
    const P = manToWon(loan.amt);
    const i = loan.rate / 100 / 12;
    const n = loan.term;
    const aInt = annuityTotalInt(P, i, n);
    const pInt = principalTotalInt(P, i, n);
    const bInt = bulletTotalInt(P, i, n);
    let primaryK = "매월 상환액", primaryVal = 0, totint = 0, note = "";
    if (loan.method === "annuity") {
      primaryVal = annuityPay(P, i, n); totint = aInt;
      note = "원리금균등은 매달 같은 금액(원금+이자)을 갚아요.";
    } else if (loan.method === "principal") {
      primaryVal = P / n + P * i; primaryK = "첫 달 상환액"; totint = pInt;
      note = "원금균등은 매달 원금을 균등하게 갚아, 초반 부담이 크고 점점 줄어들어요.";
    } else {
      primaryVal = P * i; primaryK = "매월 이자"; totint = bInt;
      note = "만기일시는 매달 이자만 내고, 만기에 원금 전액을 한 번에 갚아요.";
    }
    const maxI = Math.max(aInt, pInt, bInt, 1);
    return { P, primaryK, primaryVal, totint, note, aInt, pInt, bInt, maxI };
  })();

  /* ---------- interest ---------- */
  const I = (() => {
    const P = manToWon(intg.amt);
    const i = intg.rate / 100 / 12;
    const n = intg.term;
    const M = annuityPay(P, i, n);
    const totInt = M * n - P;
    const total = P + totInt;
    const ratio = total > 0 ? (totInt / total) * 100 : 0;
    return { P, M, totInt, total, ratio };
  })();

  /* ---------- DSR ---------- */
  const D = (() => {
    const income = manToWon(dsr.income);
    const exist = manToWon(dsr.exist);
    const newP = manToWon(dsr.newP);
    const i = dsr.rate / 100 / 12;
    const n = dsr.term * 12;
    const newAnnual = annuityPay(newP, i, n) * 12;
    const totalAnnual = exist + newAnnual;
    const value = income > 0 ? (totalAnnual / income) * 100 : 0;
    return { totalAnnual, value, ok: value <= 40 };
  })();

  /* ---------- prepay ---------- */
  const Pp = (() => {
    const amt = manToWon(pre.amt);
    const elapsed = Math.min(pre.elapsed, pre.total);
    // 중도상환수수료는 대출일로부터 3년 이내에만 부과돼요(금융소비자보호법).
    // 대출기간이 3년보다 길면 3년(36개월)을 기준으로 계산하고, 3년이 지나면 0원이에요. (글 449와 같은 기준)
    const base = Math.min(pre.total, FEE_MAX_MONTHS);
    const remain = Math.max(0, base - elapsed);
    const remainRatio = base > 0 ? remain / base : 0;
    const fee = amt * (pre.rate / 100) * remainRatio;
    const eff = amt > 0 ? (fee / amt) * 100 : 0;
    return { amt, elapsed, remain, remainRatio, fee, eff };
  })();

  const cmpBar = (key: "annuity" | "principal" | "bullet", val: number, label: string) => (
    <div className={styles.cmpRow}>
      <div className={styles.cmpName} style={{ color: loan.method === key ? "#3182F6" : "#8B95A1" }}>
        {label}
      </div>
      <div className={styles.cmpTrack}>
        <div
          className={styles.cmpFill}
          style={{
            width: `${(val / L.maxI) * 100}%`,
            background: loan.method === key ? "#3182F6" : "#C5D6EC",
          }}
        />
      </div>
      <div className={`${styles.cmpVal} tnum`}>{won(val)}원</div>
    </div>
  );

  const dsrColor = D.ok ? "#1ABAB8" : "#FF6F61";

  return (
    <>
      {/* ===== PAGE HEAD ===== */}
      <div className={styles.head}>
        <div className={styles.wrap}>
          <nav className={styles.crumb}>
            <Link href="/">홈</Link>
            <span className={styles.sep}>›</span>
            <span className={styles.crumbCur}>금융계산기</span>
          </nav>
          <h1 className={styles.h1}>금융계산기</h1>
          <p className={styles.sub}>대출 실행 전, 막연한 불안 대신 정확한 숫자로 직접 확인해 보세요.</p>
          <div className={styles.tabs}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`${styles.tab} ${tab === t.key ? styles.tabOn : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div className={styles.body}>
        <div className={`${styles.wrap} ${styles.layout}`}>
          {/* ---- INPUT CARD ---- */}
          <div className={styles.card}>
            <CardTitle>
              <svg viewBox="0 0 24 24" fill="none" stroke="#3182F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
              {tab === "dsr" ? "소득과 대출 입력" : tab === "prepay" ? "중도상환 조건 입력" : "대출 조건 입력"}
            </CardTitle>

            {tab === "loan" && (
              <>
                <Field name="대출 금액" display={comma(loan.amt)} unit="만원" raw={loan.amt} min={100} max={50000} step={100} leftEnd="100만" rightEnd="5억" onChange={(v) => setLoan({ ...loan, amt: v })} />
                <Field name="연 이자율" display={loan.rate.toFixed(1)} unit="%" raw={loan.rate} min={1} max={20} step={0.1} leftEnd="1%" rightEnd="20%" onChange={(v) => setLoan({ ...loan, rate: v })} />
                <Field name="대출 기간" display={String(loan.term)} unit="개월" raw={loan.term} min={6} max={120} step={6} leftEnd="6개월" rightEnd="10년" onChange={(v) => setLoan({ ...loan, term: v })} />
                <div className={styles.methodBox}>
                  <span className={styles.methodLbl}>상환 방식</span>
                  <div className={styles.seg}>
                    {[["annuity", "원리금균등"], ["principal", "원금균등"], ["bullet", "만기일시"]].map(([m, lbl]) => (
                      <button key={m} className={`${styles.method} ${loan.method === m ? styles.methodOn : ""}`} onClick={() => setLoan({ ...loan, method: m })}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === "interest" && (
              <>
                <Field name="대출 금액" display={comma(intg.amt)} unit="만원" raw={intg.amt} min={100} max={50000} step={100} leftEnd="100만" rightEnd="5억" onChange={(v) => setIntg({ ...intg, amt: v })} />
                <Field name="연 이자율" display={intg.rate.toFixed(1)} unit="%" raw={intg.rate} min={1} max={20} step={0.1} leftEnd="1%" rightEnd="20%" onChange={(v) => setIntg({ ...intg, rate: v })} />
                <Field name="대출 기간" display={String(intg.term)} unit="개월" raw={intg.term} min={6} max={120} step={6} leftEnd="6개월" rightEnd="10년" onChange={(v) => setIntg({ ...intg, term: v })} />
              </>
            )}

            {tab === "dsr" && (
              <>
                <Field name="연 소득" display={comma(dsr.income)} unit="만원" raw={dsr.income} min={1000} max={20000} step={100} leftEnd="1,000만" rightEnd="2억" onChange={(v) => setDsr({ ...dsr, income: v })} />
                <Field name="기존 대출 연 원리금" display={comma(dsr.exist)} unit="만원" raw={dsr.exist} min={0} max={5000} step={50} leftEnd="0" rightEnd="5,000만" onChange={(v) => setDsr({ ...dsr, exist: v })} />
                <Field name="신규 대출 금액" display={comma(dsr.newP)} unit="만원" raw={dsr.newP} min={0} max={50000} step={100} leftEnd="0" rightEnd="5억" onChange={(v) => setDsr({ ...dsr, newP: v })} />
                <Field name="신규 금리" display={dsr.rate.toFixed(1)} unit="%" raw={dsr.rate} min={1} max={15} step={0.1} leftEnd="1%" rightEnd="15%" onChange={(v) => setDsr({ ...dsr, rate: v })} />
                <Field name="신규 기간" display={String(dsr.term)} unit="년" raw={dsr.term} min={1} max={35} step={1} leftEnd="1년" rightEnd="35년" onChange={(v) => setDsr({ ...dsr, term: v })} />
              </>
            )}

            {tab === "prepay" && (
              <>
                <Field name="중도상환 원금" display={comma(pre.amt)} unit="만원" raw={pre.amt} min={100} max={50000} step={100} leftEnd="100만" rightEnd="5억" onChange={(v) => setPre({ ...pre, amt: v })} />
                <Field name="수수료율" display={pre.rate.toFixed(1)} unit="%" raw={pre.rate} min={0} max={3} step={0.1} leftEnd="0%" rightEnd="3%" onChange={(v) => setPre({ ...pre, rate: v })} />
                <Field name="대출 약정 기간" display={String(pre.total)} unit="개월" raw={pre.total} min={12} max={120} step={6} leftEnd="12개월" rightEnd="10년" onChange={(v) => setPre({ ...pre, total: v })} />
                <Field name="대출 경과 기간" display={String(Pp.elapsed)} unit="개월" raw={Math.min(pre.elapsed, pre.total)} min={0} max={pre.total} step={1} leftEnd="0개월" rightEnd={`${pre.total}개월`} onChange={(v) => setPre({ ...pre, elapsed: v })} />
              </>
            )}
          </div>

          {/* ---- RESULT COLUMN ---- */}
          <div className={styles.resultCol}>
            {tab === "loan" && (
              <>
                <ResultCard
                  metrics={[
                    { k: L.primaryK, value: won(L.primaryVal), unit: "원", color: C_BLUE },
                    { k: "총 이자", value: won(L.totint), unit: "원", color: C_CORAL },
                    { k: "총 상환액", value: won(L.P + L.totint), unit: "원", color: C_DARK },
                  ]}
                  note={L.note}
                />
                <div className={styles.card}>
                  <div className={styles.subTitle}>상환 방식별 총이자 비교</div>
                  <div className={styles.compare}>
                    {cmpBar("annuity", L.aInt, "원리금균등")}
                    {cmpBar("principal", L.pInt, "원금균등")}
                    {cmpBar("bullet", L.bInt, "만기일시")}
                  </div>
                  <p className={styles.subNote}>
                    같은 금액·금리·기간이라도 상환 방식에 따라 내가 내는 총이자가 달라져요. 일반적으로 <b>원금을 빨리 갚을수록</b> 총이자는 줄어들어요.
                  </p>
                </div>
              </>
            )}

            {tab === "interest" && (
              <ResultCard
                metrics={[
                  { k: "매월 상환액", value: won(I.M), unit: "원", color: C_BLUE },
                  { k: "총 이자", value: won(I.totInt), unit: "원", color: C_CORAL },
                  { k: "총 상환액", value: won(I.total), unit: "원", color: C_DARK },
                ]}
                note={`원리금균등 상환 기준으로, 이자 비중은 약 ${I.ratio.toFixed(1)}%예요.`}
              />
            )}

            {tab === "dsr" && (
              <>
                <ResultCard
                  metrics={[
                    { k: "예상 DSR", value: D.value.toFixed(1), unit: "%", color: C_BLUE },
                    { k: "연 총 상환액", value: won(D.totalAnnual / 10000), unit: "만원", color: C_DARK },
                    { k: "규제 기준", value: "40", unit: "%", color: C_DARK },
                  ]}
                  note="DSR은 연 소득 대비 모든 대출의 연간 원리금 비율이에요."
                />
                <div className={styles.card}>
                  <div className={styles.subTitle}>DSR 막대 (규제선 40%)</div>
                  <div className={styles.dsrTrack}>
                    <div className={styles.dsrFill} style={{ width: `${Math.min(100, D.value)}%`, background: dsrColor }} />
                    <div className={styles.dsrReg} />
                  </div>
                  <div className={styles.dsrScale}>
                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                  </div>
                  <div className={styles.dsrVerdict} style={{ background: D.ok ? "#E6F9F9" : "#FFF0EF", color: dsrColor }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 12 2 2 4-4" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                    <span>
                      {D.ok
                        ? `DSR ${D.value.toFixed(1)}% — 통상 규제 기준(40%) 이내예요.`
                        : `DSR ${D.value.toFixed(1)}% — 규제 기준(40%)을 넘어, 한도가 제한될 수 있어요.`}
                    </span>
                  </div>
                </div>
              </>
            )}

            {tab === "prepay" && (
              <ResultCard
                metrics={[
                  { k: "예상 중도상환수수료", value: won(Pp.fee), unit: "원", color: C_BLUE },
                  { k: "수수료 남은 기간", value: String(Pp.remain), unit: "개월", color: C_DARK },
                  { k: "실효 부담률", value: Pp.eff.toFixed(2), unit: "%", color: C_CORAL },
                ]}
                note="수수료 = 갚는 금액 × 수수료율 × (남은 기간 ÷ 대출기간). 대출기간이 3년보다 길면 3년 기준으로 계산하고, 3년이 지나면 0원이에요."
              />
            )}

            <p className={styles.disclaimer}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#B0B8C1" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8h.01M11 12h1v4h1" />
              </svg>
              <span>
                본 계산기는 단순 추정치로, 실제 금융회사의 상환표·우대금리·수수료와 다를 수 있어요. {RATE_CAVEAT} 참고용으로만 활용하세요.{" "}
                <a href={`#guide-${tab}`}>계산 방법 자세히 보기</a>
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
