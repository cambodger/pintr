"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cityLabel, timeAgo } from "@/lib/format";
import type { PresencePin } from "./presence-map";

// Emoji marker via a divIcon — also sidesteps Leaflet's default-marker image
// paths, which break under bundlers.
function emojiIcon(emoji: string, highlight: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="font-size:30px;line-height:30px;text-align:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45));${
      highlight ? "transform:scale(1.15);" : ""
    }">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

// People in the same city share lat/lng; scatter the overlapping pins on a
// golden-angle spiral so each stays tappable.
function spread(pins: PresencePin[]) {
  const seen = new Map<string, number>();
  return pins.map((p) => {
    const key = `${p.lat},${p.lng}`;
    const i = seen.get(key) ?? 0;
    seen.set(key, i + 1);
    if (i === 0) return { ...p, dlat: 0, dlng: 0 };
    const angle = (i * 137.5 * Math.PI) / 180;
    const r = 0.013 * Math.ceil(i / 6);
    return { ...p, dlat: r * Math.sin(angle), dlng: r * Math.cos(angle) };
  });
}

export default function LeafletMap({
  pins,
  meId,
}: {
  pins: PresencePin[];
  meId: string | null;
}) {
  const placed = spread(pins);
  const center: [number, number] = placed.length
    ? [placed[0].lat, placed[0].lng]
    : [51.5074, -0.128]; // default: London
  const zoom = placed.length > 1 ? 3 : placed.length === 1 ? 9 : 4;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {placed.map((p) => (
        <Marker
          key={p.member_id}
          position={[p.lat + p.dlat, p.lng + p.dlng]}
          icon={emojiIcon(p.pin_emoji, p.member_id === meId)}
        >
          <Popup>
            <strong>
              {p.display_name}
              {p.member_id === meId ? " (you)" : ""}
            </strong>
            <br />
            {cityLabel(p.city_name, p.country_code)}
            <br />
            <span style={{ color: "#6b7280" }}>{timeAgo(p.since)}</span>
            {p.status_text ? (
              <>
                <br />
                {p.status_emoji ? `${p.status_emoji} ` : ""}
                {p.status_text}
              </>
            ) : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
