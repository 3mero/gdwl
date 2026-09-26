"use client";

import { useState, useEffect, useRef } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Always start with initialValue for consistent SSR/hydration behavior.
  // Real data is loaded from localStorage in the useEffect below.
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      // FIRST RUN: Read stored data from localStorage.
      // We never write during this phase to prevent overwriting real data
      // with the SSR initialValue during hydration.
      isInitialized.current = true;
      try {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
      }
      return;
    }

    // SUBSEQUENT RUNS: Persist value changes to localStorage
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error writing localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const setValue = (value: T | ((val: T) => T)) => {
    setStoredValue((prevValue) => {
      return value instanceof Function ? value(prevValue) : value;
    });
  };

  return [storedValue, setValue] as const;
}
