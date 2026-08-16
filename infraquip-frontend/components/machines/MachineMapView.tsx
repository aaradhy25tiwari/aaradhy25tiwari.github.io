"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { MapPin, Map } from "lucide-react";
import type { MachineListItem } from "@/types/machine";
import { formatINR } from "@/lib/utils";

interface MachineMapViewProps {
  machines: MachineListItem[];
  className?: string;
}

export function MachineMapView({ machines, className }: MachineMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError(true);
      return;
    }
    if (!mapRef.current) return;

    setOptions({ key: apiKey, v: "weekly" });

    // Calculate center
    const machinesWithLocation = machines.filter(m => m.latitude && m.longitude);
    
    let center = { lat: 20.5937, lng: 78.9629 }; // Default India center
    let zoom = 5;

    if (machinesWithLocation.length > 0) {
      const avgLat = machinesWithLocation.reduce((sum, m) => sum + (m.latitude || 0), 0) / machinesWithLocation.length;
      const avgLng = machinesWithLocation.reduce((sum, m) => sum + (m.longitude || 0), 0) / machinesWithLocation.length;
      center = { lat: avgLat, lng: avgLng };
      zoom = machinesWithLocation.length === 1 ? 12 : 10;
    }

    Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
    ])
      .then(([{ Map: GoogleMap }, { AdvancedMarkerElement }]) => {
        const map = new GoogleMap(mapRef.current!, {
          center,
          zoom,
          mapId: "infraquip_search_map",
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
        });

        // Add markers
        machinesWithLocation.forEach((machine) => {
          const pinEl = document.createElement("div");
          pinEl.className = "group relative flex items-center justify-center cursor-pointer";
          
          // The pin itself
          const pinGraphic = document.createElement("div");
          pinGraphic.style.cssText = `
            width:32px;height:32px;border-radius:50% 50% 50% 0;
            background:#f59e0b;border:3px solid #fff;
            transform:rotate(-45deg);
            box-shadow:0 2px 8px rgba(0,0,0,.35);
            display:flex;align-items:center;justify-content:center;
          `;
          
          pinEl.appendChild(pinGraphic);

          // InfoWindow equivalent (custom tooltip)
          const tooltip = document.createElement("div");
          tooltip.className = "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg bg-card border border-border p-3 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-auto";
          
          const priceStr = machine.contact_for_price ? "Contact for price" : machine.rental_price_daily ? `${formatINR(machine.rental_price_daily)}/day` : machine.purchase_price ? formatINR(machine.purchase_price) : "";
          
          tooltip.innerHTML = `
            <a href="/machines/${machine.slug}" class="block">
              <p class="font-bold text-sm truncate text-foreground hover:text-primary transition-colors">${machine.make} ${machine.model}</p>
              <p class="text-xs text-muted-foreground mt-1">${machine.city}, ${machine.state}</p>
              <p class="text-sm font-semibold text-primary mt-2">${priceStr}</p>
            </a>
          `;
          
          pinEl.appendChild(tooltip);

          new AdvancedMarkerElement({
            map,
            position: { lat: machine.latitude!, lng: machine.longitude! },
            title: machine.title,
            content: pinEl,
          });
        });

        // If multiple markers, fit bounds
        if (machinesWithLocation.length > 1) {
            importLibrary("core").then(({ LatLngBounds }) => {
                const bounds = new LatLngBounds();
                machinesWithLocation.forEach(m => {
                    bounds.extend({ lat: m.latitude!, lng: m.longitude! });
                });
                map.fitBounds(bounds);
                // Add some padding after fit bounds
                const listener = map.addListener('idle', () => {
                   if (map.getZoom() && map.getZoom()! > 14) map.setZoom(14);
                   google.maps.event.removeListener(listener);
                });
            });
        }

        setLoaded(true);
      })
      .catch((e) => {
          console.error("Map load error:", e);
          setError(true);
      });
  }, [machines]);

  if (error || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-muted/30 p-8 text-center h-[500px] ${className ?? ""}`}>
        <MapPin className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Map View Unavailable</p>
          <p className="text-xs text-muted-foreground mt-1">
            Please configure a Google Maps API key to view machine locations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl border border-border overflow-hidden h-[500px] ${className ?? ""}`}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs text-muted-foreground">Loading map…</span>
          </div>
        </div>
      )}
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
