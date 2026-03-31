'use client';

import { useEffect } from 'react';

export function PWARegistrar() {
  useEffect(() => {
    // التحقق الدقيق الحذر من دعم المتصفح لتجنب الخطأ
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      navigator.serviceWorker !== null &&
      typeof navigator.serviceWorker.register === 'function' // الفحص الأهم
    ) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .catch((err) => {
             // إخفاء الخطأ برمجياً حتى لا يؤثر على تجربة المستخدم
             console.warn('Service Worker registration skipped or failed:', err);
          });
      });
    }
  }, []);

  return null;
}
