"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EducationTopic } from "@/lib/education-content";
import { ArrowLeft, Languages, CheckCircle2 } from "lucide-react";

export function EducationTopicView({ topic }: { topic: EducationTopic }) {
  const [lang, setLang] = useState<"en" | "bn">("en");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/education" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All Topics
        </Link>
        <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
          <Button size="sm" variant={lang === "en" ? "default" : "ghost"} onClick={() => setLang("en")}>English</Button>
          <Button size="sm" variant={lang === "bn" ? "default" : "ghost"} onClick={() => setLang("bn")} className={lang === "bn" ? "font-bangla" : ""}>বাংলা</Button>
        </div>
      </div>

      <div className="mb-8">
        <h1 className={`font-display text-3xl font-bold tracking-tight ${lang === "bn" ? "font-bangla" : ""}`}>
          {lang === "en" ? topic.title_en : topic.title_bn}
        </h1>
        <p className={`mt-3 text-lg text-muted-foreground ${lang === "bn" ? "font-bangla" : ""}`}>
          {lang === "en" ? topic.summary_en : topic.summary_bn}
        </p>
      </div>

      <div className="space-y-6">
        {topic.sections.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <h2 className={`mb-4 font-display text-lg font-bold ${lang === "bn" ? "font-bangla" : ""}`}>
                {lang === "en" ? s.heading_en : s.heading_bn}
              </h2>
              <ul className="space-y-3">
                {s.points.map((p, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className={`text-sm leading-relaxed ${lang === "bn" ? "font-bangla" : ""}`}>
                      {lang === "en" ? p.en : p.bn}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
        <Languages className="h-4 w-4 shrink-0" />
        {lang === "en"
          ? "This content is available in Bangla too — use the toggle above."
          : "এই কন্টেন্ট ইংরেজিতেও পাওয়া যায় — উপরের টগল ব্যবহার করুন।"}
      </div>
    </div>
  );
}
