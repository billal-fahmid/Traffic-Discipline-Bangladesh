"use client";

import Link from "next/link";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ParkingCircleOff, MoveLeft, TrafficCone, Zap, ShieldAlert, PackagePlus,
  Bus, FileX, Wrench, MoreHorizontal, MapPin, Camera, FileSearch2,
  ShieldCheck, EyeOff, ArrowRight,
} from "lucide-react";
import { FALLBACK_CATEGORIES, SEVERITY_LABEL } from "@/lib/violations";
import { useLanguage } from "@/lib/i18n/language-context";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "parking-circle-off": ParkingCircleOff,
  "move-left": MoveLeft,
  "traffic-cone": TrafficCone,
  zap: Zap,
  "shield-alert": ShieldAlert,
  "package-plus": PackagePlus,
  bus: Bus,
  "file-x": FileX,
  wrench: Wrench,
  "more-horizontal": MoreHorizontal,
};

const STEP_ICONS = [TrafficCone, Camera, MapPin, FileSearch2];

export default function HomePage() {
  const { t } = useLanguage();
  const home = t.home;

  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-border/80">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_-10%,hsl(var(--primary)/0.10),transparent_45%),radial-gradient(circle_at_90%_10%,hsl(var(--destructive)/0.08),transparent_40%)]" />
          <div className="container grid gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
            <div className="flex flex-col justify-center">
              <div className="mb-6 flex items-center gap-2">
                <span className="signal-rule w-16" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {home.kicker}
                </span>
              </div>
              <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {home.heroTitle}
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                {home.heroBody}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/report">
                    {home.ctaReport} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/track">{home.ctaTrack}</Link>
                </Button>
              </div>
              <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
                <EyeOff className="h-4 w-4 text-primary" />
                {home.anonymousNote}
              </div>
            </div>

            <div className="flex items-center">
              <Card className="w-full border-2 shadow-lg">
                <CardContent className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {home.sampleCardLabel}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-display text-2xl font-bold tracking-tight">TDB-2026-483920</span>
                    <Badge variant="secondary">{home.sampleStatus}</Badge>
                  </div>
                  <div className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">{home.sampleCategoryLabel}</span><span className="font-medium">{home.sampleCategory}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{home.sampleDistrictLabel}</span><span className="font-medium">{home.sampleDistrict}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{home.sampleFiledLabel}</span><span className="font-medium">{home.sampleFiled}</span></div>
                  </div>
                  <div className="mt-6 flex gap-1.5">
                    {home.sampleStages.map((s, i) => (
                      <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= 1 ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ── Stats ──────────────────────────────────────────── */}
        <section className="border-b border-border/80 bg-secondary/30">
          <div className="container grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
            {[
              ["10", home.statTotal],
              ["64", home.statDistricts],
              ["<2min", home.statAvgTime],
              ["24/7", home.statAvailability],
            ].map(([stat, label]) => (
              <div key={label}>
                <p className="font-display text-3xl font-extrabold text-primary">{stat}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Categories ─────────────────────────────────────── */}
        <section id="categories" className="container py-20">
          <div className="mb-10 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">{home.categoriesKicker}</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{home.categoriesTitle}</h2>
            <p className="mt-3 text-muted-foreground">{home.categoriesBody}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FALLBACK_CATEGORIES.map((c) => {
              const Icon = ICONS[c.icon ?? "more-horizontal"] ?? MoreHorizontal;
              return (
                <Card key={c.slug} className={c.is_special ? "border-primary/40 bg-primary/[0.03]" : ""}>
                  <CardContent className="flex items-start gap-4 p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold leading-tight">{c.name_en}</p>
                        {c.is_special && <Badge className="text-[10px]">{home.specialFlowBadge}</Badge>}
                      </div>
                      <p className="font-bangla mt-0.5 text-sm text-muted-foreground">{c.name_bn}</p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                        {SEVERITY_LABEL[c.severity]} {home.severitySuffix}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────── */}
        <section id="how-it-works" className="border-y border-border/80 bg-secondary/30">
          <div className="container py-20">
            <div className="mb-10 max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">{home.flowKicker}</span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{home.flowTitle}</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              {home.steps.map((s, i) => {
                const Icon = STEP_ICONS[i];
                return (
                  <div key={s.title} className="relative">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground font-display font-bold">
                      {i + 1}
                    </div>
                    <Icon className="mb-3 h-5 w-5 text-primary" />
                    <p className="font-semibold">{s.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Trust / anonymity ──────────────────────────────── */}
        <section className="container py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <ShieldCheck className="h-10 w-10 text-primary" />
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight">
                {home.trustTitle}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {home.trustBody}
              </p>
              <Button asChild className="mt-6">
                <Link href="/report">{home.trustCta}</Link>
              </Button>
            </div>
            <Card>
              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{home.registeredKicker}</p>
                <p className="mt-2 font-display text-xl font-bold">{home.registeredTitle}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {home.registeredBody}
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/register">{home.registeredCta}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
