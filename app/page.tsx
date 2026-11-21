"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  ArrowRight,
  Brain,
  BookMarked,
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
  Volume2,
  X,
  Zap
} from "lucide-react";
import { requestJson } from "@/lib/request-json";
import { parseVocabulary } from "@/lib/parser";
import type { Category, LeaderboardSnapshot, ReviewRating, Word } from "@/lib/types";
import { PWAInstallButton } from "@/components/pwa-register";
import { PREFIX_GROUPS, PREFIX_WORD_COUNT } from "@/lib/prefix-vocabulary";
import { PatternLearningView } from "@/components/pattern-learning";
import { isSentencePattern, SENTENCE_PATTERN_CATEGORY } from "@/lib/pattern-learning";

type Tab = "dashboard" | "review" | "quiz" | "fill" | "import" | "leaderboard" | "mastered" | "roots" | "patterns";

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

const WORD_CACHE_PREFIX = "msc-vocab:words:";
const LEGACY_WORD_CACHE_PREFIX = "lexiflow:words:";

function selectDueWords(words: Word[]) {
  const now = Date.now();
  return words
    .filter((word) => word.correct_count < 7 && new Date(word.due_at).getTime() <= now)
    .sort((left, right) => left.due_at.localeCompare(right.due_at) || right.id - left.id);
}

function readWordCache(identity: string) {
  try {
    const cacheKey = encodeURIComponent(identity);
    const raw = window.localStorage.getItem(`${WORD_CACHE_PREFIX}${cacheKey}`)
      ?? window.localStorage.getItem(`${LEGACY_WORD_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { words?: Word[] };
    if (!Array.isArray(parsed.words)) return null;
    return { words: parsed.words };
  } catch {
    return null;
  }
}

function saveWordCache(identity: string, words: Word[]) {
  try {
    window.localStorage.setItem(`${WORD_CACHE_PREFIX}${encodeURIComponent(identity)}`, JSON.stringify({ words }));
  } catch {
    // localStorage can be unavailable in private browsing; PostgreSQL remains the source of truth.
  }
}

type SpeechLanguage = { locale: string; label: string; name: string };

const speechLanguageRules: Array<{ pattern: RegExp; locale: string; label: string; name: string }> = [
  { pattern: /[\u3040-\u30ff\u31f0-\u31ff]/, locale: "ja-JP", label: "日本語", name: "ภาษาญี่ปุ่น" },
  { pattern: /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/, locale: "ko-KR", label: "한국어", name: "ภาษาเกาหลี" },
  { pattern: /[\u0e00-\u0e7f]/, locale: "th-TH", label: "ไทย", name: "ภาษาไทย" },
  { pattern: /[\u0e80-\u0eff]/, locale: "lo-LA", label: "ລາວ", name: "ภาษาลาว" },
  { pattern: /[\u1780-\u17ff\u19e0-\u19ff]/, locale: "km-KH", label: "ខ្មែរ", name: "ภาษาเขมร" },
  { pattern: /[\u1000-\u109f\uaa60-\uaa7f\ua9e0-\ua9ff]/, locale: "my-MM", label: "မြန်မာ", name: "ภาษาพม่า" },
  { pattern: /(?:[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]|[\ud840-\ud87f][\udc00-\udfff])/, locale: "zh-CN", label: "中文", name: "ภาษาจีน" },
  { pattern: /[پچژگ]/, locale: "fa-IR", label: "فارسی", name: "ภาษาเปอร์เซีย" },
  { pattern: /[ٹڈڑںھے]/, locale: "ur-PK", label: "اردو", name: "ภาษาอูรดู" },
  { pattern: /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/, locale: "ar-SA", label: "العربية", name: "ภาษาอาหรับ" },
  { pattern: /[іїєґ]/i, locale: "uk-UA", label: "Українська", name: "ภาษายูเครน" },
  { pattern: /[\u0400-\u04ff\u0500-\u052f]/, locale: "ru-RU", label: "Русский", name: "ภาษารัสเซีย" },
  { pattern: /[\u0590-\u05ff]/, locale: "he-IL", label: "עברית", name: "ภาษาฮีบรู" },
  { pattern: /[\u0370-\u03ff\u1f00-\u1fff]/, locale: "el-GR", label: "Ελληνικά", name: "ภาษากรีก" },
  { pattern: /[\u0900-\u097f]/, locale: "hi-IN", label: "हिन्दी", name: "ภาษาฮินดี" },
  { pattern: /[\u0980-\u09ff]/, locale: "bn-BD", label: "বাংলা", name: "ภาษาเบงกาลี" },
  { pattern: /[\u0a80-\u0aff]/, locale: "gu-IN", label: "ગુજરાતી", name: "ภาษาคุชราต" },
  { pattern: /[\u0a00-\u0a7f]/, locale: "pa-IN", label: "ਪੰਜਾਬੀ", name: "ภาษาปัญจาบ" },
  { pattern: /[\u0b80-\u0bff]/, locale: "ta-IN", label: "தமிழ்", name: "ภาษาทมิฬ" },
  { pattern: /[\u0c00-\u0c7f]/, locale: "te-IN", label: "తెలుగు", name: "ภาษาเตลูกู" },
  { pattern: /[\u0c80-\u0cff]/, locale: "kn-IN", label: "ಕನ್ನಡ", name: "ภาษากันนาดา" },
  { pattern: /[\u0d00-\u0d7f]/, locale: "ml-IN", label: "മലയാളം", name: "ภาษามาลายาลัม" },
  { pattern: /[\u0d80-\u0dff]/, locale: "si-LK", label: "සිංහල", name: "ภาษาสิงหล" },
  { pattern: /[\u0530-\u058f]/, locale: "hy-AM", label: "Հայերեն", name: "ภาษาอาร์เมเนีย" },
  { pattern: /[\u10a0-\u10ff\u2d00-\u2d2f]/, locale: "ka-GE", label: "ქართული", name: "ภาษาจอร์เจีย" },
  { pattern: /[\u1200-\u137f]/, locale: "am-ET", label: "አማርኛ", name: "ภาษาอัมฮารา" },
  { pattern: /[ğışİ]/, locale: "tr-TR", label: "Türkçe", name: "ภาษาตุรกี" },
  { pattern: /[łąćęńśźżŁĄĆĘŃŚŹŻ]/, locale: "pl-PL", label: "Polski", name: "ภาษาโปแลนด์" },
  { pattern: /[ľĺŕĽĹŔ]/, locale: "sk-SK", label: "Slovenčina", name: "ภาษาสโลวัก" },
  { pattern: /[čďěňřšťůžČĎĚŇŘŠŤŮŽ]/, locale: "cs-CZ", label: "Čeština", name: "ภาษาเช็ก" },
  { pattern: /[ăîșțşţĂÎȘȚŞŢ]/, locale: "ro-RO", label: "Română", name: "ภาษาโรมาเนีย" },
  { pattern: /[đơưĐƠƯ]/, locale: "vi-VN", label: "Tiếng Việt", name: "ภาษาเวียดนาม" },
  { pattern: /[ìòÌÒ]/, locale: "it-IT", label: "Italiano", name: "ภาษาอิตาลี" }
];

function detectSpeechLanguage(text: string, fallback: "en-US" | "th-TH"): SpeechLanguage {
  const detected = speechLanguageRules.find(({ pattern }) => pattern.test(text));
  if (detected) return detected;
  if (/[ñ¿¡áíóú]/i.test(text)) return { locale: "es-ES", label: "Español", name: "ภาษาสเปน" };
  if (/[ãõ]/i.test(text) || /ão|ões/i.test(text)) return { locale: "pt-BR", label: "Português", name: "ภาษาโปรตุเกส" };
  if (/[àâçèêëîïôùûüÿœæé]/i.test(text)) return { locale: "fr-FR", label: "Français", name: "ภาษาฝรั่งเศส" };
  if (/[äöß]/i.test(text)) return { locale: "de-DE", label: "Deutsch", name: "ภาษาเยอรมัน" };
  return fallback === "th-TH"
    ? { locale: fallback, label: "ไทย", name: "ภาษาไทย" }
    : { locale: fallback, label: "EN", name: "ภาษาอังกฤษ" };
}

let speechRequestId = 0;
let speechVoices: SpeechSynthesisVoice[] = [];
let speechVoicesRequest: Promise<SpeechSynthesisVoice[]> | null = null;

function stopSpeech() {
  ++speechRequestId;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

function loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  const synthesis = window.speechSynthesis;
  const currentVoices = synthesis.getVoices();
  if (currentVoices.length) {
    speechVoices = currentVoices;
    return Promise.resolve(currentVoices);
  }
  if (speechVoices.length) return Promise.resolve(speechVoices);
  if (speechVoicesRequest) return speechVoicesRequest;

  speechVoicesRequest = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let timeoutId: number | undefined;
    const finish = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      synthesis.removeEventListener("voiceschanged", finish);
      const voices = synthesis.getVoices();
      if (voices.length) speechVoices = voices;
      resolve(voices);
    };
    synthesis.addEventListener("voiceschanged", finish, { once: true });
    timeoutId = window.setTimeout(finish, 700);
  }).finally(() => { speechVoicesRequest = null; });
  return speechVoicesRequest;
}

async function speakText(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synthesis = window.speechSynthesis;
  synthesis.cancel();
  const requestId = ++speechRequestId;
  const voices = await loadSpeechVoices();
  if (requestId !== speechRequestId) return;

  const languageCode = lang.split("-")[0].toLowerCase();
  const voice = voices.find((item) => item.lang.toLowerCase() === lang.toLowerCase())
    ?? voices.find((item) => item.lang.toLowerCase().startsWith(`${languageCode}-`));
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang || lang;
  utterance.rate = languageCode === "th" ? 0.9 : 0.85;
  if (voice) utterance.voice = voice;
  synthesis.speak(utterance);
}

function VoiceButton({ text, lang, label }: { text: string; lang: "en-US" | "th-TH"; label: string }) {
  const speechLanguage = detectSpeechLanguage(text, lang);
  const actionLabel = label.includes("คำแปล") ? "ฟังคำแปล" : "ฟังคำศัพท์";
  const accessibleLabel = `${actionLabel} · ${speechLanguage.name}`;
  return <button type="button" onClick={(event) => { event.stopPropagation(); void speakText(text, speechLanguage.locale); }} className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-2.5 py-2 text-xs font-bold text-ink/55 transition hover:border-coral/40 hover:text-coral" aria-label={accessibleLabel} title={accessibleLabel}><Volume2 size={14} />{speechLanguage.label}</button>;
}

function AuthGate({ loading }: { loading?: boolean }) {
  const googleReady = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";
  return <main className="grid min-h-screen place-items-center px-5 py-10"><section className="w-full max-w-md rounded-[32px] border border-ink/10 bg-white p-8 text-center shadow-soft sm:p-10"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-ink text-white"><Sparkles size={26} /></div><p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-coral">msc vocabulary</p><h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em]">เข้าสู่ MSC Vocab</h1><p className="mt-4 text-sm leading-7 text-ink/50">คลังคำศัพท์ของคุณจะถูกแยกตามบัญชี Google แต่ละคนจะเห็นและจัดการคำศัพท์ของตัวเองเท่านั้น</p><button disabled={loading || !googleReady} onClick={() => void signIn("google", { callbackUrl: "/" })} className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-ink px-5 py-4 text-sm font-bold text-white transition hover:bg-coral disabled:cursor-not-allowed disabled:opacity-40"><LogIn size={17} />{loading ? "กำลังตรวจสอบ session…" : "เข้าสู่ระบบด้วย Google"}</button>{!googleReady && <p className="mt-5 rounded-2xl bg-sand px-4 py-3 text-left text-xs leading-5 text-ink/60">ยังไม่ได้เปิด Google OAuth: ใส่ `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` และตั้ง `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true` ใน `.env` แล้ว restart server</p>}</section></main>;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [words, setWords] = useState<Word[]>([]);
  const [dueWords, setDueWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [learningCategoryId, setLearningCategoryId] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardSnapshot | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const learnerKey = session?.user?.email?.trim().toLowerCase() || null;

  useEffect(() => {
    if ("speechSynthesis" in window) void loadSpeechVoices();
  }, []);

  const loadWords = useCallback(async (identity: string) => {
    const cached = readWordCache(identity);
    if (cached) {
      setWords(cached.words);
      setDueWords(selectDueWords(cached.words));
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch("/api/words?includeDue=1", { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error("โหลดคลังคำศัพท์ไม่สำเร็จ");
      const payload = (await response.json()) as { words: Word[]; dueWordIds: number[] };
      const nextWords = payload.words;
      const wordsById = new Map(nextWords.map((word) => [word.id, word]));
      const nextDueWords = payload.dueWordIds.flatMap((id) => {
        const word = wordsById.get(id);
        return word ? [word] : [];
      });
      setWords(nextWords);
      setDueWords(nextDueWords);
      saveWordCache(identity, nextWords);
    } catch {
      if (!cached) {
        setWords([]);
        setDueWords([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!learnerKey) return;
    void loadWords(learnerKey);
  }, [loadWords, learnerKey]);
  useEffect(() => {
    if (!learnerKey) return;
    void fetch("/api/categories", { signal: AbortSignal.timeout(30_000) }).then((response) => response.json()).then((data) => setCategories(data as Category[]));
  }, [learnerKey]);
  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      setLeaderboard(await requestJson<LeaderboardSnapshot>("/api/leaderboard"));
    } catch (error) {
      setLeaderboardError(error instanceof Error ? error.message : "โหลดอันดับไม่สำเร็จ");
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);
  useEffect(() => {
    if (learnerKey && activeTab === "leaderboard") void loadLeaderboard();
  }, [activeTab, learnerKey, loadLeaderboard]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const patternWords = useMemo(() => words.filter(isSentencePattern), [words]);
  const vocabularyWords = useMemo(() => words.filter((word) => !isSentencePattern(word)), [words]);
  const vocabularyDueWords = useMemo(() => dueWords.filter((word) => !isSentencePattern(word)), [dueWords]);
  const vocabularyCategories = useMemo(() => categories.filter((category) => category.name.trim().toLowerCase() !== SENTENCE_PATTERN_CATEGORY), [categories]);
  const reviewedToday = useMemo(() => vocabularyWords.filter((word) => word.last_reviewed?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length, [vocabularyWords]);
  const masteredWords = useMemo(() => vocabularyWords.filter((word) => word.correct_count >= 7), [vocabularyWords]);
  const mastered = masteredWords.length;
  const learningWords = useMemo(() => vocabularyWords.filter((word) => word.correct_count < 7 && (!learningCategoryId || word.category_id === learningCategoryId)), [learningCategoryId, vocabularyWords]);
  const scopedDueWords = useMemo(() => learningCategoryId ? vocabularyDueWords.filter((word) => word.category_id === learningCategoryId) : vocabularyDueWords, [vocabularyDueWords, learningCategoryId]);

  function navigate(tab: Tab) {
    stopSpeech();
    setActiveTab(tab);
    setSidebarOpen(false);
  }

  async function reviewWord(id: number, rating: ReviewRating, quiet = false) {
    const updated = await requestJson<{ dueAt: string; intervalDays: number; reviewCount: number; correctCount: number; lastReviewed: string }>(`/api/words/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating })
    });
    const nextWords = words.map((word) => word.id === id ? {
      ...word,
      due_at: updated.dueAt,
      interval_days: updated.intervalDays,
      review_count: updated.reviewCount,
      correct_count: updated.correctCount,
      last_reviewed: updated.lastReviewed
    } : word);
    const nextDueWords = selectDueWords(nextWords);
    setWords(nextWords);
    setDueWords(nextDueWords);
    if (learnerKey) saveWordCache(learnerKey, nextWords);
    if (!quiet) setToast(updated.correctCount >= 7 ? "จำคำนี้ได้แม่นแล้ว! ย้ายไปอยู่ในส่วนจำแม่น" : rating === "known" ? `จำได้แล้ว · สะสม ${updated.correctCount}/7 ครั้ง` : "บันทึกไว้ทบทวนอีกครั้งใน 10 นาที");
  }

  async function recordCorrectWords(wordIds: number[]) {
    const uniqueIds = Array.from(new Set(wordIds));
    if (!uniqueIds.length) return;
    const result = await requestJson<{ updated: Array<{ id: number; correct_count: number }> }>("/api/words/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordIds: uniqueIds })
    });
    const counts = new Map(result.updated.map((word) => [word.id, word.correct_count]));
    const nextWords = words.map((word) => counts.has(word.id) ? { ...word, correct_count: counts.get(word.id)! } : word);
    setWords(nextWords);
    setDueWords(selectDueWords(nextWords));
    if (learnerKey) saveWordCache(learnerKey, nextWords);
  }

  async function saveQuizAttempt(score: number, totalQuestions: number, correctWordIds: number[]) {
    const [boardResult, progressResult] = await Promise.allSettled([
      requestJson<LeaderboardSnapshot>("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, totalQuestions })
      }),
      recordCorrectWords(correctWordIds)
    ]);
    if (progressResult.status === "rejected") setToast("บันทึกคะแนนควิซแล้ว แต่บันทึกความจำคำศัพท์ไม่สำเร็จ");
    if (boardResult.status === "rejected") throw boardResult.reason;
    setLeaderboard(boardResult.value);
    return boardResult.value;
  }

  if (status === "loading") return <AuthGate loading />;
  if (!session?.user?.email) return <AuthGate />;

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1480px]">
        <aside className={`fixed inset-y-0 left-0 z-30 w-[270px] shrink-0 border-r border-ink/10 bg-[#faf9f5] px-5 py-6 transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between px-2">
            <button className="flex items-center gap-3" onClick={() => navigate("dashboard")} aria-label="ไปหน้าแรก">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-white shadow-card"><Sparkles size={18} /></span>
              <span className="text-left"><span className="block font-display text-xl font-bold tracking-tight">MSC Vocab</span><span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-ink/40">english vocabulary</span></span>
            </button>
            <button className="rounded-lg p-2 text-ink/50 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="ปิดเมนู"><X size={18} /></button>
          </div>

          <div className="mt-12 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/35">workspace</div>
          <nav className="mt-3 space-y-1">
            <NavItem active={activeTab === "dashboard"} icon={<LayoutDashboard size={18} />} label="ภาพรวม" onClick={() => navigate("dashboard")} />
            <NavItem active={activeTab === "review"} icon={<RotateCcw size={18} />} label="ทบทวนวันนี้" badge={vocabularyDueWords.length} onClick={() => navigate("review")} />
            <NavItem active={activeTab === "mastered"} icon={<Brain size={18} />} label="จำแม่น" badge={mastered} onClick={() => navigate("mastered")} />
            <NavItem active={activeTab === "roots"} icon={<BookMarked size={18} />} label="เรียนรู้รากศัพท์" onClick={() => navigate("roots")} />
            <NavItem active={activeTab === "patterns"} icon={<BookOpen size={18} />} label="ฝึกกลุ่มประโยค" onClick={() => navigate("patterns")} />
            <NavItem active={activeTab === "quiz"} icon={<CircleHelp size={18} />} label="ควิซคำศัพท์" onClick={() => navigate("quiz")} />
            <NavItem active={activeTab === "leaderboard"} icon={<Trophy size={18} />} label="สถิติและอันดับ" onClick={() => navigate("leaderboard")} />
            <NavItem active={activeTab === "fill"} icon={<GraduationCap size={18} />} label="เติมคำจากคำแปล" onClick={() => navigate("fill")} />
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
            <div className="hidden items-center gap-2 text-sm text-ink/40 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" /> ระบบพร้อมใช้งาน <span className="text-ink/20">/</span> {activeTab === "dashboard" ? "ภาพรวม" : activeTab === "review" ? "ทบทวน" : activeTab === "quiz" ? "ควิซ" : activeTab === "fill" ? "เติมคำ" : activeTab === "leaderboard" ? "สถิติและอันดับ" : activeTab === "mastered" ? "จำแม่น" : activeTab === "roots" ? "เรียนรู้รากศัพท์" : activeTab === "patterns" ? "ฝึกกลุ่มประโยค" : "นำเข้า"}</div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block"><p className="text-xs font-semibold text-ink/40">{session?.user?.email ? "บัญชีของคุณ" : "โหมดทดลอง"}</p><p className="text-sm font-bold">{session?.user?.name || "Guest learner"}</p></div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-coral/15 font-bold text-coral">{session?.user?.name?.slice(0, 1).toUpperCase() || "G"}</div>
              <PWAInstallButton />
              {session?.user ? <button onClick={() => void signOut({ callbackUrl: "/" })} className="flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink/60 transition hover:border-coral/40 hover:text-coral"><LogOut size={14} /> <span className="hidden sm:inline">ออกจากระบบ</span></button> : <button onClick={() => void signIn("google")} className="hidden items-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white transition hover:bg-ink/90 sm:flex"><LogIn size={14} /> Login with Google</button>}
            </div>
          </header>

          <div className="mx-auto max-w-[1100px]">
            {(activeTab === "review" || activeTab === "quiz" || activeTab === "fill") && <LearningScope categories={vocabularyCategories} value={learningCategoryId} onChange={setLearningCategoryId} />}
            {activeTab === "dashboard" && <Dashboard words={vocabularyWords} dueWords={vocabularyDueWords} mastered={mastered} reviewedToday={reviewedToday} loading={loading} onNavigate={navigate} />}
            {activeTab === "review" && <ReviewView words={scopedDueWords} loading={loading} onReview={reviewWord} onNavigate={navigate} />}
            {activeTab === "quiz" && <QuizView words={learningWords} onComplete={saveQuizAttempt} />}
            {activeTab === "mastered" && <MasteredView words={masteredWords} loading={loading} />}
            {activeTab === "roots" && <RootLearningView />}
            {activeTab === "patterns" && <PatternLearningView key={learnerKey} words={patternWords} loading={loading} onReview={(id, rating) => reviewWord(id, rating, true)} onSpeak={speakText} onStopSpeech={stopSpeech} />}
            {activeTab === "leaderboard" && <LeaderboardView data={leaderboard} loading={leaderboardLoading} error={leaderboardError} onRetry={() => void loadLeaderboard()} />}
            {activeTab === "fill" && <FillView words={learningWords} onCorrect={recordCorrectWords} onToast={setToast} />}
            {activeTab === "import" && <ImportView categories={categories} onCategoryCreated={(category) => setCategories((current) => [...current, category])} onDone={async (message) => { setToast(message); const [, categoryResponse] = await Promise.all([learnerKey ? loadWords(learnerKey) : Promise.resolve(), fetch("/api/categories")]); setCategories((await categoryResponse.json()) as Category[]); navigate("dashboard"); }} />}
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

function LearningScope({ categories, value, onChange }: { categories: Category[]; value: number | null; onChange: (value: number | null) => void }) {
  return <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lilac text-ink"><Target size={16} /></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/35">learning scope</p><p className="text-sm font-bold">เลือกคลังที่จะเรียนรู้</p></div></div><select value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} className="rounded-xl border border-ink/10 bg-cream px-3 py-2.5 text-sm font-semibold outline-none focus:border-coral"><option value="">ทุกคำศัพท์</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name} · {category.word_count} คำ</option>)}</select></div>;
}

function Dashboard({ words, dueWords, mastered, reviewedToday, loading, onNavigate }: { words: Word[]; dueWords: Word[]; mastered: number; reviewedToday: number; loading: boolean; onNavigate: (tab: Tab) => void }) {
  return <div className="py-10 lg:py-14">
    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="mb-3 flex items-center gap-2 text-sm font-bold text-coral"><span className="h-2 w-2 rounded-full bg-coral" /> {getGreeting()}, นักเรียน</p><h1 className="font-display text-4xl font-bold tracking-[-0.04em] text-ink sm:text-5xl">พร้อมเรียนรู้คำใหม่<br /><span className="text-ink/35">ทีละคำไหม?</span></h1><p className="mt-5 max-w-md text-sm leading-7 text-ink/55">ทบทวนให้ถูกจังหวะ แล้วคำศัพท์จะย้ายจากความจำสั้นไปอยู่ในคลังระยะยาว</p></div><button onClick={() => onNavigate(dueWords.length ? "review" : "import")} className="group flex w-fit items-center gap-3 rounded-2xl bg-coral px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-coral/20 transition hover:-translate-y-0.5">{dueWords.length ? "เริ่มทบทวน" : "เพิ่มคำศัพท์แรก"}<ArrowRight size={17} className="transition group-hover:translate-x-1" /></button></div>
    <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4"><StatCard icon={<BookOpen size={18} />} label="คำศัพท์ทั้งหมด" value={loading ? "—" : words.length} tone="lilac" /><StatCard icon={<Clock3 size={18} />} label="ถึงเวลาทบทวน" value={loading ? "—" : dueWords.length} tone="sand" /><StatCard icon={<Brain size={18} />} label="จำแม่น · ถูก 7 ครั้งขึ้นไป" value={loading ? "—" : mastered} tone="mint" /><StatCard icon={<Flame size={18} />} label="ทบทวนวันนี้" value={reviewedToday} tone="coral" /></div>
    <button onClick={() => onNavigate("mastered")} className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-coral"><Brain size={16} /> ดูคลังคำศัพท์ที่จำแม่นแล้ว <ArrowRight size={15} /></button>
    <div className="mt-8 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="grid-paper overflow-hidden rounded-[28px] border border-ink/10 bg-white p-6 shadow-card sm:p-8"><div className="flex items-start justify-between"><div><span className="mb-4 inline-flex items-center gap-2 rounded-full bg-coral/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-coral"><Zap size={13} /> Focus session</span><h2 className="font-display text-2xl font-bold">วันนี้มี {dueWords.length} คำรอคุณอยู่</h2><p className="mt-2 max-w-sm text-sm leading-6 text-ink/50">เซสชันสั้น ๆ 5 นาที ช่วยให้จำได้แม่นกว่าการอ่านซ้ำยาว ๆ</p></div><div className="hidden h-16 w-16 place-items-center rounded-full border-[7px] border-coral/15 border-t-coral text-sm font-bold text-coral sm:grid">{Math.min(Math.round((reviewedToday / Math.max(words.length, 1)) * 100), 100)}%</div></div><div className="mt-8 flex items-center gap-3">{dueWords.slice(0, 3).map((word, index) => <div key={word.id} className={`flex h-14 w-14 -rotate-${index % 2 ? "2" : "1"} items-center justify-center rounded-2xl border border-ink/10 bg-white text-[10px] font-bold shadow-sm ${index === 1 ? "-translate-y-2" : ""}`}>{word.term.slice(0, 9)}{word.term.length > 9 ? "…" : ""}</div>)}{!dueWords.length && <div className="flex h-14 items-center gap-3 rounded-2xl bg-mint/70 px-4 text-sm font-semibold text-ink/70"><Check size={17} /> เยี่ยม! วันนี้เคลียร์หมดแล้ว</div>}<button onClick={() => onNavigate("review")} className="ml-auto hidden items-center gap-2 text-sm font-bold text-ink/55 transition hover:text-coral sm:flex">ดูทั้งหมด <ChevronRight size={16} /></button></div></section>
      <section className="rounded-[28px] bg-ink p-6 text-white shadow-soft sm:p-8"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white/45">Your learning rhythm</p><h2 className="mt-1 font-display text-2xl font-bold">รักษาจังหวะไว้</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-coral"><Heart size={19} fill="currentColor" /></span></div><div className="mt-10 flex items-end gap-2">{[35, 55, 42, 75, 62, reviewedToday ? 88 : 28, 12].map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className={`w-full rounded-t-lg ${index === 5 ? "bg-coral" : "bg-white/15"}`} style={{ height: `${height}px` }} /><span className="text-[10px] text-white/30">{["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"][index]}</span></div>)}</div><div className="mt-7 flex items-center gap-3 border-t border-white/10 pt-5"><span className="text-3xl font-bold">{reviewedToday}</span><span className="text-sm leading-5 text-white/45">คำที่ทบทวนวันนี้<br />เป้าหมาย 10 คำ</span></div></section>
    </div>
    <section className="mt-8 rounded-[28px] border border-ink/10 bg-white p-6 shadow-card sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/35">your library</p><h2 className="mt-1 font-display text-2xl font-bold">คำศัพท์ล่าสุด</h2></div><button onClick={() => onNavigate("import")} className="flex items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold text-ink/60 transition hover:border-coral/40 hover:text-coral"><Plus size={15} /> เพิ่มคำ</button></div><div className="mt-5 divide-y divide-ink/8">{loading ? <div className="py-10 text-center text-sm text-ink/40">กำลังโหลดคลังคำศัพท์…</div> : words.slice(0, 5).map((word) => <div key={word.id} className="flex items-center gap-3 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lilac text-sm font-bold text-ink">{word.term.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{word.term} <span className="ml-1 text-xs font-medium text-ink/35">{word.part_of_speech}</span></p><p className="line-clamp-2 text-xs text-ink/45">{word.definition}</p></div><span className="hidden text-xs text-ink/35 sm:block">{word.review_count ? `ทบทวนแล้ว ${word.review_count} ครั้ง` : "ยังไม่เริ่ม"}</span><div className="flex shrink-0 items-center gap-1"><VoiceButton text={word.term} lang="en-US" label="ฟังคำศัพท์ภาษาอังกฤษ" /><VoiceButton text={word.definition} lang="th-TH" label="ฟังคำแปลภาษาไทย" /><ChevronRight size={16} className="text-ink/20" /></div></div>)}{!loading && !words.length && <div className="py-10 text-center text-sm text-ink/40">ยังไม่มีคำศัพท์ ลองนำเข้าเลย</div>}</div></section>
  </div>;
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: "lilac" | "sand" | "mint" | "coral" }) {
  const tones = { lilac: "bg-lilac", sand: "bg-sand", mint: "bg-mint", coral: "bg-coral/10" };
  return <div className="rounded-2xl border border-ink/8 bg-white p-4 shadow-card sm:p-5"><span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]} text-ink`}>{icon}</span><p className="mt-5 text-xs font-semibold text-ink/45">{label}</p><p className="mt-1 font-display text-3xl font-bold tracking-tight">{value}</p></div>;
}

function MasteredView({ words, loading }: { words: Word[]; loading: boolean }) {
  return <div className="py-10 lg:py-14"><PageTitle eyebrow="mastered vocabulary" title="คลังคำศัพท์ที่จำแม่น" description="คำจะย้ายมาที่นี่เมื่อคุณตอบถูกในควิซ เติมคำ หรือกด ‘จำได้แล้ว’ ในโหมดทบทวน รวมอย่างน้อย 7 ครั้ง" />
    <div className="mt-7 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-mint px-5 py-4"><Brain className="shrink-0 text-emerald-700" size={20} /><p className="text-sm font-semibold text-emerald-900">จำแม่นแล้ว {words.length} คำ · คำในคลังนี้จะไม่ถูกรวมในชุดฝึกปกติ</p></div>
    <section className="mt-6 overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-card"><div className="divide-y divide-ink/8">{loading ? <p className="p-8 text-center text-sm text-ink/45">กำลังโหลดคำศัพท์…</p> : words.map((word) => <article key={word.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-7"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint font-bold text-emerald-800">{word.term.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="break-words font-bold">{word.term} <span className="ml-1 text-xs font-medium text-ink/35">{word.part_of_speech}</span></p><p className="mt-1 text-sm text-ink/55">{word.definition}</p>{word.category_name && <p className="mt-1 text-xs text-ink/35">{word.category_name}</p>}</div><span className="rounded-full bg-mint px-3 py-1.5 text-xs font-bold text-emerald-800">ถูก {word.correct_count} ครั้ง</span><div className="flex gap-1"><VoiceButton text={word.term} lang="en-US" label="ฟังคำศัพท์ภาษาอังกฤษ" /><VoiceButton text={word.definition} lang="th-TH" label="ฟังคำแปลภาษาไทย" /></div></article>)}{!loading && !words.length && <div className="p-10 text-center"><Brain className="mx-auto text-ink/20" size={30} /><p className="mt-4 font-bold">ยังไม่มีคำศัพท์ในคลังจำแม่น</p><p className="mt-2 text-sm text-ink/45">ฝึกคำศัพท์จากโหมดทบทวน ควิซ หรือเติมคำ เมื่อสะสมคำตอบถูกครบ 7 ครั้ง คำนั้นจะมาอยู่ที่นี่</p></div>}</div></section>
  </div>;
}

function RootLearningView() {
  const [groupIndex, setGroupIndex] = useState(0);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const group = PREFIX_GROUPS[groupIndex];
  const example = group.examples[exampleIndex];

  function chooseGroup(index: number) {
    setGroupIndex(index);
    setExampleIndex(0);
    setShowMeaning(false);
  }

  function chooseExample(index: number) {
    setExampleIndex(index);
    setShowMeaning(false);
  }

  function nextExample() {
    chooseExample((exampleIndex + 1) % group.examples.length);
  }

  function randomExample() {
    const nextGroupIndex = Math.floor(Math.random() * PREFIX_GROUPS.length);
    const nextGroup = PREFIX_GROUPS[nextGroupIndex];
    chooseGroup(nextGroupIndex);
    setExampleIndex(Math.floor(Math.random() * nextGroup.examples.length));
    setShowMeaning(false);
  }

  if (!group || !example) return null;
  return <div className="py-10 lg:py-14"><PageTitle eyebrow="prefix roots · ก.พ. & TOEIC" title="เรียนรู้รากศัพท์จาก Prefix" description={`จำความหมายของคำอุปสรรค แล้วใช้เดาคำศัพท์ใหม่จากส่วนหน้าของคำได้ง่ายขึ้น · ${PREFIX_GROUPS.length} กลุ่ม ${PREFIX_WORD_COUNT} คำ`} />
    <div className="mt-7 flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-white px-5 py-4 shadow-card"><BookMarked className="text-coral" size={20} /><p className="text-sm font-semibold text-ink/70">Prefix คือส่วนที่เติมหน้าคำศัพท์ เช่น <strong>re-</strong> แปลว่า “อีกครั้ง” ดังนั้น <strong>rewrite</strong> คือ “เขียนใหม่”</p></div>
    <div className="mt-7 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-[28px] border border-ink/10 bg-white p-4 shadow-card"><div className="flex items-center justify-between px-2"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">20 groups</p><h2 className="mt-1 font-display text-xl font-bold">เลือก Prefix</h2></div><span className="rounded-full bg-lilac px-2.5 py-1 text-xs font-bold">{groupIndex + 1}/20</span></div><div className="mt-4 max-h-[560px] space-y-1 overflow-y-auto pr-1">{PREFIX_GROUPS.map((item, index) => <button key={item.prefix} onClick={() => chooseGroup(index)} className={`w-full rounded-2xl px-3 py-3 text-left transition ${index === groupIndex ? "bg-ink text-white shadow-card" : "text-ink/60 hover:bg-ink/5 hover:text-ink"}`}><span className="block font-bold">{item.prefix}</span><span className={`mt-1 block text-xs ${index === groupIndex ? "text-white/55" : "text-ink/40"}`}>{item.meaning}</span></button>)}</div></aside>
      <section className="min-w-0 rounded-[28px] border border-ink/10 bg-white p-5 shadow-card sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">group {groupIndex + 1} · {group.examples.length} examples</p><h2 className="mt-2 font-display text-4xl font-bold">{group.prefix}</h2><p className="mt-2 text-sm font-semibold text-ink/50">ความหมาย: {group.meaning}</p></div><button onClick={randomExample} className="flex w-fit items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold text-ink/60 transition hover:border-coral/40 hover:text-coral"><Sparkles size={14} /> สุ่มคำ</button></div>
        <div className="mt-7 rounded-[26px] bg-ink p-6 text-white sm:p-9"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/60">ตัวอย่างที่ {exampleIndex + 1} / {group.examples.length}</span><div className="flex flex-wrap gap-2"><VoiceButton text={example[0]} lang="en-US" label="ฟังคำศัพท์ภาษาอังกฤษ" /><VoiceButton text={example[1]} lang="th-TH" label="ฟังคำแปลภาษาไทย" /></div></div><p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-white/40">คำที่มี Prefix นี้</p><h3 className="mt-3 break-words font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{example[0]}</h3><div className="mt-7 min-h-16 rounded-2xl bg-white/10 px-5 py-4">{showMeaning ? <p className="text-lg font-semibold">{example[1]}</p> : <button onClick={() => setShowMeaning(true)} className="text-sm font-bold text-white/65 transition hover:text-white">กดเพื่อดูคำแปลภาษาไทย <span className="ml-1 text-white/35">space</span></button>}</div><div className="mt-7 flex flex-wrap gap-2"><button onClick={() => setShowMeaning((value) => !value)} className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-ink">{showMeaning ? "ซ่อนคำแปล" : "แสดงคำแปล"}</button><button onClick={nextExample} className="flex items-center gap-2 rounded-xl bg-coral px-4 py-2.5 text-xs font-bold text-white">คำถัดไป <ArrowRight size={14} /></button></div></div>
        <div className="mt-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/35">คำศัพท์ในกลุ่ม {group.prefix}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{group.examples.map((item, index) => <button key={item[0]} onClick={() => chooseExample(index)} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${index === exampleIndex ? "border-coral bg-coral/5" : "border-ink/8 hover:border-coral/40"}`}><span className="min-w-0"><span className="block truncate text-sm font-bold">{item[0]}</span><span className="mt-1 block truncate text-xs text-ink/45">{item[1]}</span></span><span className="shrink-0 text-xs font-bold text-ink/25">{index + 1}</span></button>)}</div></div>
      </section>
    </div>
  </div>;
}

function ReviewView({ words, loading, onReview, onNavigate }: { words: Word[]; loading: boolean; onReview: (id: number, rating: ReviewRating) => Promise<void>; onNavigate: (tab: Tab) => void }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const current = words[index];
  const isSentencePattern = current?.category_name === "pattle กลุ่มประโยค";
  useEffect(() => { setIndex(0); setRevealed(false); }, [words.length]);
  async function finish(rating: ReviewRating) { if (!current) return; await onReview(current.id, rating); setRevealed(false); }
  if (loading) return <PageTitle eyebrow="review mode" title="กำลังเตรียมคำศัพท์…" />;
  if (!current) return <div className="py-20 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-mint text-ink"><Trophy size={32} /></div><h1 className="mt-7 font-display text-3xl font-bold">เคลียร์หมดแล้ว!</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-ink/50">ไม่มีคำที่ถึงเวลาทบทวนในตอนนี้ กลับมาใหม่อีกครั้งเมื่อถึงจังหวะ</p><button onClick={() => onNavigate("quiz")} className="mt-7 rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-white">ไปฝึกควิซแทน</button></div>;
  return <div className={`mx-auto py-10 lg:py-14 ${isSentencePattern ? "max-w-3xl" : "max-w-2xl"}`}><PageTitle eyebrow={`${isSentencePattern ? "sentence pattern" : "review mode"} · ${Math.min(index + 1, words.length)} / ${words.length}`} title="ทบทวนให้จำได้" description={isSentencePattern ? "อ่านรูปแบบประโยคภาษาอังกฤษ แล้วลองนึกความหมายภาษาไทยก่อนเปิดคำแปล" : "ลองนึกคำแปลก่อนเปิดการ์ด แล้วเลือกตามความรู้สึกจริงของคุณ"} /><div className={`mt-10 overflow-hidden rounded-[32px] border bg-white shadow-soft ${isSentencePattern ? "border-coral/20" : "border-ink/10"}`}><div className="h-2 bg-ink/5"><div className="h-full bg-coral transition-all duration-500" style={{ width: `${((index + 1) / words.length) * 100}%` }} /></div><div className={`text-center ${isSentencePattern ? "px-5 py-9 sm:px-10 sm:py-12" : "px-7 py-12 sm:px-14 sm:py-16"}`}><span className="rounded-full bg-lilac px-3 py-1.5 text-xs font-bold text-ink">{isSentencePattern ? "รูปแบบประโยค" : current.part_of_speech || "word"}</span><div className={`mt-7 rounded-3xl border px-5 py-6 text-left ${isSentencePattern ? "border-coral/15 bg-cream/70 sm:px-8 sm:py-8" : "border-transparent px-0 py-0 text-center"}`}><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink/35">{isSentencePattern ? "English pattern" : "คำศัพท์"}</p><h2 className={`break-words font-bold ${isSentencePattern ? "font-sans text-2xl leading-[1.8] tracking-normal text-ink sm:text-3xl" : "font-display text-5xl tracking-[-0.05em] sm:text-6xl"}`}>{current.term}</h2></div><div className="mt-5 flex flex-wrap justify-center gap-2"><VoiceButton text={current.term} lang="en-US" label="ฟังคำศัพท์ภาษาอังกฤษ" /><VoiceButton text={current.definition} lang="th-TH" label="ฟังคำแปลภาษาไทย" /></div><p className="mt-4 text-xs text-ink/35">ทบทวนครั้งล่าสุด: {formatDate(current.last_reviewed)}</p>{revealed ? <div className={`mt-8 rounded-2xl bg-cream px-5 py-5 text-left ${isSentencePattern ? "sm:px-7 sm:py-6" : "mt-11"}`}><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/35">{isSentencePattern ? "คำแปลภาษาไทย" : "คำแปล"}</p><p className={`mt-2 font-semibold ${isSentencePattern ? "text-base leading-8 sm:text-lg" : "text-lg leading-8"}`}>{current.definition}</p></div> : <button onClick={() => setRevealed(true)} className="mt-10 rounded-2xl border border-ink/15 px-6 py-3 text-sm font-bold transition hover:border-coral hover:text-coral">เปิดคำแปล <span className="ml-2 text-ink/35">space</span></button>}</div>{revealed && <div className="grid grid-cols-2 gap-3 border-t border-ink/8 bg-cream/60 p-5"><button onClick={() => void finish("again")} className="flex items-center justify-center gap-2 rounded-2xl border border-coral/20 bg-white py-3.5 text-sm font-bold text-coral transition hover:bg-coral hover:text-white"><RotateCcw size={16} /> ยังไม่แม่น</button><button onClick={() => void finish("known")} className="flex items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-sm font-bold text-white transition hover:bg-coral"><Check size={16} /> จำได้แล้ว</button></div>}</div></div>;
}

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) { return <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">{eyebrow}</p><h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] sm:text-5xl">{title}</h1>{description && <p className="mt-4 max-w-lg text-sm leading-7 text-ink/50">{description}</p>}</div>; }

function QuizView({ words, onComplete }: { words: Word[]; onComplete: (score: number, totalQuestions: number, correctWordIds: number[]) => Promise<LeaderboardSnapshot> }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctWordIds, setCorrectWordIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; rank: number | null; bestPercent: number | null; saved: boolean } | null>(null);
  const quizWords = useMemo(() => [...words].sort(() => Math.random() - 0.5).slice(0, Math.min(10, words.length)), [words]);
  const current = quizWords[questionIndex];
  const options = useMemo(() => { if (!current) return []; return [current, ...words.filter((word) => word.id !== current.id).sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5); }, [current, words]);
  function startQuiz() {
    setResult(null);
    setQuestionIndex(0);
    setScore(0);
    setCorrectWordIds([]);
    setSelected(null);
    setStarted(true);
  }
  function answer(term: string) {
    if (selected || !current) return;
    setSelected(term);
    const correct = term === current.term;
    const nextCorrectWordIds = correct ? [...correctWordIds, current.id] : correctWordIds;
    if (correct) {
      setScore((value) => value + 1);
      setCorrectWordIds(nextCorrectWordIds);
    }
    window.setTimeout(() => {
      if (questionIndex + 1 >= quizWords.length) {
        const finalScore = score + (correct ? 1 : 0);
        setStarted(false);
        setQuestionIndex(0);
        setSelected(null);
        setScore(0);
        setResult({ score: finalScore, total: quizWords.length, rank: null, bestPercent: null, saved: false });
        setSaving(true);
        void onComplete(finalScore, quizWords.length, nextCorrectWordIds).then((snapshot) => {
          setResult({ score: finalScore, total: quizWords.length, rank: snapshot.me?.rank ?? null, bestPercent: snapshot.me?.bestPercent ?? null, saved: true });
        }).catch(() => {
          setResult({ score: finalScore, total: quizWords.length, rank: null, bestPercent: null, saved: false });
        }).finally(() => setSaving(false));
      } else {
        setQuestionIndex((value) => value + 1);
        setSelected(null);
      }
    }, 650);
  }
  if (!words.length) return <div className="py-20 text-center"><PageTitle eyebrow="quiz mode" title="เพิ่มคำศัพท์ก่อนเริ่มควิซ" description="นำเข้าคำศัพท์อย่างน้อย 4 คำ เพื่อให้ระบบสร้างตัวเลือกที่เหมาะสม" /></div>;
  if (result) return <div className="mx-auto max-w-2xl py-10 lg:py-14"><PageTitle eyebrow="quiz result" title="บันทึกผลควิซแล้ว" description="คะแนนถูกเก็บในบัญชีของคุณ และนำไปคำนวณอันดับรวม" /><section className="mt-8 rounded-[32px] border border-ink/10 bg-white p-7 text-center shadow-soft sm:p-12"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-mint text-ink"><Trophy size={28} /></div><p className="mt-6 text-sm font-bold text-ink/45">คะแนนรอบนี้</p><p className="mt-1 font-display text-6xl font-bold">{result.score}<span className="text-3xl text-ink/35"> / {result.total}</span></p>{saving ? <p className="mt-6 text-sm text-ink/45">กำลังบันทึกคะแนนและคำนวณอันดับ…</p> : result.saved ? <div className="mt-6 grid gap-3 rounded-2xl bg-cream p-5 text-sm sm:grid-cols-2"><p>อันดับของคุณ <strong className="ml-1 text-coral">{result.rank ? `#${result.rank}` : "—"}</strong></p><p>คะแนนสูงสุด <strong className="ml-1 text-coral">{result.bestPercent ?? 0}%</strong></p></div> : <p className="mt-6 rounded-2xl bg-coral/10 p-4 text-sm text-coral">บันทึกคะแนนไม่สำเร็จ กรุณาตรวจสอบว่ามีตาราง quiz_attempts ใน PostgreSQL แล้ว</p>}<button onClick={startQuiz} className="mt-7 rounded-2xl bg-ink px-6 py-3.5 text-sm font-bold text-white transition hover:bg-coral">เล่นอีกครั้ง</button></section></div>;
  if (!started) return <div className="py-10 lg:py-14"><PageTitle eyebrow="quiz mode" title="พร้อมทดสอบความจำหรือยัง?" description="ควิซแบบเลือกคำแปล สูงสุด 10 ข้อ บันทึกคะแนนและสถิติให้อัตโนมัติทุกครั้ง" /><div className="mt-10 grid gap-5 sm:grid-cols-3"><div className="rounded-[28px] bg-ink p-6 text-white sm:col-span-2"><div className="flex h-full flex-col justify-between"><div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-coral"><GraduationCap size={23} /></span><h2 className="mt-10 font-display text-3xl font-bold">Quick recall</h2><p className="mt-2 max-w-xs text-sm leading-6 text-white/50">ทดสอบคำแปลแบบเร็ว แล้วนำผลไปเทียบอันดับกับผู้เรียนคนอื่น</p></div><button onClick={startQuiz} className="mt-12 flex w-fit items-center gap-3 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-ink transition hover:bg-coral hover:text-white">เริ่มควิซ <ArrowRight size={16} /></button></div></div><div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card"><p className="text-xs font-bold uppercase tracking-[0.15em] text-ink/35">สถิติส่วนตัว</p><p className="mt-4 font-display text-3xl font-bold">ดูผลสะสม</p><p className="mt-3 text-sm text-ink/45">เปิดหน้า “สถิติและอันดับ” เพื่อดูคะแนนสูงสุดและอันดับของคุณ</p></div></div></div>;
  if (!current) return null;
  return <div className="mx-auto max-w-2xl py-10 lg:py-14"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">question {questionIndex + 1} / {quizWords.length}</p><h1 className="mt-3 font-display text-3xl font-bold">เลือกคำแปลที่ตรงที่สุด</h1></div><div className="rounded-2xl bg-white px-4 py-3 text-center shadow-card"><p className="text-[10px] font-bold uppercase tracking-widest text-ink/35">score</p><p className="font-display text-xl font-bold">{score}</p></div></div><div className="mt-8 rounded-[32px] border border-ink/10 bg-white p-7 text-center shadow-soft sm:p-12"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lilac text-ink"><CircleHelp size={23} /></div><p className="mt-7 text-sm font-bold text-ink/35">คำศัพท์นี้แปลว่าอะไร?</p><h2 className="mt-3 font-display text-5xl font-bold tracking-[-0.05em]">{current.term}</h2><div className="mt-5 flex justify-center"><VoiceButton text={current.term} lang="en-US" label="ฟังคำศัพท์ภาษาอังกฤษ" /></div><div className="mt-10 grid gap-3 text-left">{options.map((option) => <button key={option.id} onClick={() => answer(option.term)} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-sm font-semibold transition ${selected ? option.term === current.term ? "border-emerald-400 bg-mint" : option.term === selected ? "border-coral bg-coral/10" : "border-ink/8 opacity-50" : "border-ink/10 hover:border-coral hover:bg-coral/5"}`}><span>{option.definition}</span>{selected && option.term === current.term && <Check size={17} className="text-emerald-600" />}</button>)}</div></div></div>;
}

function LeaderboardView({ data, loading, error, onRetry }: { data: LeaderboardSnapshot | null; loading: boolean; error: string | null; onRetry: () => void }) {
  const me = data?.me;
  return <div className="py-10 lg:py-14"><PageTitle eyebrow="quiz statistics" title="สถิติและอันดับ" description="อันดับจัดตามคะแนนสูงสุดเป็นเปอร์เซ็นต์ เพื่อให้เทียบกันได้แม้จำนวนข้อในแต่ละรอบต่างกัน" />
    <p className="mt-4 text-xs leading-5 text-ink/45">ชื่อบัญชี Google และสถิติควิซจะแสดงให้ผู้ใช้ที่เข้าสู่ระบบเห็น โดยไม่แสดงอีเมล</p>
    {error && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-coral/25 bg-coral/10 p-4 text-sm"><span>{error}</span><button onClick={onRetry} className="font-bold text-coral">ลองโหลดอีกครั้ง</button></div>}
    <div className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4"><StatCard icon={<Trophy size={18} />} label="อันดับของคุณ" value={loading ? "—" : me ? `#${me.rank}` : "—"} tone="coral" /><StatCard icon={<Target size={18} />} label="คะแนนสูงสุด" value={loading ? "—" : me ? `${me.bestPercent}%` : "—"} tone="mint" /><StatCard icon={<GraduationCap size={18} />} label="คะแนนเฉลี่ย" value={loading ? "—" : me ? `${me.averagePercent}%` : "—"} tone="lilac" /><StatCard icon={<RotateCcw size={18} />} label="จำนวนรอบควิซ" value={loading ? "—" : me?.attempts ?? 0} tone="sand" /></div>
    <section className="mt-7 overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-card"><div className="flex items-center justify-between border-b border-ink/8 px-5 py-5 sm:px-7"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-coral">leaderboard</p><h2 className="mt-1 font-display text-2xl font-bold">อันดับคะแนนสูงสุด</h2></div><span className="rounded-full bg-ink/5 px-3 py-1.5 text-xs font-semibold text-ink/50">Top 20</span></div>
      {loading && <p className="p-8 text-center text-sm text-ink/45">กำลังโหลดสถิติ…</p>}
      {!loading && !error && data && data.leaders.length === 0 && <p className="p-8 text-center text-sm text-ink/45">ยังไม่มีคะแนน เริ่มควิซเพื่อเป็นคนแรกในตารางอันดับ</p>}
      {!loading && data?.leaders.length ? <div className="divide-y divide-ink/8">{data.leaders.map((player, index) => <div key={`${player.rank}-${index}`} className={`grid grid-cols-[3.5rem_minmax(0,1fr)_5rem_5rem] items-center gap-2 px-4 py-4 text-sm sm:grid-cols-[4rem_minmax(0,1fr)_7rem_7rem_7rem] sm:px-7 ${player.isMe ? "bg-coral/5" : ""}`}><span className={`font-display text-xl font-bold ${player.rank <= 3 ? "text-coral" : "text-ink/45"}`}>#{player.rank}</span><div className="min-w-0"><p className="truncate font-bold">{player.name}{player.isMe && <span className="ml-2 rounded-full bg-coral/10 px-2 py-0.5 text-[10px] text-coral">คุณ</span>}</p><p className="mt-1 text-[11px] text-ink/40">เล่น {player.attempts} รอบ · ตอบถูก {player.correctAnswers}/{player.questionsAnswered}</p></div><div className="text-right"><p className="font-bold">{player.bestPercent}%</p><p className="text-[10px] text-ink/40">สูงสุด</p></div><div className="hidden text-right sm:block"><p className="font-semibold">{player.averagePercent}%</p><p className="text-[10px] text-ink/40">เฉลี่ย</p></div><div className="hidden text-right text-xs text-ink/40 sm:block">{player.attempts} รอบ</div></div>)}</div> : null}
    </section>
    {!loading && me && me.rank > (data?.leaders.length ?? 0) && <p className="mt-4 text-center text-sm text-ink/50">คุณอยู่อันดับที่ <strong className="text-coral">#{me.rank}</strong> ดูผลในแถบสถิติด้านบน</p>}
  </div>;
}

function FillView({ words, onCorrect, onToast }: { words: Word[]; onCorrect: (wordIds: number[]) => Promise<void>; onToast: (message: string) => void }) {
  const [pool, setPool] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const wordsRef = useRef(words);
  wordsRef.current = words;
  const wordIdsKey = words.map((word) => word.id).join(",");
  const current = pool[index];
  const parts = useMemo(() => {
    if (!current) return [];
    const shuffled = Array.from(current.term.replace(/\s/g, ""));
    for (let partIndex = shuffled.length - 1; partIndex > 0; partIndex -= 1) {
      const swapIndex = Math.floor(Math.random() * (partIndex + 1));
      [shuffled[partIndex], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[partIndex]];
    }
    return shuffled.map((text, partIndex) => ({ id: `${partIndex}-${text}`, text }));
  }, [current]);
  const answer = selected.map((id) => parts.find((part) => part.id === id)?.text || "").join("");

  useEffect(() => {
    setPool([...wordsRef.current].sort(() => Math.random() - 0.5));
    setIndex(0);
    setSelected([]);
    setFeedback(null);
  }, [wordIdsKey]);

  function choosePart(id: string) {
    if (feedback || selected.includes(id)) return;
    setSelected((currentSelection) => [...currentSelection, id]);
  }

  function checkAnswer() {
    if (!current || selected.length !== parts.length) return;
    const normalize = (value: string) => value.toLowerCase().replace(/\s/g, "");
    const correct = normalize(answer) === normalize(current.term);
    setFeedback(correct ? "correct" : "wrong");
    if (correct) void onCorrect([current.id]).then(() => onToast("ตอบถูก! บันทึกความจำแล้ว")).catch(() => onToast("ตอบถูก แต่บันทึกความจำไม่สำเร็จ ลองอีกครั้ง"));
  }

  function nextQuestion() {
    if (!pool.length) return;
    setIndex((currentIndex) => (currentIndex + 1) % pool.length);
    setSelected([]);
    setFeedback(null);
  }

  if (!words.length) return <div className="py-20 text-center"><PageTitle eyebrow="fill mode" title="ยังไม่มีคำศัพท์ให้เติม" description="เพิ่มคำศัพท์หรือเปลี่ยนหมวดหมู่การเรียนรู้ก่อนเริ่มโหมดนี้" /></div>;
  if (!current) return null;
  return <div className="mx-auto max-w-3xl py-10 lg:py-14"><PageTitle eyebrow="fill mode · thai prompt" title="เติมคำจากคำแปลภาษาไทย" description="อ่านโจทย์ภาษาไทย แล้วเลือกตัวอักษรที่สลับลำดับให้เป็นคำศัพท์ภาษาอังกฤษ" /><section className="mt-6 overflow-hidden rounded-[32px] border border-ink/10 bg-white shadow-soft"><div className="bg-ink px-7 py-5 text-white sm:px-10"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">โจทย์ภาษาไทย</span><span className="text-xs font-semibold text-white/45">{index + 1} / {pool.length}</span></div><p className="mt-5 text-2xl font-bold leading-10 sm:text-3xl">{current.definition}</p><div className="mt-5 flex gap-2"><VoiceButton text={current.definition} lang="th-TH" label="ฟังโจทย์ภาษาไทย" /><VoiceButton text={current.term} lang="en-US" label="ฟังคำตอบภาษาอังกฤษ" /></div></div><div className="p-7 sm:p-10"><div className={`min-h-20 rounded-2xl border-2 border-dashed px-5 py-5 text-center font-display text-3xl font-bold tracking-[0.08em] ${feedback === "correct" ? "border-emerald-400 bg-mint text-emerald-700" : feedback === "wrong" ? "border-coral bg-coral/10 text-coral" : "border-ink/15 text-ink"}`}>{answer || <span className="text-ink/20">เลือกตัวอักษรด้านล่าง</span>}</div><div className="mt-7 flex flex-wrap justify-center gap-2">{parts.map((part) => <button key={part.id} disabled={selected.includes(part.id) || Boolean(feedback)} onClick={() => choosePart(part.id)} className={`grid min-h-12 min-w-12 place-items-center rounded-2xl border px-3 text-lg font-bold transition ${selected.includes(part.id) ? "border-ink/10 bg-ink/5 text-ink/25" : "border-ink/10 bg-white text-ink hover:-translate-y-0.5 hover:border-coral hover:text-coral"}`}>{part.text}</button>)}</div><div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">{feedback ? <button onClick={nextQuestion} className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-3.5 text-sm font-bold text-white">คำถัดไป <ArrowRight size={16} /></button> : <button disabled={selected.length !== parts.length} onClick={checkAnswer} className="rounded-2xl bg-coral px-6 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">ตรวจคำตอบ</button>}{feedback === "wrong" && <button onClick={() => { setSelected([]); setFeedback(null); }} className="rounded-2xl border border-ink/10 px-6 py-3.5 text-sm font-bold text-ink/60">ลองใหม่</button>}</div>{feedback === "wrong" && <p className="mt-5 text-center text-sm font-semibold text-coral">คำตอบที่ถูกคือ <span className="font-bold">{current.term}</span></p>}</div></section></div>;
}

function CategoryPicker({ categories, value, onChange, onCreated }: { categories: Category[]; value: string; onChange: (value: string) => void; onCreated: (category: Category) => void }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function createCategory() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const category = await requestJson<Category>("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      onCreated(category);
      onChange(String(category.id));
      setName("");
      setCreating(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "สร้างหมวดหมู่ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  return <div className="rounded-2xl border border-ink/10 bg-cream p-3"><div className="flex items-center justify-between gap-3"><label className="text-xs font-bold uppercase tracking-[0.14em] text-ink/40">หมวดหมู่</label><button type="button" onClick={() => setCreating((current) => !current)} className="text-xs font-bold text-coral hover:underline">{creating ? "ยกเลิก" : "+ สร้างใหม่"}</button></div><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-coral"><option value="">จัดหมวดหมู่อัตโนมัติ</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name} · {category.word_count} คำ</option>)}</select>{creating && <div className="mt-2 flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createCategory(); }} placeholder="ชื่อหมวดหมู่ใหม่" className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-coral" /><button type="button" disabled={busy || !name.trim()} onClick={() => void createCategory()} className="rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white disabled:opacity-40">สร้าง</button></div>}</div>;
}

function ImportView({ categories, onCategoryCreated, onDone }: { categories: Category[]; onCategoryCreated: (category: Category) => void; onDone: (message: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [manual, setManual] = useState({ term: "", partOfSpeech: "", definition: "" });
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"paste" | "manual">("paste");
  const [error, setError] = useState<string | null>(null);
  const parsedPreviewCount = useMemo(() => parseVocabulary(text).length, [text]);
  async function importText() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await requestJson<{ imported: number }>("/api/words/import", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, categoryId: categoryId ? Number(categoryId) : null })
      });
      setText("");
      await onDone(`นำเข้าคำศัพท์สำเร็จ ${payload.imported} คำ`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "นำเข้าไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }
  async function addManual() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestJson("/api/words", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...manual, categoryId: categoryId ? Number(categoryId) : null })
      });
      setManual({ term: "", partOfSpeech: "", definition: "" });
      await onDone("เพิ่มคำศัพท์ 1 คำแล้ว");
    } catch (error) {
      setError(error instanceof Error ? error.message : "เพิ่มคำศัพท์ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }
  return <div className="py-10 lg:py-14"><PageTitle eyebrow="build your library" title="เพิ่มคำศัพท์ให้เป็นของคุณ" description="วางรายการยาว ๆ จากหนังสือหรือโน้ตได้เลย ระบบจะอ่านเลขลำดับ, part of speech และคำแปลให้อัตโนมัติ" />{error && <p role="alert" className="mt-5 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-sm text-ink">{error}</p>}<div className="mt-9 flex gap-2 rounded-2xl bg-ink/5 p-1.5 sm:w-fit"><button onClick={() => setTab("paste")} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === "paste" ? "bg-white text-ink shadow-sm" : "text-ink/45"}`}><Upload size={15} className="mr-2 inline" />วางรายการ</button><button onClick={() => setTab("manual")} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === "manual" ? "bg-white text-ink shadow-sm" : "text-ink/45"}`}><Plus size={15} className="mr-2 inline" />เพิ่มทีละคำ</button></div>{tab === "paste" ? <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><section className="rounded-[28px] border border-ink/10 bg-white p-5 shadow-card sm:p-7"><div className="flex items-center justify-between"><label className="text-sm font-bold">รายการคำศัพท์</label><button onClick={() => setText(sampleImport)} className="text-xs font-bold text-coral hover:underline">ใช้ตัวอย่าง</button></div><div className="mt-4"><CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} onCreated={onCategoryCreated} /></div><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={`airborne (adj.) - ทางอากาศ, ทหารพลร่ม\nlanding (n.) - การลงจอด`} className="mt-4 min-h-[340px] w-full resize-none rounded-2xl border border-ink/10 bg-cream p-4 text-sm leading-7 outline-none transition placeholder:text-ink/25 focus:border-coral focus:ring-4 focus:ring-coral/10" /><div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className={`text-xs leading-5 ${parsedPreviewCount ? "font-bold text-emerald-600" : "text-ink/40"}`}>{parsedPreviewCount ? `พร้อมบันทึก ${parsedPreviewCount} คำ` : "รองรับเลขลำดับ, markdown, tab-separated และ JSON"}</p><button disabled={!text.trim() || !parsedPreviewCount || busy} onClick={() => void importText()} className="flex items-center justify-center gap-2 rounded-2xl bg-coral px-5 py-3 text-sm font-bold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-40"><Import size={16} />{busy ? "กำลังนำเข้า…" : "นำเข้าคำศัพท์"}</button></div></section><section className="rounded-[28px] bg-ink p-6 text-white shadow-soft sm:p-8"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-coral"><Sparkles size={19} /></span><h2 className="mt-8 font-display text-2xl font-bold">นำเข้าได้หลายแบบ</h2><div className="mt-7 space-y-5 text-sm leading-6 text-white/60"><div><p className="font-bold text-white">แบบมีเลขลำดับ</p><p>1. airborne (adj.) - ทางอากาศ</p></div><div><p className="font-bold text-white">แบบไม่มีเลขลำดับ</p><p>landing (n.) - การลงจอด</p></div><div><p className="font-bold text-white">แบบ JSON</p><p>[&#123; "term": "cover", "definition": "ที่กำบัง" &#125;]</p></div></div></section></div> : <section className="mt-5 max-w-2xl rounded-[28px] border border-ink/10 bg-white p-5 shadow-card sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><Field label="คำศัพท์" value={manual.term} placeholder="e.g. cover" onChange={(value) => setManual({ ...manual, term: value })} /><Field label="ชนิดคำ" value={manual.partOfSpeech} placeholder="e.g. n. / v." onChange={(value) => setManual({ ...manual, partOfSpeech: value })} /></div><div className="mt-5"><Field label="คำแปล / ความหมาย" value={manual.definition} placeholder="ที่กำบัง, คุ้มกัน" onChange={(value) => setManual({ ...manual, definition: value })} multiline /></div><div className="mt-5"><CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} onCreated={onCategoryCreated} /></div><button disabled={!manual.term.trim() || !manual.definition.trim() || busy} onClick={() => void addManual()} className="mt-6 flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Plus size={16} />เพิ่มเข้าคลัง</button></section>}</div>;
}

function Field({ label, value, placeholder, onChange, multiline }: { label: string; value: string; placeholder: string; onChange: (value: string) => void; multiline?: boolean }) { const className = "mt-2 w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none transition placeholder:text-ink/25 focus:border-coral focus:ring-4 focus:ring-coral/10"; return <label className="block text-sm font-bold">{label}{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${className} min-h-[130px] resize-none`} /> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={className} />}</label>; }
