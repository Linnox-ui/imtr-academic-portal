import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  LifeBuoy,
  LogIn,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "Account Help | IMTR Academic Portal",
  description:
    "Activate a new IMTR portal account or continue a secure support request.",
  robots: {
    index: false,
    follow: false,
  },
};

const primaryOptions = [
  {
    title: "Activate Account",
    label: "New users",
    description:
      "Verify your registered details and create a password.",
    href: "/account-help/activate",
    icon: UserRoundCheck,
    accent:
      "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300 hover:border-emerald-300/35 hover:bg-emerald-400/[0.12]",
    iconAccent:
      "bg-emerald-400/10 text-emerald-300",
  },
  {
    title: "Track Recovery",
    label: "Existing ticket",
    description:
      "Use your ticket number and private access code.",
    href: "/account-help/track",
    icon: KeyRound,
    accent:
      "border-sky-400/20 bg-sky-400/[0.08] text-sky-300 hover:border-sky-300/35 hover:bg-sky-400/[0.12]",
    iconAccent:
      "bg-sky-400/10 text-sky-300",
  },
] as const;

export default function AccountHelpPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-36 -right-28 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:46px_46px]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-xs font-black text-slate-300 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Sign in
          </Link>

          <span className="hidden items-center gap-2 text-xs font-black text-emerald-300 sm:inline-flex">
            <ShieldCheck className="h-4 w-4" />
            Secure account services
          </span>
        </header>

        <section className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-5xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto relative h-20 w-20 overflow-hidden rounded-3xl bg-slate-100 p-2 shadow-2xl shadow-black/30 ring-1 ring-white/10">
                <Image
                  src="/images/gok-logo.png"
                  alt="Republic of Kenya"
                  fill
                  sizes="80px"
                  className="object-contain p-2"
                  priority
                />
              </div>

              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.26em] text-sky-300">
                IMTR Academic Portal
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                Account Help
              </h1>

              <p className="mx-auto mt-4 max-w-lg text-sm font-medium leading-6 text-slate-400">
                Choose the action that matches your account.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {primaryOptions.map(
                (option, index) => {
                  const Icon = option.icon;

                  return (
                    <Link
                      key={option.href}
                      href={option.href}
                      className={`group rounded-[28px] border p-6 shadow-xl shadow-black/10 transition-all duration-300 hover:-translate-y-1 ${option.accent} ${
                        index === 0
                          ? "animate-in fade-in slide-in-from-left-4 duration-700"
                          : "animate-in fade-in slide-in-from-right-4 duration-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${option.iconAccent}`}
                        >
                          <Icon className="h-7 w-7" />
                        </div>

                        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>

                      <p className="mt-6 text-[9px] font-black uppercase tracking-[0.18em] opacity-70">
                        {option.label}
                      </p>

                      <h2 className="mt-2 text-2xl font-black text-white">
                        {option.title}
                      </h2>

                      <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-slate-400">
                        {option.description}
                      </p>
                    </Link>
                  );
                },
              )}
            </div>

            <div className="mt-5 flex justify-center">
              <Link
                href="/login"
                className="group inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-black text-slate-300 transition-all hover:bg-white/[0.07] hover:text-white"
              >
                <LogIn className="h-[18px] w-[18px] text-emerald-300" />
                Return to sign in
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-500">
              <LifeBuoy className="h-3.5 w-3.5" />
              IMTR secure account support
            </div>
          </div>
        </section>

        <footer className="text-center text-[11px] font-semibold text-slate-600">
          Institute of Meteorological Training and Research
        </footer>
      </div>
    </main>
  );
}
