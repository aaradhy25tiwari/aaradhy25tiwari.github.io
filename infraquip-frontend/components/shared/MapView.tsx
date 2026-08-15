"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { MapPin } from "lucide-react";

interface MapViewProps {
  latitude: number;
  longitude: number;
  title: string;
  city: string;
  state: string;
  /** Zoom level 1–20, default 13 */
  zoom?: number;
  className?: string;
}

export function MapView({
  latitude,
  longitude,
  title,
  city,
  state,
  zoom = 13,
  className,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { setError(true); return; }
    if (!mapRef.current) return;

    setOptions({ key: apiKey, v: "weekly" });

    const position = { lat: latitude, lng: longitude };

    Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
    ])
      .then(([{ Map }, { AdvancedMarkerElement }]) => {
        const map = new Map(mapRef.current!, {
          center: position,
          zoom,
          mapId: "infraquip_map",
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
        });

        // Custom amber pin
        const pinEl = document.createElement("div");
        pinEl.style.cssText = `
          width:28px;height:28px;border-radius:50% 50% 50% 0;
          background:#f59e0b;border:3px solid #fff;
          transform:rotate(-45deg);
          box-shadow:0 2px 8px rgba(0,0,0,.35);
        `;

        new AdvancedMarkerElement({ map, position, title, content: pinEl });

        // 1.5 km radius circle — approximate area only
        importLibrary("maps").then(({ Circle }) => {
          new Circle({
            strokeColor: "#f59e0b",
            strokeOpacity: 0.45,
            strokeWeight: 2,
            fillColor: "#f59e0b",
            fillOpacity: 0.07,
            map,
            center: position,
            radius: 1500,
          });
        });

        setLoaded(true);
      })
      .catch(() => setError(true));
  }, [latitude, longitude, zoom, title]);

  if (error || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-muted/30 p-8 text-center ${className ?? ""}`}>
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{city}, {state}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Map unavailable — add a Google Maps API key to enable this feature
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl border border-border overflow-hidden ${className ?? ""}`}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs text-muted-foreground">Loading map…</span>
          </div>
        </div>
      )}
      <div ref={mapRef} className="h-64 w-full" />
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border px-3 py-1.5 shadow-sm text-xs font-medium">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        {city}, {state}
        <span className="text-muted-foreground ml-1">· Approximate area</span>
      </div>
    </div>
  );
}
