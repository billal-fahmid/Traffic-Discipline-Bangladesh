"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

/** Compact EN / বাংলা switch — same pill pattern already used by the
 *  education topic page's local toggle, lifted to a site-wide choice. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={cn("flex items-center gap-0.5 rounded-full border border-border bg-secondary/60 p-0.5 text-xs font-semibold", className)}>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={cn(
          "rounded-full px-2.5 py-1 transition-colors",
          lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("bn")}
        aria-pressed={lang === "bn"}
        className={cn(
          "rounded-full px-2.5 py-1 font-bangla transition-colors",
          lang === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        বাংলা
      </button>
    </div>
  );
}
