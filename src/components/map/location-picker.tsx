"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/language-context";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

const DHAKA = {
  lat: Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_LAT ?? 23.8103),
  lng: Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_LNG ?? 90.4125),
};

interface GeoResult {
  label: string;
  fullLabel?: string;
  district: string;
  thana: string;
  lat: number;
  lon: number;
}

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  locationLabel: string;
  district: string;
  thana: string;
  onLatLngChange: (lat: number, lng: number) => void;
  onFieldChange: (field: "locationLabel" | "district" | "thana", value: string) => void;
}

export function LocationPicker({
  latitude,
  longitude,
  locationLabel,
  district,
  thana,
  onLatLngChange,
  onFieldChange,
}: LocationPickerProps) {
  const { t } = useLanguage();
  const loc = t.report.location;
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [reverseBusy, setReverseBusy] = useState(false);

  // Which address fields the user has hand-edited — auto-fill from the map
  // never overwrites those, only empty / auto-filled ones.
  const touched = useRef({ label: false, district: false, thana: false });
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReverseKey = useRef<string | null>(null);
  const skipNextReverse = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const lat = latitude ?? DHAKA.lat;
  const lng = longitude ?? DHAKA.lng;

  const applyAddress = useCallback(
    (a: { label?: string; district?: string; thana?: string }, force: boolean) => {
      if (a.label && (force || !touched.current.label)) {
        onFieldChange("locationLabel", a.label);
        touched.current.label = false;
      }
      if (a.district && (force || !touched.current.district)) {
        onFieldChange("district", a.district);
        touched.current.district = false;
      }
      if (a.thana && (force || !touched.current.thana)) {
        onFieldChange("thana", a.thana);
        touched.current.thana = false;
      }
    },
    [onFieldChange]
  );

  // ── Reverse geocode whenever the pin moves (map click / drag, "use my
  //    location", or picking a search result) ───────────────────────────
  useEffect(() => {
    if (latitude == null || longitude == null) return;
    if (skipNextReverse.current) {
      skipNextReverse.current = false;
      return;
    }
    const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    if (key === lastReverseKey.current) return;

    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    reverseTimer.current = setTimeout(async () => {
      lastReverseKey.current = key;
      setReverseBusy(true);
      try {
        const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
        if (res.ok) {
          const data = (await res.json()) as GeoResult;
          applyAddress(data, false);
        }
      } catch {
        /* leave the fields as they are */
      } finally {
        setReverseBusy(false);
      }
    }, 550);

    return () => {
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
    };
  }, [latitude, longitude, applyAddress]);

  // ── Close the suggestion list on an outside click ────────────────────
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function runSearch(value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = res.ok ? ((await res.json()) as { results?: GeoResult[] }) : { results: [] };
        setSuggestions(data.results ?? []);
        setActiveIdx(-1);
        setOpen((data.results ?? []).length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  function onLabelChange(value: string) {
    touched.current.label = true;
    onFieldChange("locationLabel", value);
    runSearch(value);
  }

  function pickSuggestion(s: GeoResult) {
    setOpen(false);
    setSuggestions([]);
    // We already have the address for this point — don't also reverse-geocode it.
    skipNextReverse.current = true;
    lastReverseKey.current = `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`;
    applyAddress({ label: s.label, district: s.district, thana: s.thana }, true);
    onLatLngChange(s.lat, s.lon);
  }

  function onLabelKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function getPosition(opts: PositionOptions) {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, opts);
    });
  }

  async function useMyLocation() {
    setLocateError(null);

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLocateError(
        `Location only works over HTTPS or on localhost — this page is open at "${window.location.host}". ` +
          `Open the app at http://localhost:3000, or drop the pin on the map.`
      );
      return;
    }
    if (!("geolocation" in navigator)) {
      setLocateError("This browser can't share a location. Drop a pin on the map instead.");
      return;
    }

    setLocating(true);
    try {
      // Try a quick precise fix first, then fall back to a coarse
      // network/Wi-Fi fix — desktops often can't do high accuracy at all
      // and would otherwise just time out.
      let pos: GeolocationPosition;
      try {
        pos = await getPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 });
      } catch (first) {
        if ((first as GeolocationPositionError)?.code === 1) throw first; // permission denied — no point retrying
        pos = await getPosition({ enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 });
      }
      onLatLngChange(pos.coords.latitude, pos.coords.longitude);
    } catch (err) {
      const code = (err as GeolocationPositionError)?.code;
      if (code === 1) {
        setLocateError(
          "Location permission is blocked for this site. Click the location / lock icon in the address bar, " +
            "set Location to Allow, then try again — or just drop the pin on the map."
        );
      } else if (code === 2) {
        setLocateError(
          "Your device couldn't determine its location (Windows/OS location services may be turned off). " +
            "Turn them on and retry, or drop the pin on the map."
        );
      } else {
        setLocateError("Location timed out. Try once more, or drop the pin on the map.");
      }
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" /> {loc.violationLocation}
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          {loc.useMyLocation}
        </Button>
      </div>

      {locateError && <p className="text-sm text-destructive">{locateError}</p>}

      <LeafletMap
        latitude={lat}
        longitude={lng}
        onChange={onLatLngChange}
        className="h-72 w-full rounded-lg border"
      />
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {reverseBusy && <Loader2 className="h-3 w-3 animate-spin" />}
        {reverseBusy
          ? loc.lookingUpAddress
          : `${loc.tapOrDrag} — ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div ref={boxRef} className="relative sm:col-span-2 space-y-2">
          <Label htmlFor="locationLabel">{loc.landmarkLabel}</Label>
          <div className="relative">
            <Input
              id="locationLabel"
              autoComplete="off"
              placeholder={loc.landmarkPlaceholder}
              value={locationLabel}
              onChange={(e) => onLabelChange(e.target.value)}
              onKeyDown={onLabelKeyDown}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              role="combobox"
              aria-expanded={open}
              aria-controls="location-suggestions"
              aria-autocomplete="list"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </span>
          </div>

          {open && suggestions.length > 0 && (
            <ul
              id="location-suggestions"
              role="listbox"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-card p-1 shadow-md"
            >
              {suggestions.map((s, i) => (
                <li key={`${s.lat},${s.lon},${i}`} role="option" aria-selected={i === activeIdx}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => pickSuggestion(s)}
                    className={`flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm ${
                      i === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                    }`}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block font-medium leading-tight">{s.label}</span>
                      {s.fullLabel && (
                        <span className="block truncate text-xs text-muted-foreground">{s.fullLabel}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Type a place name to search, or drop the pin above — the fields below fill in automatically.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="district">District</Label>
          <Input
            id="district"
            placeholder="e.g. Dhaka"
            value={district}
            onChange={(e) => {
              touched.current.district = true;
              onFieldChange("district", e.target.value);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="thana">Thana / Upazila</Label>
          <Input
            id="thana"
            placeholder="e.g. Tejgaon"
            value={thana}
            onChange={(e) => {
              touched.current.thana = true;
              onFieldChange("thana", e.target.value);
            }}
          />
        </div>
      </div>
    </div>
  );
}
