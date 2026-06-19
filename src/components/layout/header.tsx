"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import type { NotificationItem } from "./dashboard-shell";

interface HeaderProps {
  onMenuClick: () => void;
  user: any;
  notifications: NotificationItem[];
}

export function Header({ onMenuClick, user, notifications }: HeaderProps) {
  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
    : "AD";

  return (
    // ADDED: Smooth slide-down entrance for the entire header
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#1E3348] bg-[#122336]/95 px-4 shadow-sm backdrop-blur-xl transition-all lg:px-6 animate-in fade-in slide-in-from-top-8 duration-500 ease-out">
      {/* --- LEFT SIDE: Navigation & Branding --- */}
      <div className="flex flex-1 items-center gap-3 overflow-hidden pr-4 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          // ADDED: active:scale-90 for a tactile "press" feel on mobile
          className="shrink-0 text-slate-400 transition-all duration-200 hover:bg-[#1A2E44] hover:text-white active:scale-90 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 transition-transform duration-300 hover:rotate-90" />
        </Button>

        <div className="hidden h-5 w-[1px] shrink-0 bg-[#1E3348] lg:block" />

        <div className="flex items-center gap-3 overflow-hidden">
          <h1 className="truncate text-[13px] font-bold tracking-wide text-slate-100 sm:text-sm md:text-base">
            Institute of Meteorological Training and Research
          </h1>
          {/* ADDED: A subtle fade-in delay for the PORTAL badge */}
          <span className="hidden shrink-0 rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-sky-400 sm:block animate-in fade-in zoom-in duration-700 delay-300 fill-mode-both">
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

        {/* ADDED: hover:opacity-100 and a group class for synchronized hover physics */}
        <div className="group flex cursor-pointer items-center gap-3 transition-all duration-300 hover:opacity-100">
          {/* ADDED: Text slides slightly towards the avatar on hover */}
          <div className="hidden flex-col text-right md:flex transition-transform duration-300 group-hover:-translate-x-1">
            <span className="text-sm font-semibold leading-none text-slate-100 transition-colors group-hover:text-white">
              {user?.firstName || "System"} {user?.lastName || "Admin"}
            </span>
            <span className="mt-1 text-[10px] font-medium tracking-wider text-sky-400/80 uppercase transition-colors group-hover:text-sky-300">
              {user?.role?.replace("_", " ") || "ACADEMIC DIRECTOR"}
            </span>
          </div>

          {/* ADDED: Avatar scales up and ring highlights on hover */}
          <div className="relative shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Avatar className="h-8 w-8 ring-2 ring-[#1E3348] transition-all duration-300 group-hover:ring-sky-500/50 group-hover:shadow-lg group-hover:shadow-sky-500/20 sm:h-9 sm:w-9">
              <AvatarImage src={user?.image || ""} alt={initials} />
              <AvatarFallback className="bg-gradient-to-br from-[#1E6B9B] to-[#0B2E4A] text-xs font-bold text-slate-200">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* ADDED: The green "online" dot now has a very soft, continuous radar ping behind it */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-[#122336] bg-emerald-500 transition-transform group-hover:scale-110"></span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
