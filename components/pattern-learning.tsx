"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, RotateCcw, Search, Volume2, X } from "lucide-react";
import { advancePatternQueue, isPatternAnswer, MAX_PATTERN_ROUNDS, patternTokens, selectPatternSession, shufflePatternTokens } from "@/lib/pattern-learning";
import type { PatternToken, PatternTurn } from "@/lib/pattern-learning";
import type { ReviewRating, Word } from "@/lib/types";

type Props = {
  words: Word[];
  loading: boolean;
  onReview: (id: number, rating: ReviewRating) => Promise<void>;
  onSpeak: (text: string, lang: string) => Promise<void>;
  onStopSpeech: () => void;
};
type Result = { rating: ReviewRating; recovered: boolean };
const actionClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral";

function PatternText({ text }: { text: string }) {
  return <p lang="en" className="break-words text-2xl font-semibold leading-relaxed tracking-normal sm:text-3xl sm:leading-relaxed">
    {patternTokens(text).map((token) => <span key={token.id}>{/^\+|^\.{3}$/.test(token.text)
      ? <span className="inline-block rounded-lg bg-lilac px-2 text-indigo-900">{token.text}</span>
      : token.text}{" "}</span>)}
  </p>;
}

export function PatternLearningView({ words, loading, onReview, onSpeak, onStopSpeech }: Props) {
  const [size, setSize] = useState(5);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [deck, setDeck] = useState<Word[]>([]);
  const [queue, setQueue] = useState<PatternTurn[]>([]);
  const [phase, setPhase] = useState<"study" | "recall" | "build" | "summary">("study");
  const [studyIndex, setStudyIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [recalled, setRecalled] = useState(false);
  const [selected, setSelected] = useState<PatternToken[]>([]);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [hinted, setHinted] = useState(false);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveLock = useRef(false);
  const saved = useRef(new Set<number>());
  const studyDeck = deck.filter((word) => word.review_count === 0 || word.interval_days === 0);
  const turn = queue[0];
  const current = deck.find((word) => word.id === turn?.wordId);
  const studyWord = studyDeck[studyIndex];
  const tiles = useMemo(() => shufflePatternTokens(patternTokens(current?.term ?? "")), [current?.term, turn?.round]);
  const recommended = selectPatternSession(words, size);
  const dueCount = selectPatternSession(words, words.length).length;
  const mastered = words.filter((word) => word.correct_count >= 7).length;
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...words].sort((a, b) => a.id - b.id).filter((word) => `${word.term} ${word.definition}`.toLowerCase().includes(query));
  }, [words, search]);

  useEffect(() => onStopSpeech, [onStopSpeech]);

  function speak(text: string, lang: string) {
    if (!("speechSynthesis" in window)) {
      setError("เบราว์เซอร์นี้ยังไม่รองรับเสียงอ่าน ลองเปิดด้วยเบราว์เซอร์ที่รองรับเสียง");
      return;
    }
    void onSpeak(text, lang).catch(() => setError("เล่นเสียงไม่สำเร็จ กรุณาลองใหม่"));
  }

  function audio(text: string, lang: "en-US" | "th-TH") {
    return <button type="button" onClick={() => speak(text, lang)} className={`${actionClass} border border-ink/15 bg-white text-ink/80`}>
      <Volume2 size={17} />{lang === "th-TH" ? "ฟังภาษาไทย" : "ฟังอังกฤษ · พูดตาม"}
    </button>;
  }

  function resetTurn() {
    onStopSpeech();
    setRevealed(false);
    setRecalled(false);
    setSelected([]);
    setCorrect(null);
    setHinted(false);
    setError(null);
  }

  function start(cards: Word[]) {
    if (!cards.length || saveLock.current) return;
    resetTurn();
    setDeck(cards);
    setQueue(cards.map((word) => ({ wordId: word.id, round: 1 })));
    setStudyIndex(0);
    setResults({});
    saved.current = new Set();
    setPhase(cards.some((word) => word.review_count === 0 || word.interval_days === 0) ? "study" : "recall");
  }

  function leave() {
    if (saveLock.current) return;
    resetTurn();
    setDeck([]);
    setQueue([]);
  }

  async function next() {
    if (!current || correct === null || saveLock.current) return;
    saveLock.current = true;
    setBusy(true);
    setError(null);
    const unaided = recalled && correct && !hinted;
    const rating = unaided ? "known" : "again";
    try {
      // Count only the first attempt per pattern in this session, not short-term retries.
      if (!saved.current.has(current.id)) {
        await onReview(current.id, rating);
        saved.current.add(current.id);
      }
      setResults((previous) => ({ ...previous, [current.id]: {
        rating: previous[current.id]?.rating ?? rating,
        recovered: unaided
      } }));
      const remaining = advancePatternQueue(queue, !unaided);
      setQueue(remaining);
      resetTurn();
      setPhase(remaining.length ? "recall" : "summary");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  const remembered = Object.values(results).filter((result) => result.rating === "known").length;
  const needsReview = deck.filter((word) => results[word.id]?.rating === "again");
  const progress = deck.length ? Math.round(Object.keys(results).length / deck.length * 100) : 0;

  return <div className="mx-auto max-w-3xl py-10 lg:py-14">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">sentence patterns · pattle กลุ่มประโยค</p>
    <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">ฝึกกลุ่มประโยค</h1>
    <p className="mt-3 text-sm leading-7 text-ink/65">จำโครงประโยคทีละชุด ลองพูดจากความหมายภาษาไทย แล้วเรียงคำด้วยตัวเอง</p>
    {error && <p role="alert" className="mt-5 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-sm">{error}</p>}
    {loading ? <p role="status" className="mt-10 text-center">กำลังเตรียมกลุ่มประโยค…</p> : !deck.length ? <>
      <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-4">
        {[{ label: "ประโยคทั้งหมด", value: words.length }, { label: "ถึงเวลาฝึก", value: dueCount }, { label: "จำแม่นแล้ว", value: mastered }].map((stat) => <div key={stat.label} className="rounded-2xl border border-ink/10 bg-white p-4"><p className="text-xs text-ink/65">{stat.label}</p><p className="mt-2 text-2xl font-bold">{stat.value}</p></div>)}
      </div>
      <section className="mt-6 rounded-[28px] bg-ink p-6 text-white sm:p-8">
        <h2 className="text-xl font-bold">ฝึกสั้น ๆ ให้ได้ใช้ความจำ</h2>
        <ol className="mt-4 space-y-3 text-sm leading-6 text-white/85">
          <li>1. ดูโครงประโยคใหม่ ฟังเสียง แล้วพูดตามหนึ่งรอบ</li>
          <li>2. ปิดอังกฤษ ลองพูดประโยคจากโจทย์ภาษาไทย</li>
          <li>3. เรียงคำให้ถูก ข้อที่ยังไม่แม่นจะวนกลับมาหลังข้ออื่น</li>
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-3"><label htmlFor="pattern-size" className="text-sm">จำนวนต่อชุด</label><select id="pattern-size" value={size} onChange={(event) => setSize(Number(event.target.value))} className="rounded-xl bg-white px-3 py-2 text-ink"><option value={5}>5 ประโยค</option><option value={10}>10 ประโยค</option></select></div>
        <button disabled={!recommended.length} onClick={() => start(recommended)} className={`${actionClass} mt-5 w-full bg-coral text-white sm:w-auto`}>เริ่มชุดแนะนำ{recommended.length ? ` · ${recommended.length} ประโยค` : ""}<ArrowRight size={18} /></button>
        <p className="mt-4 text-xs leading-6 text-white/70">{dueCount ? "เริ่มจากประโยคที่ถึงกำหนดและยังไม่แม่น แล้วค่อยเพิ่มประโยคใหม่" : words.length ? "ทบทวนที่ถึงกำหนดครบแล้ว เลือกประโยคด้านล่างเพื่อฝึกเพิ่มเติมได้" : "ยังไม่มีกลุ่มประโยคในคลัง ลองโหลดหน้าใหม่เพื่อรับชุดประโยค"}</p>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-bold">เลือกฝึกเอง</h2>
        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-ink/15 bg-white px-4 py-3"><Search size={18} className="shrink-0 text-ink/50" /><input aria-label="ค้นหากลุ่มประโยค" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(20); }} placeholder="ค้นหาประโยคหรือคำแปล…" className="min-w-0 w-full bg-transparent outline-none" /></label>
        <p className="mt-3 text-xs text-ink/60">พบ {filtered.length} ประโยค</p>
        <div className="mt-3 space-y-2">{filtered.slice(0, visibleCount).map((word) => <button key={word.id} onClick={() => start([word])} className="w-full rounded-2xl border border-ink/10 bg-white p-4 text-left transition hover:border-coral focus-visible:outline-coral">
          <p lang="en" className="break-words font-semibold leading-7">{word.term}</p><p className="mt-1 text-sm leading-6 text-ink/70">{word.definition}</p><p className="mt-2 text-xs font-semibold text-emerald-700">{word.correct_count >= 7 ? "จำแม่นแล้ว" : `จำได้ ${word.correct_count}/7 ครั้ง`} · แตะเพื่อฝึก</p>
        </button>)}</div>
        {filtered.length > visibleCount && <button onClick={() => setVisibleCount((count) => count + 20)} className={`${actionClass} mt-4 w-full border border-ink/15 bg-white`}>แสดงเพิ่ม 20 ประโยค</button>}
      </section>
    </> : phase === "summary" ? <section className="mt-8 rounded-[28px] border border-ink/10 bg-white p-6 sm:p-8">
      <Check className="text-emerald-600" size={32} /><h2 className="mt-4 text-2xl font-bold">ฝึกชุดนี้ครบแล้ว</h2>
      <p className="mt-3 leading-7">นึกและเรียงได้เองตั้งแต่รอบแรก {remembered}/{deck.length} ประโยค</p>
      <p className="mt-2 text-sm leading-7 text-ink/65">บันทึกความคืบหน้าแล้ว · ข้อที่จำได้จะนัดทบทวนห่างขึ้น ส่วนข้อที่ใช้เฉลยหรือเรียงผิดจะนัดอีกครั้งใน 10 นาที</p>
      {needsReview.length > 0 && <div className="mt-5 rounded-2xl bg-cream p-4"><h3 className="font-bold">ประโยคที่ควรกลับมาฝึก</h3><ul className="mt-3 space-y-3">{needsReview.map((word) => <li key={word.id} className="break-words text-sm leading-6"><span lang="en" className="font-semibold">{word.term}</span><span className="mt-1 block text-ink/65">{results[word.id].recovered ? "รอบซ้ำจำได้แล้ว · ลองอีกครั้งเมื่อถึงเวลา" : word.definition}</span></li>)}</ul></div>}
      <button onClick={leave} className={`${actionClass} mt-6 bg-ink text-white`}>กลับไปเลือกชุดฝึก<ArrowRight size={17} /></button>
    </section> : <>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-sm"><p className="font-semibold">{phase === "study" ? `ทำความคุ้นเคย ${studyIndex + 1}/${studyDeck.length}` : `บันทึกแล้ว ${Object.keys(results).length}/${deck.length} ประโยค`}</p><button disabled={busy} onClick={leave} className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-ink/65 disabled:opacity-40"><X size={16} />จบชุดนี้</button></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-label="ประโยคที่บันทึกแล้ว" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-coral transition-all" style={{ width: `${progress}%` }} /></div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-bold">{["study", "recall", "build"].map((step, index) => <span key={step} aria-current={phase === step ? "step" : undefined} className={`rounded-xl px-2 py-3 ${phase === step ? "bg-ink text-white" : "bg-white text-ink/60"}`}>{index + 1}. {step === "study" ? "ดูและพูดตาม" : step === "recall" ? "นึกประโยค" : "เรียงให้ถูก"}</span>)}</div>
      <section className="mt-4 overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-card">
        {phase === "study" && studyWord ? <div className="p-5 sm:p-8">
          <div className="mb-5 flex items-center gap-2 text-sm font-bold text-ink/60"><BookOpen size={17} />อ่านแล้วพูดตาม จากนั้นจะซ่อนอังกฤษให้ลองนึกเอง</div>
          <PatternText text={studyWord.term} /><p className="mt-5 text-lg leading-8 text-ink/80">{studyWord.definition}</p>
          <div className="mt-6 flex flex-wrap gap-2">{audio(studyWord.term, "en-US")}{audio(studyWord.definition, "th-TH")}</div>
          <button onClick={() => { onStopSpeech(); if (studyIndex + 1 < studyDeck.length) setStudyIndex((index) => index + 1); else setPhase("recall"); }} className={`${actionClass} mt-7 w-full bg-coral text-white`}>พูดตามแล้ว · {studyIndex + 1 < studyDeck.length ? "ดูประโยคถัดไป" : "เริ่มทดสอบความจำ"}<ArrowRight size={17} /></button>
        </div> : current && <>
          <div className="bg-cream p-5 sm:p-8">
            <p className="text-xs font-bold text-ink/60">{turn.round > 1 ? `วนทบทวนรอบ ${turn.round}/${MAX_PATTERN_ROUNDS}` : "โจทย์ภาษาไทย"} · จำได้แล้ว {current.correct_count}/7 ครั้ง</p>
            <h2 lang="th" className="mt-4 break-words text-xl font-semibold leading-relaxed sm:text-2xl sm:leading-relaxed">{current.definition}</h2>
            <div className="mt-4">{audio(current.definition, "th-TH")}</div>
          </div>
          <div className="p-5 sm:p-8">
            {phase === "recall" ? <>
              <p className="text-sm leading-7 text-ink/75">ลองพูดรูปแบบประโยคอังกฤษออกเสียงก่อนเปิดเฉลย โดยยังไม่ต้องเติมคำในช่อง …</p>
              {revealed ? <><div className="mt-5 rounded-2xl border border-ink/10 p-5"><PatternText text={current.term} /><div className="mt-4">{audio(current.term, "en-US")}</div></div><p className="mt-5 text-sm font-semibold">ก่อนเปิดเฉลย คุณนึกออกเองไหม?</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><button onClick={() => { onStopSpeech(); setRecalled(false); setPhase("build"); }} className={`${actionClass} border border-ink/15`}>ยังต้องดูเฉลย</button><button onClick={() => { onStopSpeech(); setRecalled(true); setPhase("build"); }} className={`${actionClass} bg-ink text-white`}>นึกออกเองแล้ว<Check size={17} /></button></div></>
                : <button onClick={() => setRevealed(true)} className={`${actionClass} mt-6 w-full bg-ink text-white`}>เปิดเฉลยเพื่อตรวจตัวเอง</button>}
            </> : <>
              <p className="text-sm font-semibold text-ink/75">แตะคำเพื่อเรียงโครงประโยค · แตะคำที่เลือกแล้วเพื่อนำออก</p>
              <div className="mt-4 flex min-h-28 flex-wrap content-start gap-2 rounded-2xl border-2 border-dashed border-ink/20 bg-cream/40 p-4" aria-label="คำตอบที่เรียงไว้">{selected.length ? selected.map((token, index) => <button key={token.id} disabled={correct !== null} onClick={() => setSelected((items) => items.filter((_, i) => i !== index))} aria-label={`นำ ${token.text} ออกจากคำตอบ ตำแหน่ง ${index + 1}`} className="min-h-11 break-words rounded-xl bg-ink px-3 py-2 text-white disabled:cursor-default">{token.text}</button>) : <span className="text-sm text-ink/60">เรียงคำภาษาอังกฤษที่นี่…</span>}</div>
              <div className="mt-5 flex flex-wrap gap-2" aria-label="คำที่สลับลำดับ">{tiles.map((token) => <button key={token.id} disabled={correct !== null || selected.some((item) => item.id === token.id)} onClick={() => setSelected((items) => [...items, token])} className="min-h-12 break-words rounded-xl border border-ink/20 bg-white px-4 py-2 font-semibold transition hover:border-coral disabled:opacity-25">{token.text}</button>)}</div>
              {correct === null ? <><div className="mt-6 flex flex-wrap gap-3"><button disabled={selected.length !== tiles.length} onClick={() => setCorrect(isPatternAnswer(current.term, selected))} className={`${actionClass} flex-1 bg-coral text-white`}>ตรวจคำตอบ</button><button onClick={() => setSelected([])} className={`${actionClass} border border-ink/15`}><RotateCcw size={16} />เรียงใหม่</button></div><button onClick={() => setHinted(true)} className="mt-4 min-h-11 text-sm font-semibold text-ink/65 underline">ขอดูโครงประโยคอีกครั้ง</button>{hinted && <div className="mt-3 rounded-2xl bg-lilac p-4"><PatternText text={current.term} /><p className="mt-2 text-xs text-ink/70">ข้อนี้จะวนให้ลองนึกเองอีกครั้ง</p></div>}</>
                : <><div role="status" className={`mt-6 rounded-2xl p-5 ${correct ? "bg-mint" : "bg-coral/10"}`}><p className="mb-4 font-bold">{correct ? "เรียงถูกแล้ว!" : "ยังไม่ถูก ลองจำโครงนี้แล้วฝึกอีกครั้ง"}</p><PatternText text={current.term} /><div className="mt-4">{audio(current.term, "en-US")}</div><p className="mt-4 text-sm leading-6">{recalled && correct && !hinted ? "นึกได้เองและเรียงถูก" : turn.round < MAX_PATTERN_ROUNDS ? "ข้อนี้จะวนกลับมาหลังข้ออื่น (ถ้ามี)" : "พักข้อนี้ก่อน แล้วกลับมาฝึกตามเวลาทบทวน"}</p></div><button disabled={busy} onClick={() => void next()} className={`${actionClass} mt-5 w-full bg-ink text-white`}>{busy ? "กำลังบันทึก…" : error ? "ลองบันทึกอีกครั้ง" : "ไปต่อ"}<ArrowRight size={17} /></button></>}
            </>}
          </div>
        </>}
      </section>
      <details className="mt-5 rounded-2xl border border-ink/10 bg-white p-4 text-sm text-ink/70"><summary className="cursor-pointer font-semibold">สัญลักษณ์ในโครงประโยคหมายถึงอะไร?</summary><p className="mt-3 leading-7">… = เติมข้อความของคุณ · V1 = กริยาช่อง 1 · V2 = ช่อง 2 · V3 = ช่อง 3 · V-ing = กริยาเติม ing · V-s/es = กริยาเติม s/es · Adj = คำคุณศัพท์ · N = คำนาม · + = ต่อด้วยส่วนที่ระบุ</p></details>
      <p className="mt-4 text-xs leading-6 text-ink/60">บันทึกเมื่อกด “ไปต่อ” · รอบฝึกซ้ำในชุดเดียวกันไม่นับคะแนนเพิ่ม · กด “จบชุดนี้” เพื่อพักได้ โดยข้อที่บันทึกแล้วจะยังอยู่</p>
    </>}
  </div>;
}
