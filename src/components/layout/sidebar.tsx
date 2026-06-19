"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
  MessageSquare,
  Bell,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: string;
  exact?: boolean;
  activePrefixes?: string[];
};

const NAV_ITEMS: Record<string, NavItem[]> = {
  academic_director: [
    {
      label: "Overview",
      href: "/academic-director",
      icon: <LayoutDashboard className="h-5 w-5" />,
      exact: true,
    },
    {
      label: "Course Catalog",
      href: "/academic-director/courses",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      label: "Intakes & Cohorts",
      href: "/academic-director/intakes",
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: "Timetables",
      href: "/academic-director/timetables",
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: "Student Registry",
      href: "/academic-director/students",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Assessments",
      href: "/academic-director/assessments",
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      label: "Final Results Review",
      href: "/academic-director/results-review",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      label: "Reports",
      href: "/academic-director/reports",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      label: "Announcements",
      href: "/academic-director/communications",
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ],
  coordinator: [
    {
      label: "Coordinator Overview",
      href: "/coordinator",
      icon: <LayoutDashboard className="h-5 w-5" />,
      exact: true,
    },
    {
      label: "Assigned Class",
      href: "/coordinator/classes",
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: "Class Students",
      href: "/coordinator/students",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Course Units",
      href: "/coordinator/course-units",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      label: "Lecturer Allocation",
      href: "/coordinator/lecturer-allocation",
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      label: "Timetable",
      href: "/coordinator/timetable",
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: "CAT Results",
      href: "/coordinator/results",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      label: "Attendance",
      href: "/coordinator/attendance",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      label: "Announcements",
      href: "/coordinator/communications",
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ],
  lecturer: [
    {
      label: "My Teaching Units",
      href: "/lecturer/my-units",
      icon: <BookOpen className="h-5 w-5" />,
      activePrefixes: ["/lecturer/allocations"],
    },
    {
      label: "My Timetable",
      href: "/lecturer/timetable",
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: "Attendance",
      href: "/lecturer/attendance",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      label: "Results Entry",
      href: "/lecturer/results",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      label: "Announcements",
      href: "/lecturer/communications",
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ],
  student: [
    {
      label: "Dashboard",
      href: "/student",
      icon: <LayoutDashboard className="h-5 w-5" />,
      exact: true,
    },
    {
      label: "My Timetable",
      href: "/student/timetable",
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: "My Results",
      href: "/student/results",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      label: "Notifications",
      href: "/student/notifications",
      icon: <Bell className="h-5 w-5" />,
    },
  ],
  super_admin: [
    {
      label: "Dashboard",
      href: "/super-admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
      exact: true,
    },
    {
      label: "User Management",
      href: "/super-admin/users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Role Management",
      href: "/super-admin/roles",
      icon: <Shield className="h-5 w-5" />,
    },
    {
      label: "Final Results Review",
      href: "/super-admin/review",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      label: "Audit Logs",
      href: "/super-admin/audit-logs",
      icon: <Activity className="h-5 w-5" />,
    },
    {
      label: "System Config",
      href: "/super-admin/config",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      label: "Announcements",
      href: "/super-admin/communications",
      icon: <MessageSquare className="h-5 w-5" />,
    },
  ],
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  userRole: string;
  hasCoordinatorAccess?: boolean;
}

function isNavigationItemActive(pathname: string, item: NavItem) {
  if (item.exact) {
    return pathname === item.href;
  }
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }
  return (
    item.activePrefixes?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) ?? false
  );
}

export function Sidebar({
  isCollapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  userRole,
  hasCoordinatorAccess = false,
}: SidebarProps) {
  const pathname = usePathname();

  const baseItems = NAV_ITEMS[userRole] ?? [];
  const isDualRole = userRole === "lecturer" && hasCoordinatorAccess;
  const coordinatorItems = isDualRole ? NAV_ITEMS.coordinator : [];

  const renderNavList = (items: NavItem[]) => (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const isActive = isNavigationItemActive(pathname, item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onMobileClose}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300",
                isActive
                  ? "bg-gradient-to-r from-[#1E6B9B] to-[#16537A] text-white shadow-md shadow-black/10 ring-1 ring-white/10"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
                isCollapsed && "justify-center px-0",
              )}
            >
              {/* ANIMATED INDICATOR PILL */}
              <div
                className={cn(
                  "absolute left-0 top-1/2 h-1/2 w-1 -translate-y-1/2 rounded-r-full bg-sky-400 transition-all duration-300 ease-out",
                  isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                )}
              />

              {/* ICON WITH SMOOTH HOVER SCALING */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center transition-transform duration-300",
                  isActive
                    ? "scale-110 text-white"
                    : "text-slate-400 group-hover:scale-110 group-hover:text-sky-300",
                )}
              >
                {item.icon}
              </div>

              {/* TEXT WITH INTERACTIVE NUDGE */}
              {!isCollapsed ? (
                <span className="relative z-10 flex-1 transition-transform duration-300 group-hover:translate-x-1">
                  {item.label}
                </span>
              ) : null}

              {/* BADGE */}
              {!isCollapsed && item.badge ? (
                <Badge
                  variant="secondary"
                  className="relative z-10 ml-auto border-none bg-rose-500/90 text-white shadow-sm hover:bg-rose-500"
                >
                  {item.badge}
                </Badge>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-[#0B1724]/80 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-[#1E3348] bg-[#0B2E4A] text-slate-300 shadow-2xl transition-all duration-300 ease-out lg:shadow-none",
          isCollapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#1E3348] bg-[#122336] px-3 transition-all">
          {!isCollapsed ? (
            <div className="flex flex-1 items-center gap-3 overflow-hidden px-1">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-white/5 p-1 shadow-[0_0_15px_rgba(255,255,255,0.05)] ring-1 ring-white/10">
                <Image
                  src="/images/gok-logo.png"
                  alt="Republic of Kenya"
                  fill
                  sizes="36px"
                  className="object-contain p-0.5 drop-shadow-md"
                  priority
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="mb-0.5 text-[8px] font-extrabold uppercase leading-none tracking-[0.2em] text-slate-400">
                  Republic of Kenya
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[15px] font-black leading-none tracking-tight text-white">
                    IMTR
                  </span>
                  <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase leading-none tracking-wider text-sky-400">
                    Portal
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative mx-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-white/5 p-1 shadow-[0_0_15px_rgba(255,255,255,0.05)] ring-1 ring-white/10 transition-all hover:bg-white/10">
              <Image
                src="/images/gok-logo.png"
                alt="Government of Kenya"
                fill
                sizes="36px"
                className="object-contain p-0.5 drop-shadow-md"
                priority
              />
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "hidden h-7 w-7 shrink-0 text-slate-400 hover:bg-[#1A2E44] hover:text-white lg:flex",
              isCollapsed &&
                "absolute -right-3.5 top-14 mx-auto mt-4 rounded-full border border-[#1E3348] bg-[#122336] shadow-sm hover:bg-[#1A2E44]",
            )}
            onClick={onToggle}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6 scrollbar-hide">
          {baseItems.length === 0 ? (
            !isCollapsed ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-semibold leading-5 text-slate-400">
                  No navigation links are configured for this role.
                </p>
              </div>
            ) : null
          ) : (
            <div className="flex flex-col gap-6">
              {/* PRIMARY WORKSPACE */}
              <div>
                {!isCollapsed && (
                  <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {userRole === "lecturer" ? "My Teaching" : "Main Menu"}
                  </p>
                )}
                {renderNavList(baseItems)}
              </div>

              {/* COORDINATOR WORKSPACE (Only visible to assigned lecturers) */}
              {isDualRole && (
                <div
                  className={cn(
                    "relative overflow-hidden transition-all duration-300",
                    isCollapsed
                      ? "mt-4 rounded-xl border border-white/5 bg-white/5 p-1.5"
                      : "mt-2 rounded-2xl border border-sky-500/20 bg-[#0F2339]/50 p-3 shadow-inner",
                  )}
                >
                  {!isCollapsed && (
                    <div className="mb-4 flex items-center justify-between px-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">
                          Administration
                        </p>
                        <p className="text-[11px] font-bold text-slate-400">
                          Coordinator View
                        </p>
                      </div>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                      </span>
                    </div>
                  )}
                  {renderNavList(coordinatorItems)}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="border-t border-white/5 p-4">
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "group w-full justify-start rounded-xl text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-400",
              isCollapsed && "justify-center px-0",
            )}
            onClick={() => {
              window.location.href = "/login";
            }}
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            {!isCollapsed ? (
              <span className="ml-3 font-semibold"> Sign Out </span>
            ) : null}
          </Button>
        </div>
      </aside>
    </>
  );
}
