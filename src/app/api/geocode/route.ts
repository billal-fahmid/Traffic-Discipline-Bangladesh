import { NextResponse } from "next/server";

// Address search + reverse geocoding for the report location step.
// Proxies OpenStreetMap Nominatim (same data source as the Leaflet map,
// no API key) server-side so we can send the required User-Agent, add a
// short cache, and keep well under Nominatim's ~1 req/sec guidance.

export const runtime = "nodejs";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = `TrafficDisciplineBD/1.0 (${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"})`;

const cache = new Map<string, { at: number; body: unknown }>();
const TTL = 1000 * 60 * 30;

function cached(key: string) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.body;
  if (hit) cache.delete(key);
  return null;
}
function put(key: string, body: unknown) {
  cache.set(key, { at: Date.now(), body });
  if (cache.size > 600) cache.delete(cache.keys().next().value as string);
}

type Addr = Record<string, string | undefined>;

// Nominatim tacks "… District" / "… Division" / "… Metropolitan" onto BD
// admin names; the form wants the bare name ("Dhaka", "Tejgaon").
function tidy(v: string | undefined) {
  return (v ?? "").replace(/\s+(District|Division|Metropolitan|Sadar Upazila|Upazila)$/i, "").trim();
}

// Bangladesh administrative names land in inconsistent Nominatim keys —
// take the first that is present. For BD: state = Division,
// state_district = Zila (District), suburb / city_district ≈ Thana.
function pickDistrict(a: Addr) {
  return tidy(a.state_district || a.district || a.county || a.city || a.town || a.state);
}
function pickThana(a: Addr) {
  return tidy(
    a.city_district ||
      a.suburb ||
      a.municipality ||
      a.town ||
      a.neighbourhood ||
      a.quarter ||
      a.village
  );
}
function shortLabel(displayName: string, a: Addr, name?: string) {
  const parts = [
    name || a.amenity || a.building || a.road,
    a.neighbourhood || a.suburb || a.quarter,
  ].filter(Boolean);
  if (parts.length) return [...new Set(parts)].join(", ");
  return displayName.split(",").slice(0, 3).join(",").trim();
}

async function nominatim(path: string) {
  const res = await fetch(`${NOMINATIM}${path}`, {
    headers: { "User-Agent": UA, "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  try {
    if (lat && lon) {
      const nlat = Number(lat);
      const nlon = Number(lon);
      if (!Number.isFinite(nlat) || !Number.isFinite(nlon)) {
        return NextResponse.json({ error: "bad coordinates" }, { status: 400 });
      }
      const key = `r:${nlat.toFixed(5)},${nlon.toFixed(5)}`;
      const hit = cached(key);
      if (hit) return NextResponse.json(hit);

      const j = await nominatim(
        `/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${nlat}&lon=${nlon}`
      );
      const a: Addr = j.address ?? {};
      const out = {
        label: shortLabel(j.display_name ?? "", a, j.name),
        district: pickDistrict(a),
        thana: pickThana(a),
        lat: Number(j.lat),
        lon: Number(j.lon),
      };
      put(key, out);
      return NextResponse.json(out);
    }

    if (q && q.length >= 3) {
      const key = `s:${q.toLowerCase()}`;
      const hit = cached(key);
      if (hit) return NextResponse.json(hit);

      const arr = (await nominatim(
        `/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=bd&q=${encodeURIComponent(q)}`
      )) as Array<Record<string, unknown>>;

      const results = arr.map((j) => {
        const a: Addr = (j.address as Addr) ?? {};
        return {
          label: shortLabel(String(j.display_name ?? ""), a, j.name as string | undefined),
          fullLabel: String(j.display_name ?? ""),
          district: pickDistrict(a),
          thana: pickThana(a),
          lat: Number(j.lat),
          lon: Number(j.lon),
        };
      });
      const body = { results };
      put(key, body);
      return NextResponse.json(body);
    }

    return NextResponse.json({ results: [] });
  } catch {
    return NextResponse.json({ error: "geocoder unavailable" }, { status: 502 });
  }
}
