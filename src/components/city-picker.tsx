"use client";

import { useMemo, useRef, useState } from "react";
import { checkInCity, checkInCoords } from "@/app/checkin/actions";
import { cityLabel } from "@/lib/format";

type City = { id: string; name: string; country_code: string };

/**
 * Two ways to check in: tap a city from the (filterable) seeded list, or hit
 * "Find my city" — which reads coarse GPS, reverse-geocodes it to a city
 * name in the browser (BigDataCloud's free, keyless client endpoint), and
 * submits the coords to check_in_by_coords(). Both submit real <form>s whose
 * `action` is a Server Action, so the mutation stays on the server.
 */
export function CityPicker({ cities }: { cities: City[] }) {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coordsForm = useRef<HTMLFormElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const ccRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? cities.filter((c) => c.name.toLowerCase().includes(q))
      : cities;
    return list.slice(0, 8);
  }, [cities, query]);

  function detect() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("This browser's too thick to share location — pick a city below.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          );
          const data = await res.json();
          const name: string =
            data.city || data.locality || data.principalSubdivision || "";
          const cc: string = data.countryCode || "";
          if (!name) {
            setError("Couldn't pin your city — pick one from the list, ya cunt.");
            setLocating(false);
            return;
          }
          latRef.current!.value = String(latitude);
          lngRef.current!.value = String(longitude);
          nameRef.current!.value = name;
          ccRef.current!.value = cc;
          coordsForm.current!.requestSubmit();
        } catch {
          setError("Location lookup shat the bed — pick a city from the list.");
          setLocating(false);
        }
      },
      () => {
        setError(
          "You blocked location, ya paranoid sod — pick a city from the list.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={detect}
        disabled={locating}
        className="btn-amber w-full disabled:opacity-60"
      >
        {locating ? "Sniffing you out…" : "📍 Find my city"}
      </button>

      {error && (
        <p role="status" className="mt-3 banner banner-bad">
          {error}
        </p>
      )}

      {/* hidden auto-detect form, submitted programmatically once located */}
      <form ref={coordsForm} action={checkInCoords} className="hidden">
        <input ref={latRef} type="hidden" name="lat" />
        <input ref={lngRef} type="hidden" name="lng" />
        <input ref={nameRef} type="hidden" name="city_name" />
        <input ref={ccRef} type="hidden" name="country_code" />
      </form>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="…or just type a city, ya cunt"
        autoComplete="off"
        spellCheck={false}
        className="mt-5 w-full input"
      />

      <ul className="mt-2 divide-y divide-[var(--line)]">
        {matches.map((c) => (
          <li key={c.id}>
            <form action={checkInCity}>
              <input type="hidden" name="city_id" value={c.id} />
              <button
                type="submit"
                className="w-full py-3 text-left text-sm hover:text-[var(--amber)]"
              >
                {cityLabel(c.name, c.country_code)}
              </button>
            </form>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="py-3 text-sm text-[var(--muted)]">
            Nowt matches — &ldquo;Find my city&rdquo; works anywhere.
          </li>
        )}
      </ul>
    </div>
  );
}
