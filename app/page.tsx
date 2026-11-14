"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileUp,
  Flame,
  GraduationCap,
  Heart,
  Import,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Trophy,
  Upload,
  X,
  Zap
} from "lucide-react";
import type { ReviewRating, Word } from "@/lib/types";

type Tab = "dashboard" | "review" | "quiz" | "import";

const sampleImport = `1. airborne (adj.) - ทางอากาศ, ทหารพลร่ม
2. landing (n.) - การลงจอด, การยกพลขึ้นบก
3. scattered (adj.) - กระจัดกระจาย
4. objective (n.) - เป้าหมาย, ภารกิจ
5. conviction (n.) - ความเชื่อมั่น
6. spread out (phr.v.) - กระจายกำลัง, แยกออกจากกัน`;

function formatDate(value: string | null) {
  if (!value) return "ยังไม่เคยทบทวน";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(new Date(value));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 18) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [words, setWords] = useState<Word[]>([]);
  const [dueWords, setDueWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadWords = useCallback(async () => {
    setLoading(true);
    const [allResponse, dueResponse] = await Promise.all([fetch("/api/words"), fetch("/api/words?mode=due")]);
    setWords((await allResponse.json()) as Word[]);
    setDueWords((await dueResponse.json()) as Word[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadWords(); }, [loadWords, session?.user?.email]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const reviewedToday = useMemo(() => words.filter((word) => word.last_reviewed?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length, [words]);
  const mastered = useMemo(() => words.filter((word) => word.interval_days >= 7).length, [words]);

  function navigate(tab: Tab) {
    setActiveTab(tab);
    setSidebarOpen(false);
  }

  async function reviewWord(id: number, rating: ReviewRating) {
    await fetch(`/api/words/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating }) });
    setToast(rating === "known" ? "เก็บคำนี้เข้าความจำระยะยาวแล้ว" : "บันทึกไว้ทบทวนอีกครั้งใน 10 นาที");
    await loadWords();
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1480px]">
        <aside className={`fixed inset-y-0 left-0 z-30 w-[270px] shrink-0 border-r border-ink/10 bg-[#faf9f5] px-5 py-6 transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between px-2">
            <button className="flex items-center gap-3" onClick={() => navigate("dashboard")} aria-label="ไปหน้าแรก">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-white shadow-card"><Sparkles size={18} /></span>
              <span className="text-left"><span className="block font-display text-xl font-bold tracking-tight">LexiFlow</span><span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-ink/40">vocabulary lab</span></span>
            </button>
            <button className="rounded-lg p-2 text-ink/50 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="ปิดเมนู"><X size={18} /></button>
          </div>

          <div className="mt-12 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/35">workspace</div>
          <nav className="mt-3 space-y-1">
            <NavItem active={activeTab === "dashboard"} icon={<LayoutDashboard size={18} />} label="ภาพรวม" onClick={() => navigate("dashboard")} />
            <NavItem active={activeTab === "review"} icon={<RotateCcw size={18} />} label="ทบทวนวันนี้" badge={dueWords.length} onClick={() => navigate("review")} />
            <NavItem active={activeTab === "quiz"} icon={<CircleHelp size={18} />} label="ควิซคำศัพท์" onClick={() => navigate("quiz")} />
            <NavItem active={activeTab === "import"} icon={<FileUp size={18} />} label="นำเข้าคำศัพท์" onClick={() => navigate("import")} />
          </nav>

          <div className="mt-auto hidden pt-20 lg:block">
            <div className="overflow-hidden rounded-3xl bg-ink px-5 py-5 text-white shadow-soft">
              <div className="mb-8 flex items-start justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Target size={17} /></span><span className="rounded-full bg-coral px-2 py-1 text-[10px] font-bold">PROGRESS</span></div>
              <p className="text-sm font-semibold text-white/70">สัปดาห์นี้คุณทบทวนไปแล้ว</p>
              <p className="mt-1 text-4xl font-bold tracking-tight">{reviewedToday}<span className="ml-1 text-base font-medium text-white/40">คำ</span></p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-coral" style={{ width: `${Math.min(reviewedToday * 12, 100)}%` }} /></div>
              <p className="mt-3 text-xs text-white/45">เป้าหมายเล็ก ๆ สร้างความจำใหญ่ ๆ</p>
            </div>
          </div>
        </aside>

        {sidebarOpen && <button className="fixed inset-0 z-20 bg-ink/25 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="ปิดเมนู" />}

        <section className="min-w-0 flex-1 px-5 py-5 sm:px-8 lg:px-12 lg:py-8">
          <header className="flex items-center justify-between gap-4">
            <button className="rounded-xl border border-ink/10 bg-white/70 p-2.5 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="เปิดเมนู"><Menu size={19} /></button>
            <div className="hidden items-center gap-2 text-sm text-ink/40 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" /> ระบบพร้อมใช้งาน <span className="text-ink/20">/</span> {activeTab === "dashboard" ? "ภาพรวม" : activeTab === "review" ? "ทบทวน" : activeTab === "quiz" ? "ควิซ" : "นำเข้า"}</div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block"><p className="text-xs font-semibold text-ink/40">{session?.user?.email ? "บัญชีของคุณ" : "โหมดทดลอง"}</p><p className="text-sm font-bold">{session?.user?.name || "Guest learner"}</p></div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-coral/15 font-bold text-coral">{session?.user?.name?.slice(0, 1).toUpperCase() || "G"}</div>
              {session?.user ? <button onClick={() => signOut()} className="hidden rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink/60 transition hover:border-ink/25 sm:block">ออกจากระบบ</button> : <button onClick={() => signIn("google")} className="hidden items-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white transition hover:bg-ink/90 sm:flex"><LogIn size={14} /> Login with Google</button>}
            </div>
          </header>

          <div className="mx-auto max-w-[1100px]">
            {activeTab === "dashboard" && <Dashboard words={words} dueWords={dueWords} mastered={mastered} reviewedToday={reviewedToday} loading={loading} onNavigate={navigate} />}
            {activeTab === "review" && <ReviewView words={dueWords} loading={loading} onReview={reviewWord} onNavigate={navigate} />}
            {activeTab === "quiz" && <QuizView words={words} onToast={setToast} />}
            {activeTab === "import" && <ImportView onDone={async (message) => { setToast(message); await loadWords(); navigate("dashboard"); }} />}
          </div>
        </section>
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-soft"><Check size={16} className="text-mint" />{toast}</div>}
    </main>
  );
}

function NavItem({ active, icon, label, badge, onClick }: { active: boolean; icon: React.ReactNode; label: string; badge?: number; onClick: () => void }) {
  return <button onClick={onClick} className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${active ? "bg-ink text-white shadow-card" : "text-ink/55 hover:bg-ink/5 hover:text-ink"}`}><span className={active ? "text-coral" : "text-ink/40 group-hover:text-coral"}>{icon}</span><span className="flex-1">{label}</span>{badge ? <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-white/10 text-white" : "bg-coral/10 text-coral"}`}>{badge}</span> : null}</button>;
}

function Dashboard({ words, dueWords, mastered, reviewedToday, loading, onNavigate }: { words: Word[]; dueWords: Word[]; mastered: number; reviewedToday: number; loading: boolean; onNavigate: (tab: Tab) => void }) {
  return <div className="py-10 lg:py-14">
    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="mb-3 flex items-center gap-2 text-sm font-bold text-coral"><span className="h-2 w-2 rounded-full bg-coral" /> {getGreeting()}, นักเรียน</p><h1 className="font-display text-4xl font-bold tracking-[-0.04em] text-ink sm:text-5xl">พร้อมเรียนรู้คำใหม่<br /><span className="text-ink/35">ทีละคำไหม?</span></h1><p className="mt-5 max-w-md text-sm leading-7 text-ink/55">ทบทวนให้ถูกจังหวะ แล้วคำศัพท์จะย้ายจากความจำสั้นไปอยู่ในคลังระยะยาว</p></div><button onClick={() => onNavigate(dueWords.length ? "review" : "import")} className="group flex w-fit items-center gap-3 rounded-2xl bg-coral px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-coral/20 transition hover:-translate-y-0.5">{dueWords.length ? "เริ่มทบทวน" : "เพิ่มคำศัพท์แรก"}<ArrowRight size={17} className="transition group-hover:translate-x-1" /></button></div>
    <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4"><StatCard icon={<BookOpen size={18} />} label="คำศัพท์ทั้งหมด" value={loading ? "—" : words.length} tone="lilac" /><StatCard icon={<Clock3 size={18} />} label="ถึงเวลาทบทวน" value={loading ? "—" : dueWords.length} tone="sand" /><StatCard icon={<Trophy size={18} />} label="จำได้ดีแล้ว" value={loading ? "—" : mastered} tone="mint" /><StatCard icon={<Flame size={18} />} label="ทบทวนวันนี้" value={reviewedToday} tone="coral" /></div>
    <div className="mt-8 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="grid-paper overflow-hidden rounded-[28px] border border-ink/10 bg-white p-6 shadow-card sm:p-8"><div className="flex items-start justify-between"><div><span className="mb-4 inline-flex items-center gap-2 rounded-full bg-coral/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-coral"><Zap size={13} /> Focus session</span><h2 className="font-display text-2xl font-bold">วันนี้มี {dueWords.length} คำรอคุณอยู่</h2><p className="mt-2 max-w-sm text-sm leading-6 text-ink/50">เซสชันสั้น ๆ 5 นาที ช่วยให้จำได้แม่นกว่าการอ่านซ้ำยาว ๆ</p></div><div className="hidden h-16 w-16 place-items-center rounded-full border-[7px] border-coral/15 border-t-coral text-sm font-bold text-coral sm:grid">{Math.min(Math.round((reviewedToday / Math.max(words.length, 1)) * 100), 100)}%</div></div><div className="mt-8 flex items-center gap-3">{dueWords.slice(0, 3).map((word, index) => <div key={word.id} className={`flex h-14 w-14 -rotate-${index % 2 ? "2" : "1"} items-center justify-center rounded-2xl border border-ink/10 bg-white text-[10px] font-bold shadow-sm ${index === 1 ? "-translate-y-2" : ""}`}>{word.term.slice(0, 9)}{word.term.length > 9 ? "…" : ""}</div>)}{!dueWords.length && <div className="flex h-14 items-center gap-3 rounded-2xl bg-mint/70 px-4 text-sm font-semibold text-ink/70"><Check size={17} /> เยี่ยม! วันนี้เคลียร์หมดแล้ว</div>}<button onClick={() => onNavigate("review")} className="ml-auto hidden items-center gap-2 text-sm font-bold text-ink/55 transition hover:text-coral sm:flex">ดูทั้งหมด <ChevronRight size={16} /></button></div></section>
      <section className="rounded-[28px] bg-ink p-6 text-white shadow-soft sm:p-8"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white/45">Your learning rhythm</p><h2 className="mt-1 font-display text-2xl font-bold">รักษาจังหวะไว้</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-coral"><Heart size={19} fill="currentColor" /></span></div><div className="mt-10 flex items-end gap-2">{[35, 55, 42, 75, 62, reviewedToday ? 88 : 28, 12].map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className={`w-full rounded-t-lg ${index === 5 ? "bg-coral" : "bg-white/15"}`} style={{ height: `${height}px` }} /><span className="text-[10px] text-white/30">{["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"][index]}</span></div>)}</div><div className="mt-7 flex items-center gap-3 border-t border-white/10 pt-5"><span className="text-3xl font-bold">{reviewedToday}</span><span className="text-sm leading-5 text-white/45">คำที่ทบทวนวันนี้<br />เป้าหมาย 10 คำ</span></div></section>
    </div>
    <section className="mt-8 rounded-[28px] border border-ink/10 bg-white p-6 shadow-card sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/35">your library</p><h2 className="mt-1 font-display text-2xl font-bold">คำศัพท์ล่าสุด</h2></div><button onClick={() => onNavigate("import")} className="flex items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold text-ink/60 transition hover:border-coral/40 hover:text-coral"><Plus size={15} /> เพิ่มคำ</button></div><div className="mt-5 divide-y divide-ink/8">{loading ? <div className="py-10 text-center text-sm text-ink/40">กำลังโหลดคลังคำศัพท์…</div> : words.slice(0, 5).map((word) => <div key={word.id} className="flex items-center gap-3 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lilac text-sm font-bold text-ink">{word.term.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{word.term} <span className="ml-1 text-xs font-medium text-ink/35">{word.part_of_speech}</span></p><p className="line-clamp-2 text-xs text-ink/45">{word.definition}</p></div><span className="hidden text-xs text-ink/35 sm:block">{word.review_count ? `ทบทวนแล้ว ${word.review_count} ครั้ง` : "ยังไม่เริ่ม"}</span><ChevronRight size={16} className="text-ink/20" /></div>)}{!loading && !words.length && <div className="py-10 text-center text-sm text-ink/40">ยังไม่มีคำศัพท์ ลองนำเข้าเลย</div>}</div></section>
  </div>;
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: "lilac" | "sand" | "mint" | "coral" }) {
  const tones = { lilac: "bg-lilac", sand: "bg-sand", mint: "bg-mint", coral: "bg-coral/10" };
  return <div className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card sm:p-5"><span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]} text-ink`}>{icon}</span><p className="mt-5 text-xs font-semibold text-ink/45">{label}</p><p className="mt-1 font-display text-3xl font-bold tracking-tight">{value}</p></div>;
}

function ReviewView({ words, loading, onReview, onNavigate }: { words: Word[]; loading: boolean; onReview: (id: number, rating: ReviewRating) => Promise<void>; onNavigate: (tab: Tab) => void }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const current = words[index];
  useEffect(() => { setIndex(0); setRevealed(false); }, [words.length]);
  async function finish(rating: ReviewRating) { if (!current) return; await onReview(current.id, rating); setRevealed(false); setIndex((value) => value + 1); }
  if (loading) return <PageTitle eyebrow="review mode" title="กำลังเตรียมคำศัพท์…" />;
  if (!current) return <div className="py-20 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-mint text-ink"><Trophy size={32} /></div><h1 className="mt-7 font-display text-3xl font-bold">เคลียร์หมดแล้ว!</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-ink/50">ไม่มีคำที่ถึงเวลาทบทวนในตอนนี้ กลับมาใหม่อีกครั้งเมื่อถึงจังหวะ</p><button onClick={() => onNavigate("quiz")} className="mt-7 rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-white">ไปฝึกควิซแทน</button></div>;
  return <div className="mx-auto max-w-2xl py-10 lg:py-14"><PageTitle eyebrow={`review mode · ${Math.min(index + 1, words.length)} / ${words.length}`} title="ทบทวนให้จำได้" description="ลองนึกคำแปลก่อนเปิดการ์ด แล้วเลือกตามความรู้สึกจริงของคุณ" /><div className="mt-10 overflow-hidden rounded-[32px] border border-ink/10 bg-white shadow-soft"><div className="h-2 bg-ink/5"><div className="h-full bg-coral transition-all duration-500" style={{ width: `${((index + 1) / words.length) * 100}%` }} /></div><div className="px-7 py-12 text-center sm:px-14 sm:py-16"><span className="rounded-full bg-lilac px-3 py-1.5 text-xs font-bold text-ink">{current.part_of_speech || "word"}</span><h2 className="mt-7 break-words font-display text-5xl font-bold tracking-[-0.05em] sm:text-6xl">{current.term}</h2><p className="mt-4 text-xs text-ink/35">ทบทวนครั้งล่าสุด: {formatDate(current.last_reviewed)}</p>{revealed ? <div className="mt-11 rounded-2xl bg-cream px-5 py-5 text-left"><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/35">คำแปล</p><p className="mt-2 text-lg font-semibold leading-8">{current.definition}</p></div> : <button onClick={() => setRevealed(true)} className="mt-12 rounded-2xl border border-ink/15 px-6 py-3 text-sm font-bold transition hover:border-coral hover:text-coral">เปิดคำแปล <span className="ml-2 text-ink/35">space</span></button>}</div>{revealed && <div className="grid grid-cols-2 gap-3 border-t border-ink/8 bg-cream/60 p-5"><button onClick={() => void finish("again")} className="flex items-center justify-center gap-2 rounded-2xl border border-coral/20 bg-white py-3.5 text-sm font-bold text-coral transition hover:bg-coral hover:text-white"><RotateCcw size={16} /> ยังไม่แม่น</button><button onClick={() => void finish("known")} className="flex items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-sm font-bold text-white transition hover:bg-coral"><Check size={16} /> จำได้แล้ว</button></div>}</div></div>;
}

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) { return <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">{eyebrow}</p><h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{title}</h1>{description && <p className="mt-4 max-w-lg text-sm leading-7 text-ink/50">{description}</p>}</div>; }

function QuizView({ words, onToast }: { words: Word[]; onToast: (message: string) => void }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const quizWords = useMemo(() => [...words].sort(() => Math.random() - 0.5).slice(0, Math.min(10, words.length)), [words]);
  const current = quizWords[questionIndex];
  const options = useMemo(() => { if (!current) return []; return [current, ...words.filter((word) => word.id !== current.id).sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5); }, [current, words]);
  function answer(term: string) { if (selected) return; setSelected(term); const correct = term === current.term; if (correct) setScore((value) => value + 1); window.setTimeout(() => { if (questionIndex + 1 >= quizWords.length) { onToast(`จบควิซแล้ว ได้ ${score + (correct ? 1 : 0)} / ${quizWords.length} คะแนน`); setStarted(false); setQuestionIndex(0); setSelected(null); setScore(0); } else { setQuestionIndex((value) => value + 1); setSelected(null); } }, 650); }
  if (!words.length) return <div className="py-20 text-center"><PageTitle eyebrow="quiz mode" title="เพิ่มคำศัพท์ก่อนเริ่มควิซ" description="นำเข้าคำศัพท์อย่างน้อย 4 คำ เพื่อให้ระบบสร้างตัวเลือกที่เหมาะสม" /></div>;
  if (!started) return <div className="py-10 lg:py-14"><PageTitle eyebrow="quiz mode" title="พร้อมทดสอบความจำหรือยัง?" description="ควิซแบบเลือกคำแปลที่ถูกต้อง จำนวนสูงสุด 10 ข้อ ใช้คำศัพท์จากคลังของคุณ" /><div className="mt-10 grid gap-5 sm:grid-cols-3"><div className="rounded-[28px] bg-ink p-6 text-white sm:col-span-2"><div className="flex h-full flex-col justify-between"><div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-coral"><GraduationCap size={23} /></span><h2 className="mt-10 font-display text-3xl font-bold">Quick recall</h2><p className="mt-2 max-w-xs text-sm leading-6 text-white/50">ทดสอบคำแปลแบบเร็ว ๆ เพื่อดูว่าคำไหนยังต้องกลับไปทบทวน</p></div><button onClick={() => setStarted(true)} className="mt-12 flex w-fit items-center gap-3 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-ink transition hover:bg-coral hover:text-white">เริ่มควิซ <ArrowRight size={16} /></button></div></div><div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card"><p className="text-xs font-bold uppercase tracking-[0.15em] text-ink/35">best score</p><p className="mt-4 font-display text-5xl font-bold">—</p><p className="mt-3 text-sm text-ink/45">ยังไม่มีสถิติในเซสชันนี้</p></div></div></div>;
  if (!current) return null;
  return <div className="mx-auto max-w-2xl py-10 lg:py-14"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">question {questionIndex + 1} / {quizWords.length}</p><h1 className="mt-3 font-display text-3xl font-bold">เลือกคำแปลที่ตรงที่สุด</h1></div><div className="rounded-2xl bg-white px-4 py-3 text-center shadow-card"><p className="text-[10px] font-bold uppercase tracking-widest text-ink/35">score</p><p className="font-display text-xl font-bold">{score}</p></div></div><div className="mt-8 rounded-[32px] border border-ink/10 bg-white p-7 text-center shadow-soft sm:p-12"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lilac text-ink"><CircleHelp size={23} /></div><p className="mt-7 text-sm font-bold text-ink/35">คำศัพท์นี้แปลว่าอะไร?</p><h2 className="mt-3 font-display text-5xl font-bold tracking-[-0.05em]">{current.term}</h2><div className="mt-10 grid gap-3 text-left">{options.map((option) => <button key={option.id} onClick={() => answer(option.term)} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-sm font-semibold transition ${selected ? option.term === current.term ? "border-emerald-400 bg-mint" : option.term === selected ? "border-coral bg-coral/10" : "border-ink/8 opacity-50" : "border-ink/10 hover:border-coral hover:bg-coral/5"}`}><span>{option.definition}</span>{selected && option.term === current.term && <Check size={17} className="text-emerald-600" />}</button>)}</div></div></div>;
}

function ImportView({ onDone }: { onDone: (message: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [manual, setManual] = useState({ term: "", partOfSpeech: "", definition: "" });
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"paste" | "manual">("paste");
  async function importText() { setBusy(true); const response = await fetch("/api/words/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }); const payload = await response.json() as { imported?: number; error?: string }; setBusy(false); if (!response.ok) { window.alert(payload.error || "นำเข้าไม่สำเร็จ"); return; } setText(""); await onDone(`นำเข้าคำศัพท์สำเร็จ ${payload.imported} คำ`); }
  async function addManual() { setBusy(true); const response = await fetch("/api/words", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(manual) }); const payload = await response.json() as { error?: string }; setBusy(false); if (!response.ok) { window.alert(payload.error || "เพิ่มคำศัพท์ไม่สำเร็จ"); return; } setManual({ term: "", partOfSpeech: "", definition: "" }); await onDone("เพิ่มคำศัพท์ 1 คำแล้ว"); }
  return <div className="py-10 lg:py-14"><PageTitle eyebrow="build your library" title="เพิ่มคำศัพท์ให้เป็นของคุณ" description="วางรายการยาว ๆ จากหนังสือหรือโน้ตได้เลย ระบบจะอ่านเลขลำดับ, part of speech และคำแปลให้อัตโนมัติ" /><div className="mt-9 flex gap-2 rounded-2xl bg-ink/5 p-1.5 sm:w-fit"><button onClick={() => setTab("paste")} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === "paste" ? "bg-white text-ink shadow-sm" : "text-ink/45"}`}><Upload size={15} className="mr-2 inline" />วางรายการ</button><button onClick={() => setTab("manual")} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === "manual" ? "bg-white text-ink shadow-sm" : "text-ink/45"}`}><Plus size={15} className="mr-2 inline" />เพิ่มทีละคำ</button></div>{tab === "paste" ? <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><section className="rounded-[28px] border border-ink/10 bg-white p-5 shadow-card sm:p-7"><div className="flex items-center justify-between"><label className="text-sm font-bold">รายการคำศัพท์</label><button onClick={() => setText(sampleImport)} className="text-xs font-bold text-coral hover:underline">ใช้ตัวอย่าง</button></div><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={`airborne (adj.) - ทางอากาศ, ทหารพลร่ม\nlanding (n.) - การลงจอด`} className="mt-4 min-h-[340px] w-full resize-none rounded-2xl border border-ink/10 bg-cream p-4 text-sm leading-7 outline-none transition placeholder:text-ink/25 focus:border-coral focus:ring-4 focus:ring-coral/10" /><div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className="text-xs leading-5 text-ink/40">รองรับเลขลำดับ, ไม่มีเลขลำดับ, tab-separated และ JSON</p><button disabled={!text.trim() || busy} onClick={() => void importText()} className="flex items-center justify-center gap-2 rounded-2xl bg-coral px-5 py-3 text-sm font-bold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-40"><Import size={16} />{busy ? "กำลังนำเข้า…" : "นำเข้าคำศัพท์"}</button></div></section><section className="rounded-[28px] bg-ink p-6 text-white shadow-soft sm:p-8"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-coral"><Sparkles size={19} /></span><h2 className="mt-8 font-display text-2xl font-bold">นำเข้าได้หลายแบบ</h2><div className="mt-7 space-y-5 text-sm leading-6 text-white/60"><div><p className="font-bold text-white">แบบมีเลขลำดับ</p><p>1. airborne (adj.) - ทางอากาศ</p></div><div><p className="font-bold text-white">แบบไม่มีเลขลำดับ</p><p>landing (n.) - การลงจอด</p></div><div><p className="font-bold text-white">แบบ JSON</p><p>[&#123; "term": "cover", "definition": "ที่กำบัง" &#125;]</p></div></div></section></div> : <section className="mt-5 max-w-2xl rounded-[28px] border border-ink/10 bg-white p-5 shadow-card sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><Field label="คำศัพท์" value={manual.term} placeholder="e.g. cover" onChange={(value) => setManual({ ...manual, term: value })} /><Field label="ชนิดคำ" value={manual.partOfSpeech} placeholder="e.g. n. / v." onChange={(value) => setManual({ ...manual, partOfSpeech: value })} /></div><div className="mt-5"><Field label="คำแปล / ความหมาย" value={manual.definition} placeholder="ที่กำบัง, คุ้มกัน" onChange={(value) => setManual({ ...manual, definition: value })} multiline /></div><button disabled={!manual.term.trim() || !manual.definition.trim() || busy} onClick={() => void addManual()} className="mt-6 flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Plus size={16} />เพิ่มเข้าคลัง</button></section>}</div>;
}

function Field({ label, value, placeholder, onChange, multiline }: { label: string; value: string; placeholder: string; onChange: (value: string) => void; multiline?: boolean }) { const className = "mt-2 w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none transition placeholder:text-ink/25 focus:border-coral focus:ring-4 focus:ring-coral/10"; return <label className="block text-sm font-bold">{label}{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${className} min-h-[130px] resize-none`} /> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={className} />}</label>; }
