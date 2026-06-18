"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu } from "lucide-react";
import { NotificationBell } from "./notification-bell"; // 1. Removed `type Notification` from here
import type { NotificationItem } from "./dashboard-shell"; // 2. Imported the strict Prisma type we created

interface HeaderProps {
  onMenuClick: () => void;
  user: any;
  notifications: NotificationItem[]; // 3. Applied the exact Prisma type here
}

export function Header({ onMenuClick, user, notifications }: HeaderProps) {
  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
    : "AD";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#1E3348] bg-[#122336]/95 px-4 shadow-sm backdrop-blur-xl transition-all lg:px-6">
      {/* --- LEFT SIDE: Navigation & Branding --- */}
      <div className="flex flex-1 items-center gap-3 overflow-hidden pr-4 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-slate-400 hover:bg-[#1A2E44] hover:text-slate-200 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden h-5 w-[1px] shrink-0 bg-[#1E3348] lg:block" />

        <div className="flex items-center gap-3 overflow-hidden">
          <h1 className="truncate text-[13px] font-bold tracking-wide text-slate-100 sm:text-sm md:text-base">
            Institute of Meteorological Training and Research
          </h1>
          <span className="hidden shrink-0 rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-sky-400 sm:block">
            PORTAL
          </span>
        </div>
      </div>

      {/* --- RIGHT SIDE: Actions & Identity --- */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {/* Fed with live server data */}
        <div className="flex shrink-0 items-center justify-center">
          <NotificationBell initialNotifications={notifications} />
        </div>

        <div className="h-6 w-[1px] shrink-0 bg-[#1E3348]" />

        <div className="group flex cursor-pointer items-center gap-3 transition-opacity hover:opacity-80">
          <div className="hidden flex-col text-right md:flex">
            <span className="text-sm font-semibold leading-none text-slate-100">
              {user?.firstName || "System"} {user?.lastName || "Admin"}
            </span>
            <span className="mt-1 text-[10px] font-medium tracking-wider text-sky-400/80 uppercase">
              {user?.role?.replace("_", " ") || "ACADEMIC DIRECTOR"}
            </span>
          </div>

          <div className="relative shrink-0">
            <Avatar className="h-8 w-8 ring-2 ring-[#1E3348] transition-all group-hover:ring-[#3A5675] sm:h-9 sm:w-9">
              <AvatarImage src={user?.image || ""} alt={initials} />
              <AvatarFallback className="bg-gradient-to-br from-[#1E6B9B] to-[#0B2E4A] text-xs font-bold text-slate-200">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full border-2 border-[#122336] bg-emerald-500"></span>
          </div>
        </div>
      </div>
    </header>
  );
}
