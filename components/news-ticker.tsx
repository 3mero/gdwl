
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Progress } from './ui/progress';
import { DayData } from '@/lib/types';

export interface TickerItemData {
  id: string;
  date: string;
  node: React.ReactNode;
  type: 'work' | 'holiday' | 'pin' | 'note' | 'info';
  data?: DayData;
  relatedDays?: string[];
}

interface NewsTickerProps {
  items: TickerItemData[];
  separator: React.ReactNode;
  duration?: number; // Duration in seconds for each item
  onItemClick: (item: TickerItemData) => void;
}

export function NewsTicker({ items, separator, duration = 8, onItemClick }: NewsTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const combinedItems: (TickerItemData | {type: 'separator', node: React.ReactNode, id: string})[] = React.useMemo(() => {
    if (items.length === 0) return [];
    if (items.length === 1) return items;
    return items.flatMap((item, index) => [item, {type: 'separator' as const, node: separator, id: `sep-${index}`}]).slice(0, -1);
  }, [items, separator]);

  const totalDisplayItems = combinedItems.length;

  const advanceTicker = useCallback((direction: 'next' | 'prev' = 'next') => {
    if (totalDisplayItems <= 1) return;
    
    setIsExiting(true); // Start exit animation
    setTimeout(() => {
        setCurrentIndex(prevIndex => {
            if (direction === 'next') {
                return (prevIndex + 1) % totalDisplayItems;
            } else {
                return (prevIndex - 1 + totalDisplayItems) % totalDisplayItems;
            }
        });
        setProgress(100); // Reset progress for the new item
        setIsExiting(false); // End exit animation, new item will animate in
    }, 300); // This should match the CSS transition duration
  }, [totalDisplayItems]);

  useEffect(() => {
    if (isPaused || totalDisplayItems <= 1) return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration * 20)); // Update 20 times per second
        if (newProgress <= 0) {
          advanceTicker('next');
          return 100;
        }
        return newProgress;
      });
    }, 50); // 1000ms / 20 = 50ms

    return () => clearInterval(progressInterval);
  }, [isPaused, duration, advanceTicker, totalDisplayItems]);
  
  if (totalDisplayItems === 0) {
    return null;
  }

  const currentItem = combinedItems[currentIndex];
  
  // Safeguard against currentItem being undefined
  if (!currentItem) {
    return null;
  }

  const isClickable = currentItem.type !== 'separator' && currentItem.type !== 'info';

  const itemStyle = {
    transform: isExiting ? 'translateY(-100%)' : 'translateY(0%)',
    opacity: isExiting ? 0 : 1,
    transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center w-full group h-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
       <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
         {totalDisplayItems > 1 && (
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => advanceTicker('prev')}
            >
                <ChevronUp className="h-5 w-5" />
                <span className="sr-only">الخبر السابق</span>
            </Button>
         )}

         <div 
            key={currentIndex} 
            className="absolute w-full h-full flex items-center justify-center"
            style={itemStyle}
            >
            <div 
                className={cn(
                    "px-4 py-2 text-base font-semibold text-foreground transition-all duration-300",
                    "border bg-background/50 backdrop-blur-sm rounded-lg",
                    isClickable && "cursor-pointer hover:bg-accent/70"
                )}
                onClick={() => isClickable && onItemClick(currentItem as TickerItemData)}
            >
                {currentItem.node}
            </div>
          </div>

         {totalDisplayItems > 1 && (
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => advanceTicker('next')}
            >
                <ChevronDown className="h-5 w-5" />
                <span className="sr-only">الخبر التالي</span>
            </Button>
         )}
       </div>

       {totalDisplayItems > 1 && (
        <Progress 
          value={progress} 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-[calc(100%-4rem)] max-w-lg bg-transparent"
        />
       )}
    </div>
  );
}
