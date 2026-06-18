import type { Metadata } from "next";

import Link from "next/link";

import {
  ArrowLeft,
  LockKeyhole,
  LogIn,
  LogOut,
  OctagonX,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import { auth, signOut } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Access Denied | IMTR Academic Portal",
  description: "You are not authorised to access this section.",
  robots: {
    index: false,
    follow: false,
  },
};

const ROLE_DESTINATIONS: Record<string, string> = {
  super_admin: "/super-admin",
  academic_director: "/academic-director",
  training_admin: "/training-admin",
  department_admin: "/department-admin",
  ict_admin: "/ict-admin",
  coordinator: "/coordinator",
  lecturer: "/lecturer",
  student: "/student",
};

async function handleSignOut() {
  "use server";

  await signOut({
    redirectTo: "/login",
  });
}

export default async function UnauthorizedPage() {
  const session = await auth();

  const role = session?.user?.role ?? null;
  const dashboardHref = role ? (ROLE_DESTINATIONS[role] ?? "/login") : "/login";

  const displayName = session?.user
    ? [session.user.firstName, session.user.lastName].filter(Boolean).join(" ")
    : null;

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#05080d] px-4 py-10 text-white">
      <style>
        {`
          @keyframes pageIn {
            from {
              opacity: 0;
              transform: translateY(18px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes fadeUp {
            from {
              opacity: 0;
              transform: translateY(14px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulseGlow {
            0%, 100% {
              box-shadow: 0 0 45px rgba(220, 38, 38, 0.25);
            }
            50% {
              box-shadow: 0 0 75px rgba(220, 38, 38, 0.42);
            }
          }

          .page-in {
            animation: pageIn 0.7s ease-out both;
          }

          .fade-up {
            animation: fadeUp 0.65s ease-out both;
          }

          .pulse-glow {
            animation: pulseGlow 3.5s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .page-in,
            .fade-up,
            .pulse-glow {
              animation: none !important;
              transform: none !important;
            }
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(127,29,29,0.16),transparent_35%)]" />
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-red-600 to-transparent shadow-[0_0_25px_rgba(220,38,38,0.9)]" />
        <div className="absolute -left-40 top-1/4 h-80 w-80 rounded-full bg-red-700/10 blur-3xl" />
        <div className="absolute -right-40 bottom-1/4 h-80 w-80 rounded-full bg-red-700/10 blur-3xl" />

        <div className="absolute inset-0 opacity-[0.035]">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[size:42px_42px]" />
        </div>
      </div>

      <section className="page-in relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-red-500/25 bg-[#0a0f17]/95 shadow-[0_35px_120px_-30px_rgba(220,38,38,0.55)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-red-500/20 bg-red-950/30 px-5 py-3 sm:px-7">
          <div className="flex items-center gap-2 text-red-400">
            <TriangleAlert className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.24em]">
              Restricted Access
            </span>
          </div>

          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-red-300">
            Denied
          </span>
        </div>

        <div className="p-6 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="pulse-glow relative flex h-28 w-28 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
              <div className="absolute inset-3 rounded-full border border-red-500/20" />
              <OctagonX className="relative h-14 w-14 text-red-500" />
            </div>

            <p className="fade-up mt-7 text-[11px] font-black uppercase tracking-[0.3em] text-red-400">
              Access Denied
            </p>

            <h1 className="fade-up mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
              You cannot open this page.
            </h1>

            <p className="fade-up mt-5 max-w-xl text-sm font-semibold leading-7 text-slate-400 sm:text-base">
              Your current account does not have permission to access this
              section.
            </p>
          </div>

          {session?.user ? (
            <div className="fade-up mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Current Account
                  </p>

                  <p className="mt-1 truncate font-black text-white">
                    {displayName || session.user.email || "Portal User"}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-red-400">
                    {formatRole(role ?? "unknown")}
                  </p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-red-300">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Permission Refused
                </span>
              </div>
            </div>
          ) : (
            <div className="fade-up mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <ShieldAlert className="mx-auto h-6 w-6 text-red-400" />
              <p className="mt-3 text-sm font-semibold text-slate-400">
                Sign in with an authorised account to continue.
              </p>
            </div>
          )}

          <div className="fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={dashboardHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-slate-950 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-xl"
            >
              {session?.user ? (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Back to Sign In
                </>
              )}
            </Link>

            {session?.user ? (
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 text-sm font-black text-red-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-500/20 sm:w-auto"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </form>
            ) : null}
          </div>
        </div>

        <div className="border-t border-red-500/20 bg-red-950/20 px-5 py-4 text-center sm:px-7">
          <p className="text-[11px] font-semibold text-slate-500">
            Contact the IMTR ICT administrator if this restriction is an error.
          </p>
        </div>
      </section>
    </main>
  );
}

function formatRole(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
