"use client";

import React from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export function NotificationBell({ onClick, className = '' }: NotificationBellProps) {
  const { unreadCount } = useNotifications();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className={`relative h-10 w-10 rounded-xl border-primary/25 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 shadow-sm ${className}`}
      title="التنبيهات والإشعارات"
      aria-label="التنبيهات والإشعارات"
    >
      <Bell
        className={`h-5 w-5 text-foreground transition-transform duration-300 ${
          unreadCount > 0 ? 'animate-wiggle text-primary' : ''
        }`}
      />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-extrabold shadow-md border-2 border-background animate-pulse ring-2 ring-red-500/30">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      <span className="sr-only">التنبيهات والإشعارات</span>
    </Button>
  );
}
