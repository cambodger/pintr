"use client";

import dynamic from "next/dynamic";

export type PresencePin = {
  member_id: string;
  display_name: string;
  pin_emoji: string;
  status_text: string | null;
  status_emoji: string | null;
  city_name: string;
  country_code: string;
  lat: number;
  lng: number;
  since: string;
};

// Leaflet touches `window` at module load, so the actual map is loaded
// browser-only (ssr: false). That dynamic import is only allowed inside a
// Client Component — hence this thin wrapper between the server page and the
// map itself.
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
      Loading map…
    </div>
  ),
});

export function PresenceMap({
  pins,
  meId,
}: {
  pins: PresencePin[];
  meId: string | null;
}) {
  return (
    <div className="h-[55vh] w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <LeafletMap pins={pins} meId={meId} />
    </div>
  );
}
