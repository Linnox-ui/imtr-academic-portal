"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Bell, CheckCircle2, Circle } from "lucide-react";
import {
  markNotificationAsRead,
  markAllAsRead,
} from "@/app/actions/notification.actions";
import type { NotificationItem } from "./dashboard-shell"; // 1. IMPORTED NEW TYPE

// 2. REMOVED the old custom export type Notification = { ... } block

export function NotificationBell({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[]; // 3. APPLIED HERE
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>( // 4. APPLIED HERE
    initialNotifications || [],
  );
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    startTransition(() => {
      markNotificationAsRead(id);
    });
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    startTransition(() => {
      markAllAsRead();
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* PERFECTLY MATCHED DARK THEME BELL TRIGGER */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-[#1A2E44] hover:text-white focus:outline-none"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 block h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#122336]"></span>
        )}
      </button>

      {/* BRIGHT, CLEAN DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 origin-top-right rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 shrink-0 backdrop-blur-sm">
            <h3 className="font-bold text-[#102030]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-bold text-[#1E6B9B] hover:text-[#0B2E4A] transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="overflow-y-auto overflow-x-hidden flex-1 p-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50 cursor-pointer ${!notification.isRead ? "bg-sky-50/40" : ""}`}
                    onClick={() =>
                      !notification.isRead && handleMarkAsRead(notification.id)
                    }
                  >
                    <div className="mt-0.5 shrink-0">
                      {notification.isRead ? (
                        <CheckCircle2 className="h-4 w-4 text-slate-300" />
                      ) : (
                        <Circle className="h-4 w-4 fill-sky-500 text-sky-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p
                        className={`text-sm leading-tight ${!notification.isRead ? "font-bold text-[#102030]" : "font-medium text-slate-600"}`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-1">
                        {new Intl.DateTimeFormat("en-KE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
