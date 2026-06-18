import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  GraduationCap,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

import { StudentActivationForm } from "./student-activation-form";

export const metadata: Metadata = {
  title:
    "Activate Student Account | IMTR Academic Portal",
  description:
    "Verify an IMTR student account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ActivateStudentAccountPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-36 -right-28 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:46px_46px]" />
      </div>

      <section className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full">
          <Link
            href="/account-help/activate"
            className="mb-5 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-xs font-black text-slate-300 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Account type
          </Link>

          <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[0.82fr_1.18fr]">
            <aside className="relative hidden overflow-hidden border-r border-white/10 p-10 lg:flex lg:flex-col">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_42%)]" />

              <div className="relative flex min-h-[540px] flex-col">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-slate-100 shadow-xl">
                    <Image
                      src="/images/gok-logo.png"
                      alt="Republic of Kenya"
                      fill
                      sizes="56px"
                      className="object-contain p-1.5"
                      priority
                    />
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">
                      Republic of Kenya
                    </p>

                    <p className="mt-0.5 font-black">
                      IMTR Academic Portal
                    </p>
                  </div>
                </div>

                <div className="my-auto animate-in fade-in slide-in-from-left-4 duration-700">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-emerald-300">
                    <GraduationCap className="h-8 w-8" />
                  </div>

                  <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                    Student account
                  </p>

                  <h1 className="mt-3 text-4xl font-black tracking-tight">
                    Verify record
                  </h1>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <KeyRound className="h-4 w-4 text-emerald-300" />

                  <span className="text-xs font-black text-slate-300">
                    Continue to password setup
                  </span>
                </div>
              </div>
            </aside>

            <section className="bg-slate-100 p-6 text-slate-950 sm:p-9 lg:p-12">
              <div className="mb-7 flex items-center gap-3 lg:hidden">
                <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-slate-200">
                  <Image
                    src="/images/gok-logo.png"
                    alt="Republic of Kenya"
                    fill
                    sizes="48px"
                    className="object-contain p-1.5"
                    priority
                  />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-700">
                    IMTR Academic Portal
                  </p>

                  <p className="mt-0.5 text-sm font-black">
                    Student activation
                  </p>
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Student Registry
                </div>

                <h2 className="mt-4 text-3xl font-black tracking-tight">
                  Student details
                </h2>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Use the details submitted during registration.
                </p>

                <div className="mt-7">
                  <StudentActivationForm />
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
