
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface HighlightItem {
    monthKey: string;
    dayKeys?: string[]; // Array of 'yyyy-MM-dd'
}

interface HighlightContextType {
    highlightedItem: HighlightItem | null;
    setHighlightedItem: (item: HighlightItem | null) => void;
}

const HighlightContext = createContext<HighlightContextType | undefined>(undefined);

export function HighlightProvider({ children }: { children: ReactNode }) {
    const [highlightedItem, setHighlightedItem] = useState<HighlightItem | null>(null);

    useEffect(() => {
        if (highlightedItem) {
            const timer = setTimeout(() => {
                setHighlightedItem(null);
            }, 15000); // Highlight duration: 15 seconds

            return () => clearTimeout(timer);
        }
    }, [highlightedItem]);

    const value = { highlightedItem, setHighlightedItem };

    return (
        <HighlightContext.Provider value={value}>
            {children}
        </HighlightContext.Provider>
    );
}

export function useHighlight() {
    const context = useContext(HighlightContext);
    if (context === undefined) {
        throw new Error('useHighlight must be used within a HighlightProvider');
    }
    return context;
}

    
