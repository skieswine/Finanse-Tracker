"use client";

import { useEffect } from "react";

/** Registers /sw.js in production (installable PWA, offline fallback). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration is a progressive enhancement; the app works without it.
    });
  }, []);
  return null;
}
