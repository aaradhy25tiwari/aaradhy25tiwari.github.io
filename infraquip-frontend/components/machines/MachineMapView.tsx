"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";
import type { MachineListItem } from "@/types/machine";
import { formatINR } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

// Dynamically import react-leaflet components
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const useMap = dynamic(() => import("react-leaflet").then((mod) => mod.useMap), { ssr: false });

interface MachineMapViewProps {
  machines: MachineListItem[];
  className?: string;
}

// Child component to handle bounds
function MapBoundsController({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      if (positions.length === 1) {
        map.setView(positions[0], 12);
      } else {
        const bounds = positions;
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [map, positions]);
  return null;
}

export function MachineMapView({ machines, className }: MachineMapViewProps) {
  const [mounted, setMounted] = useState(false);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    import("leaflet").then((leaflet) => {
      setL(leaflet.default || leaflet);
    });
  }, []);

  const customIcon = useMemo(() => {
    if (!L) return null;
    return new L.DivIcon({
      className: "custom-leaflet-icon",
      html: `<div style="
        width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
        background: #f59e0b; border: 3px solid #fff;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,.35);
        display: flex; align-items: center; justify-content: center;
      "></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  }, [L]);

  if (!mounted || !L || !customIcon) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-muted/30 p-8 text-center h-[500px] ${className ?? ""}`}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-muted-foreground">Loading map…</span>
      </div>
    );
  }

  const machinesWithLocation = machines.filter(m => m.latitude && m.longitude);
  
  // Default to India
  const center: [number, number] = machinesWithLocation.length > 0 
    ? [machinesWithLocation[0].latitude!, machinesWithLocation[0].longitude!] 
    : [20.5937, 78.9629];

  const positions: [number, number][] = machinesWithLocation.map(m => [m.latitude!, m.longitude!]);

  return (
    <div className={`relative rounded-2xl border border-border overflow-hidden h-[500px] ${className ?? ""}`}>
      <MapContainer 
        center={center} 
        zoom={machinesWithLocation.length > 0 ? 12 : 5} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {machinesWithLocation.map((machine) => {
          const priceStr = machine.contact_for_price 
            ? "Contact for price" 
            : machine.rental_price_daily 
              ? `${formatINR(machine.rental_price_daily)}/day` 
              : machine.purchase_price 
                ? formatINR(machine.purchase_price) 
                : "";

          return (
            <Marker 
              key={machine.id} 
              position={[machine.latitude!, machine.longitude!]} 
              icon={customIcon}
            >
              <Popup className="custom-popup">
                <div className="p-1">
                  <a href={`/machines/${machine.slug}`} className="block text-foreground hover:text-primary transition-colors !text-current !no-underline">
                    <p className="font-bold text-sm truncate m-0 pb-1">${machine.make} ${machine.model}</p>
                    <p className="text-xs text-muted-foreground m-0">${machine.city}, ${machine.state}</p>
                    <p className="text-sm font-semibold text-primary m-0 pt-2">${priceStr}</p>
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapBoundsController positions={positions} />
      </MapContainer>
    </div>
  );
}
