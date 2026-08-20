import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Draggable-pin map (Leaflet + OpenStreetMap tiles, no API keys). Loaded
 * lazily by the address drawer — Leaflet and its CSS only ship when a map
 * is actually opened. Drag the pin or tap the map to reposition; every move
 * reports back through onPick.
 */

const pinIcon = L.divIcon({
  className: "",
  html:
    '<svg width="36" height="36" viewBox="0 0 24 24" fill="none">' +
    '<path d="M12 22s-7-6.2-7-11.3C5 6.4 8.1 3.5 12 3.5s7 2.9 7 7.2C19 15.8 12 22 12 22z" fill="#D9C49A" stroke="#111111" stroke-width="1.4"/>' +
    '<circle cx="12" cy="10.6" r="2.6" fill="#111111"/></svg>',
  iconSize: [36, 36],
  iconAnchor: [18, 34],
});

export default function MapPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number;
  lng: number;
  onPick: (lat: number, lng: number) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, {
      center: [lat, lng],
      zoom: 16,
      attributionControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const marker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      onPickRef.current(p.lat, p.lng);
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onPickRef.current(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    markerRef.current = marker;
    // The drawer animates in — measure again once layout settles.
    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow coordinate changes coming from outside (locate / suggestion pick).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const cur = marker.getLatLng();
    if (Math.abs(cur.lat - lat) > 1e-7 || Math.abs(cur.lng - lng) > 1e-7) {
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], Math.max(map.getZoom(), 16));
    }
  }, [lat, lng]);

  return (
    <div
      ref={divRef}
      role="application"
      aria-label="Pick your delivery location"
      style={{
        height: 250,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(58,58,58,0.12)",
        // Contain Leaflet's internal z-indexes inside the drawer.
        position: "relative",
        isolation: "isolate",
        zIndex: 0,
      }}
    />
  );
}
