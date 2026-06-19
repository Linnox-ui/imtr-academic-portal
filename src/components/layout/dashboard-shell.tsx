"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Prisma } from "@prisma/client";

import { Header } from "./header";
import { Sidebar } from "./sidebar";

export type NotificationItem = Prisma.NotificationGetPayload<{}>;

type DashboardUser = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  requiresPasswordChange: boolean;
  hasCoordinatorAccess?: boolean;
};

type DashboardShellProps = {
  children: ReactNode;
  user: DashboardUser;
  notifications: NotificationItem[];
};

export function DashboardShell({
  children,
  user,
  notifications,
}: DashboardShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
        mobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        userRole={user.role}
        hasCoordinatorAccess={user.hasCoordinatorAccess}
      />

      <div
        className={`flex h-screen min-w-0 max-w-full flex-col transition-all duration-300 ease-out ${
          isSidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        {/* FIXED: Removed the conflicting light background wrapper. 
            The Header component now handles its own dark background and blur. */}
        <div className="z-40 shrink-0">
          <Header
            user={user}
            notifications={notifications}
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />
        </div>

        {/* UPGRADED: Added a subtle transparent background and smooth scrolling */}
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/50 scroll-smooth">
          <div className="mx-auto min-w-0 max-w-[1500px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
            {/* UPGRADED: This now waits for the Header to drop down (delay-200), 
                then smoothly slides the main page content up from the bottom. */}
            <div className="min-w-0 max-w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both ease-out">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
