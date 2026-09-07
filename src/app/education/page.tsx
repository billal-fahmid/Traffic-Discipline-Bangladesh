"use client";

import Link from "next/link";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Card, CardContent } from "@/components/ui/card";
import { EDUCATION_TOPICS } from "@/lib/education-content";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  BookOpen, OctagonAlert, TrafficCone, MoveHorizontal, Bus,
  ParkingCircleOff, Footprints, Zap, ShieldCheck,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "book-open": BookOpen,
  "octagon-alert": OctagonAlert,
  "traffic-cone": TrafficCone,
  "move-horizontal": MoveHorizontal,
  bus: Bus,
  "parking-circle-off": ParkingCircleOff,
  footprints: Footprints,
  zap: Zap,
  "shield-check": ShieldCheck,
};

export default function EducationPage() {
  const { t, lang } = useLanguage();

  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-12">
        <div className="mb-10 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">{t.education.bilingualKicker}</span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">{t.education.title}</h1>
          <p className="mt-3 text-muted-foreground">{t.education.subtitle}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EDUCATION_TOPICS.map((topic) => {
            const Icon = ICONS[topic.icon] ?? BookOpen;
            return (
              <Link key={topic.slug} href={`/education/${topic.slug}`}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardContent className="p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    {lang === "en" ? (
                      <>
                        <p className="mt-4 font-semibold">{topic.title_en}</p>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{topic.summary_en}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bangla mt-4 font-semibold">{topic.title_bn}</p>
                        <p className="font-bangla mt-2 text-sm text-muted-foreground line-clamp-2">{topic.summary_bn}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
