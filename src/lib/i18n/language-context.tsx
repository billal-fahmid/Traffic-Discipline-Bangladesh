"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { dict, type Dict } from "./dictionary";

export type Lang = "en" | "bn";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: Dict;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "tdb-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Read the saved preference after mount (not during SSR/first paint) so
  // the server-rendered HTML always matches the client's first render —
  // avoids a hydration mismatch. The page briefly shows English, then
  // switches if the visitor had picked Bangla before.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "bn") setLangState(stored);
    } catch {
      // localStorage can throw in some privacy modes — English stays the default.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    // .font-bangla lives in @layer utilities alongside Tailwind's own
    // .font-sans (already set on <body>), so it reliably wins when both
    // are present on the same element — no extra wrapper element needed.
    document.body.classList.toggle("font-bangla", lang === "bn");
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Non-fatal — the choice just won't persist across visits.
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang: () => setLang(lang === "en" ? "bn" : "en"), t: dict[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
