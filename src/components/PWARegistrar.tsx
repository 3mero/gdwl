'use client';

import { useEffect } from 'react';

export function PWARegistrar() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      navigator.serviceWorker !== null &&
      typeof navigator.serviceWorker.register === 'function'
    ) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .catch((err) => {
             console.warn('Service Worker registration skipped or failed:', err);
          });
      });
    }
  }, []);

  return null;
}
