import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import { ArrowLeft, Home, SearchX } from "lucide-react";

import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Page Not Found | IMTR Academic Portal",
  description: "The requested page could not be found.",
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

export default async function NotFoundPage() {
  const session = await auth();

  const role = session?.user?.role ?? null;
  const homeHref = role ? (ROLE_DESTINATIONS[role] ?? "/login") : "/login";
  const homeLabel = session?.user ? "Back to Dashboard" : "Back to Sign In";

  const displayName = session?.user
    ? [session.user.firstName, session.user.lastName].filter(Boolean).join(" ")
    : null;

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
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

          @keyframes softFloat {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-8px);
            }
          }

          .page-in {
            animation: pageIn 0.7s ease-out both;
          }

          .fade-up {
            animation: fadeUp 0.65s ease-out both;
          }

          .soft-float {
            animation: softFloat 4s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .page-in,
            .fade-up,
            .soft-float {
              animation: none !important;
              transform: none !important;
            }
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-44 -right-40 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035]">
          <div className="h-full w-full bg-[linear-gradient(rgba(15,23,42,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.8)_1px,transparent_1px)] bg-[size:44px_44px]" />
        </div>
      </div>

      <section className="page-in relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,0.45)]">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative overflow-hidden bg-[#082f49] p-8 text-white sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.28),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_42%)]" />
            <div className="absolute -bottom-14 -right-10 text-[190px] font-black leading-none text-white/[0.04]">
              404
            </div>

            <div className="relative flex h-full min-h-[360px] flex-col">
              <div className="fade-up flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white shadow-lg">
                  <Image
                    src="/images/gok-logo.png"
                    alt="Republic of Kenya coat of arms"
                    fill
                    sizes="56px"
                    className="object-contain p-1.5"
                    priority
                  />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-200">
                    Republic of Kenya
                  </p>
                  <p className="mt-1 font-black">IMTR Academic Portal</p>
                </div>
              </div>

              <div className="my-auto py-12">
                <div className="soft-float flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/10 text-sky-200 shadow-xl">
                  <SearchX className="h-10 w-10" />
                </div>

                <p className="fade-up mt-7 text-[11px] font-black uppercase tracking-[0.28em] text-sky-200">
                  Error 404
                </p>

                <h1 className="fade-up mt-3 text-4xl font-black tracking-tight">
                  Page not found
                </h1>

                <p className="fade-up mt-4 max-w-sm text-sm font-medium leading-7 text-slate-300">
                  The link may be wrong, expired, or no longer available.
                </p>
              </div>
            </div>
          </aside>

          <section className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <div className="fade-up inline-flex w-fit items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-sky-700">
              Navigation Help
            </div>

            <h2 className="fade-up mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              We could not find this page.
            </h2>

            <p className="fade-up mt-4 max-w-xl text-sm font-medium leading-7 text-slate-500">
              Return to your portal workspace or sign in again.
            </p>

            {session?.user ? (
              <div className="fade-up mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Signed in as
                </p>

                <p className="mt-1 font-black text-slate-900">
                  {displayName || "Portal User"}
                </p>

                <p className="mt-1 text-xs font-semibold text-sky-700">
                  {formatRole(session.user.role)}
                </p>
              </div>
            ) : null}

            <div className="fade-up mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={homeHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#082f49] px-6 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0c4a6e] hover:shadow-xl"
              >
                <Home className="h-4 w-4" />
                {homeLabel}
              </Link>

              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
              >
                <ArrowLeft className="h-4 w-4" />
                Login Page
              </Link>
            </div>

            <p className="fade-up mt-7 text-xs font-semibold leading-5 text-slate-400">
              If this was a valid portal link, contact the ICT administrator.
            </p>
          </section>
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
