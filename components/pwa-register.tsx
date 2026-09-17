"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    async function registerServiceWorker() {
      try {
        const registration =
          await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          });

        console.log(
          "Service worker registered:",
          registration.scope
        );
      } catch (error) {
        console.error(
          "Service worker registration failed:",
          error
        );
      }
    }

    registerServiceWorker();
  }, []);

  return null;
}