"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PublicMapPoint, Hotspot } from "@/lib/types";
import { RISK_COLOR, RISK_LABEL } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  "illegal-parking": "#2563eb",
  "wrong-side-driving": "#7c3aed",
  "signal-violation": "#dc2626",
  "reckless-driving": "#ea580c",
  "no-helmet": "#0891b2",
  overloading: "#65a30d",
  "illegal-bus-stoppage": "#006A4E",
  "fake-fitness-registration": "#9333ea",
  "unauthorized-modification": "#64748b",
  other: "#94a3b8",
};

const DHAKA_CENTER: [number, number] = [23.8103, 90.4125];

interface PublicMapProps {
  mode: "points" | "hotspots";
  points: PublicMapPoint[];
  hotspots: Hotspot[];
  className?: string;
}

export default function PublicMap({ mode, points, hotspots, className }: PublicMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: DHAKA_CENTER, zoom: 12, scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (mode === "points") {
      for (const p of points) {
        const color = CATEGORY_COLORS[p.category_slug] ?? CATEGORY_COLORS.other;
        L.circleMarker([p.latitude, p.longitude], {
          radius: 5,
          color,
          fillColor: color,
          fillOpacity: 0.75,
          weight: 1,
        })
          .bindPopup(
            `<div style="font-size:13px">
               <strong>${escapeHtml(p.category_name_en)}</strong><br/>
               <span style="color:#666">${escapeHtml(p.district ?? "District not specified")}</span><br/>
               <span style="color:#999;font-size:11px">Verified · ${new Date(p.created_at).toLocaleDateString()}</span>
             </div>`
          )
          .addTo(layer);
      }
    } else {
      for (const h of hotspots) {
        const color = RISK_COLOR[h.risk_level];
        const radius = Math.min(28, 8 + Math.sqrt(h.total_count) * 2);
        const violationsHtml = h.top_violations
          .map((v, i) => `<li>${i + 1}. ${escapeHtml(v.name)} — ${v.count}</li>`)
          .join("");
        L.circleMarker([h.grid_lat, h.grid_lng], {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0.35,
          weight: 2,
        })
          .bindPopup(
            `<div style="font-size:13px;min-width:180px">
               <strong>${escapeHtml(h.location_name)}</strong><br/>
               <span style="color:${color};font-weight:600;text-transform:uppercase;font-size:11px">Traffic Risk: ${RISK_LABEL[h.risk_level]}</span>
               <div style="margin-top:6px">Verified Violations: <strong>${h.total_count}</strong></div>
               <div style="margin-top:6px;font-weight:600">Top Violations:</div>
               <ul style="margin:4px 0 0 0;padding-left:16px">${violationsHtml}</ul>
             </div>`
          )
          .addTo(layer);
      }
    }
  }, [mode, points, hotspots]);

  return <div ref={containerRef} className={className} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
