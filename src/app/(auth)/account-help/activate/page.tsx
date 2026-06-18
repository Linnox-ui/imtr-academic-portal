import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";

export const metadata: Metadata = {
  title:
    "Activate Account | IMTR Academic Portal",
  description:
    "Choose the correct IMTR account activation path.",
  robots: {
    index: false,
    follow: false,
  },
};

const options = [
  {
    title: "Staff",
    subtitle: "Staff number",
    href: "/account-help/activate/staff",
    icon: UserRoundCog,
    accent:
      "border-sky-400/20 bg-sky-400/[0.08] text-sky-300 hover:border-sky-300/35 hover:bg-sky-400/[0.12]",
  },
  {
    title: "Student",
    subtitle: "Admission number",
    href: "/account-help/activate/student",
    icon: GraduationCap,
    accent:
      "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300 hover:border-emerald-300/35 hover:bg-emerald-400/[0.12]",
  },
] as const;

export default function AccountActivationChoicePage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-36 -right-28 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:46px_46px]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 py-6 sm:px-8">
        <header>
          <Link
            href="/account-help"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-xs font-black text-slate-300 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Account Help
          </Link>
        </header>

        <section className="flex flex-1 items-center justify-center py-10">
          <div className="w-full animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700">
            <div className="mx-auto max-w-xl text-center">
              <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-3xl bg-slate-100 shadow-2xl shadow-black/30">
                <Image
                  src="/images/gok-logo.png"
                  alt="Republic of Kenya"
                  fill
                  sizes="80px"
                  className="object-contain p-2"
                  priority
                />
              </div>

              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">
                IMTR Academic Portal
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                Activate account
              </h1>

              <p className="mt-3 text-sm font-semibold text-slate-400">
                Choose your account type.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
              {options.map((option) => {
                const Icon = option.icon;

                return (
                  <Link
                    key={option.href}
                    href={option.href}
                    className={`group rounded-[28px] border p-6 shadow-xl shadow-black/10 transition-all duration-300 hover:-translate-y-1 ${option.accent}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
                        <Icon className="h-7 w-7" />
                      </div>

                      <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>

                    <p className="mt-6 text-2xl font-black text-white">
                      {option.title}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {option.subtitle}
                    </p>
                  </Link>
                );
              })}
            </div>

            <div className="mx-auto mt-6 flex max-w-lg items-center justify-center gap-2 text-[11px] font-semibold text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Automatic identity verification
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
