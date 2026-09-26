'use client';

import { useEffect } from 'react';

export function PWARegistrar() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !navigator.serviceWorker
    ) {
      return;
    }

    let refreshing = false;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        // Check for updates immediately
        if (registration) {
          registration.update().catch(() => {});
        }

        // Listen for new service worker installation
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // When a new SW is activated while we already have one controlling,
            // the controllerchange event below will handle the reload.
            // This listener is kept for logging/debugging purposes.
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              console.log('[PWA] New service worker activated, awaiting controller change.');
            }
          });
        });
      } catch (err) {
        console.warn('Service Worker registration skipped or failed:', err);
      }
    };

    // Detect when a new SW takes control mid-session — reload once to get fresh content
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }, []);

  return null;
}
