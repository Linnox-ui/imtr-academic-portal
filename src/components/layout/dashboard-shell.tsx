"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Prisma } from "@prisma/client"; // Added Prisma import safely

import { Header } from "./header";
import { Sidebar } from "./sidebar";
// import { Notification } from "./notification-bell"; // Commented out as we are now using Prisma's generated type

// 1. Define the exact type directly from your Prisma schema
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

// 3. Add notifications to the function arguments
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
        <div className="sticky top-0 z-50 shrink-0 border-b border-border/70 bg-slate-50/90 backdrop-blur-xl">
          <Header
            user={user}
            notifications={notifications} // PASS THE LIVE DATA HERE INSTEAD OF []
            onMenuClick={() => setIsMobileMenuOpen(true)}
          />
        </div>

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto min-w-0 max-w-[1500px] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
            <div className="min-w-0 max-w-full animate-in fade-in duration-300">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
