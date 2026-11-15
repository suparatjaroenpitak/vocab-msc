"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
        console.error("PWA service worker registration failed", error);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

export function PWAInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showAppleGuide, setShowAppleGuide] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) return;

    const userAgent = navigator.userAgent;
    const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent)
      || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
    setShowAppleGuide(isAppleMobile);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setShowAppleGuide(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) {
      window.alert("แตะปุ่มแชร์ใน Safari แล้วเลือก ‘เพิ่มไปยังหน้าจอโฮม’");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  if (!installPrompt && !showAppleGuide) return null;
  return (
    <button type="button" onClick={() => void install()} className="flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-bold text-ink/60 transition hover:border-coral/40 hover:text-coral" aria-label="ติดตั้ง MSC Vocab">
      <Download size={14} /> <span className="hidden md:inline">ติดตั้งแอป</span>
    </button>
  );
}
