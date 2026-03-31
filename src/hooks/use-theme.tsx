"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = "dark" | "light" | "system";

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const storageKey = 'vite-ui-theme';
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'system';
    }
    try {
      return (localStorage.getItem(storageKey) as Theme) || 'system';
    } catch (e) {
      console.error('Failed to parse theme from localStorage', e);
      return 'system';
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let systemTheme: Theme = 'light';
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      systemTheme = 'dark';
    }
    
    const currentTheme = theme === 'system' ? systemTheme : theme;
    root.classList.add(currentTheme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      try {
        localStorage.setItem(storageKey, newTheme);
        setTheme(newTheme);
      } catch (e) {
        console.error('Failed to set theme in localStorage', e);
      }
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
