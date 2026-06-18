import type { ElementType } from "react";
import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  ShieldCheck,
} from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In | IMTR Academic Portal",
  description: "Secure access to the IMTR Academic Portal.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <section className="relative mx-auto grid min-h-[100dvh] w-full max-w-[1500px] lg:grid-cols-[1.08fr_0.92fr]">
        <aside className="hidden min-h-[100dvh] flex-col justify-between p-10 lg:flex xl:p-14">
          <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-white p-1 shadow-2xl shadow-black/30 ring-1 ring-white/20">
                <Image
                  src="/images/gok-logo.png"
                  alt="Republic of Kenya"
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                  priority
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-sky-300">
                  Republic of Kenya
                </p>

                <p className="mt-1 text-lg font-black text-white">
                  IMTR Academic Portal
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-xl animate-in fade-in slide-in-from-left-6 duration-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure academic access
            </span>

            <h1 className="mt-6 text-5xl font-black leading-[1.04] tracking-[-0.045em] text-white xl:text-6xl">
              One portal.
              <span className="block text-sky-300">Every academic role.</span>
            </h1>

            <p className="mt-6 max-w-lg text-base font-medium leading-7 text-slate-400">
              Access learning, teaching and administration from one secure
              workspace.
            </p>

            <div className="mt-9 grid max-w-lg grid-cols-2 gap-3">
              <Feature icon={BookOpenCheck} label="Academic records" />

              <Feature icon={BadgeCheck} label="Role-based access" />
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-600">
            Institute of Meteorological Training and Research
          </p>
        </aside>

        <div className="flex min-h-[100dvh] items-center justify-center px-4 py-6 sm:px-8 lg:bg-white/[0.025]">
          <div className="w-full max-w-[440px] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700">
            <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white p-1 shadow-xl">
                <Image
                  src="/images/gok-logo.png"
                  alt="Republic of Kenya"
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                  priority
                />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">
                  Republic of Kenya
                </p>

                <p className="mt-0.5 font-black text-white">
                  IMTR Academic Portal
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-100 shadow-2xl shadow-black/30">
              <div className="px-6 pb-4 pt-7 sm:px-8 sm:pt-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-700">
                  Welcome back
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Sign in
                </h2>
              </div>

              <div className="px-6 pb-7 sm:px-8 sm:pb-8">
                <LoginForm />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-3 text-xs font-bold text-slate-400">
              <Link
                href="/account-help/activate"
                className="transition-colors hover:text-white"
              >
                Activate account
              </Link>

              <span className="h-1 w-1 rounded-full bg-slate-700" />

              <Link
                href="/account-help"
                className="inline-flex items-center gap-1 transition-colors hover:text-white"
              >
                Account help
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, label }: { icon: ElementType; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
        <Icon className="h-4 w-4" />
      </div>

      <span className="text-xs font-black text-slate-300">{label}</span>
    </div>
  );
}
