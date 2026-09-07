"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/language-context";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/80 bg-secondary/40">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div>
          <p className="font-display text-base font-bold">Traffic Discipline Bangladesh</p>
          <p className="mt-2 text-sm text-muted-foreground">{t.footer.tagline}</p>
        </div>
        <div>
          <p className="text-sm font-semibold">{t.footer.platform}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/report" className="hover:text-foreground">{t.nav.report}</Link></li>
            <li><Link href="/track" className="hover:text-foreground">{t.nav.track}</Link></li>
            <li><Link href="/map" className="hover:text-foreground">{t.nav.map}</Link></li>
            <li><Link href="/insights" className="hover:text-foreground">{t.nav.insights}</Link></li>
            <li><Link href="/education" className="hover:text-foreground">{t.nav.education}</Link></li>
            <li><Link href="/dashboard" className="hover:text-foreground">{t.footer.citizenDashboard}</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">{t.footer.account}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/login" className="hover:text-foreground">{t.footer.signIn}</Link></li>
            <li><Link href="/register" className="hover:text-foreground">{t.footer.createAccount}</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">{t.footer.privacy}</p>
          <p className="mt-3 text-sm text-muted-foreground">{t.footer.privacyText}</p>
        </div>
      </div>
      <div className="border-t border-border/80 py-4">
        <p className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t.footer.copyright}
        </p>
      </div>
    </footer>
  );
}
