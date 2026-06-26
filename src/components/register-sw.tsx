"use client";

import { useEffect } from "react";

/**
 * Registers the minimal service worker (public/sw.js) once on the client.
 * That registration is what makes the app installable — Chrome only offers
 * the install prompt to sites with a service worker. Renders nothing.
 */
export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration can fail on unsupported/!secure contexts — harmless, the
      // app just isn't installable there.
    });
  }, []);

  return null;
}
