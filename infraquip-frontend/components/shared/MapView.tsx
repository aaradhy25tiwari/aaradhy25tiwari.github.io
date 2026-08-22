"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

// Dynamically import react-leaflet components to avoid SSR window issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((mod) => mod.Circle), { ssr: false });

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
  const [mounted, setMounted] = useState(false);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // dynamically import leaflet strictly on client side
    import("leaflet").then((leaflet) => {
      setL(leaflet.default || leaflet);
    });
  }, []);

  // Custom DivIcon for the map pin using our amber style
  const customIcon = useMemo(() => {
    if (!L) return null;
    return new L.DivIcon({
      className: "custom-leaflet-icon",
      html: `<div style="
        width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
        background: #f59e0b; border: 3px solid #fff;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,.35);
      "></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
  }, [L]);

  if (!mounted || !L || !customIcon) {
    return (
      <div className={`relative rounded-2xl border border-border overflow-hidden bg-muted flex items-center justify-center ${className ?? ""}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Loading map…</span>
        </div>
      </div>
    );
  }

  const position: [number, number] = [latitude, longitude];

  return (
    <div className={`relative rounded-2xl border border-border overflow-hidden ${className ?? ""}`}>
      <div className="h-64 w-full">
        <MapContainer 
          center={position} 
          zoom={zoom} 
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} icon={customIcon} title={title} />
          {/* 1.5 km radius circle */}
          <Circle 
            center={position} 
            radius={1500} 
            pathOptions={{
              color: "#f59e0b",
              fillColor: "#f59e0b",
              fillOpacity: 0.07,
              weight: 2,
              opacity: 0.45
            }} 
          />
        </MapContainer>
      </div>
      
      {/* City label overlay */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border px-3 py-1.5 shadow-sm text-xs font-medium z-[1000] pointer-events-none">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        {city}, {state}
        <span className="text-muted-foreground ml-1">· Approximate area</span>
      </div>
    </div>
  );
}
