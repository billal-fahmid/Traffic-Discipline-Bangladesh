"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { PublicMapPoint, Hotspot, ViolationCategory } from "@/lib/types";
import { RISK_COLOR, RISK_LABEL } from "@/lib/types";
import { Loader2, MapPin, Flame, ShieldCheck } from "lucide-react";

const PublicMap = dynamic(() => import("@/components/map/public-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] w-full items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

// Quick-access presets for the three hotspot types the spec calls out
// by name, on top of the general "all categories" view.
const QUICK_FILTERS: { label: string; slug: string | null }[] = [
  { label: "All Violations", slug: null },
  { label: "Illegal Bus Stopping", slug: "illegal-bus-stoppage" },
  { label: "Illegal Parking", slug: "illegal-parking" },
  { label: "Red-Light Violations", slug: "signal-violation" },
];

export default function TrafficMapPage() {
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<"points" | "hotspots">("hotspots");
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [categories, setCategories] = useState<ViolationCategory[]>([]);
  const [points, setPoints] = useState<PublicMapPoint[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("violation_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => data && setCategories(data as ViolationCategory[]));
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const call =
      mode === "points"
        ? supabase.rpc("get_public_violation_points", { p_category_slug: categorySlug, p_district: null })
        : supabase.rpc("get_hotspots", { p_category_slug: categorySlug, p_min_count: 3 });

    call.then(({ data }) => {
      if (cancelled) return;
      if (mode === "points") setPoints((data as PublicMapPoint[]) ?? []);
      else setHotspots((data as Hotspot[]) ?? []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, mode, categorySlug]);

  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-10">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Traffic Map</h1>
          <p className="mt-1 text-muted-foreground">
            Officer-verified violations only, aggregated to protect precise reporting locations —
            never raw or unverified citizen submissions.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            <Button size="sm" variant={mode === "hotspots" ? "default" : "ghost"} onClick={() => setMode("hotspots")}>
              <Flame className="h-4 w-4" /> Hotspots
            </Button>
            <Button size="sm" variant={mode === "points" ? "default" : "ghost"} onClick={() => setMode("points")}>
              <MapPin className="h-4 w-4" /> Individual Points
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((f) => (
              <Button
                key={f.label}
                size="sm"
                variant={categorySlug === f.slug ? "default" : "outline"}
                onClick={() => setCategorySlug(f.slug)}
              >
                {f.label}
              </Button>
            ))}
            <select
              value={categorySlug && !QUICK_FILTERS.some((f) => f.slug === categorySlug) ? categorySlug : ""}
              onChange={(e) => setCategorySlug(e.target.value || null)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
            >
              <option value="">More categories…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name_en}</option>
              ))}
            </select>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="relative p-0">
            {loading && (
              <div className="absolute right-3 top-3 z-[1000] flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs shadow">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading
              </div>
            )}
            <PublicMap mode={mode} points={points} hotspots={hotspots} className="h-[520px] w-full" />
          </CardContent>
        </Card>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          {mode === "hotspots" ? (
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> {hotspots.length} hotspots shown</span>
              {(["high", "medium", "low"] as const).map((r) => (
                <span key={r} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLOR[r] }} />
                  {RISK_LABEL[r]} risk
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{points.length} verified violation points shown (most recent 2,000)</p>
          )}
        </div>

        {mode === "hotspots" && hotspots.length > 0 && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hotspots.slice(0, 9).map((h, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{h.location_name}</p>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                      style={{ background: RISK_COLOR[h.risk_level] }}
                    >
                      {RISK_LABEL[h.risk_level]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{h.district}</p>
                  <p className="mt-3 text-sm">Verified Violations: <strong>{h.total_count}</strong></p>
                  <ol className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {h.top_violations.map((v, idx) => (
                      <li key={idx}>{idx + 1}. {v.name} — {v.count}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
