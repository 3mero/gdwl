"use client";

import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

export function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`useLocalStorage: error reading key "${key}"`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const valueToStore = JSON.stringify(storedValue);
        window.localStorage.setItem(key, valueToStore);
      }
    } catch (error) {
      console.error(`useLocalStorage: error writing key "${key}"`, error);
    }
  }, [key, storedValue]);

  const setValue: SetValue<T> = useCallback((value) => {
    setStoredValue(prev => {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      return newValue;
    });
  }, []);

  return [storedValue, setValue];
}
