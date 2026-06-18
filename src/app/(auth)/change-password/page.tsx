import type { Metadata } from "next";

import Image from "next/image";
import { redirect } from "next/navigation";

import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Change Password | IMTR Academic Portal",

  description:
    "Create a new secure password for your IMTR Academic Portal account.",
};

const ROLE_DESTINATIONS: Record<string, string> = {
  super_admin: "/super-admin",
  academic_director: "/academic-director",
  training_admin: "/training-admin",
  ict_admin: "/ict-admin",
  coordinator: "/coordinator",
  lecturer: "/lecturer",
  student: "/student",
};

export default async function ChangePasswordPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      requiresPasswordChange: true,

      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    redirect("/login");
  }

  if (!user.requiresPasswordChange) {
    redirect(ROLE_DESTINATIONS[user.role.name] ?? "/unauthorized");
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_28px_100px_-35px_rgba(15,23,42,0.4)] lg:grid-cols-[0.8fr_1.2fr]">
          <section className="relative overflow-hidden bg-[#082f49] p-7 text-white sm:p-9">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.28),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_40%)]" />

            <div className="relative flex h-full flex-col">
              <div className="flex items-center gap-3">
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

                  <p className="mt-1 font-black text-white">
                    IMTR Academic Portal
                  </p>
                </div>
              </div>

              <div className="my-auto py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-sky-200">
                  <KeyRound className="h-8 w-8" />
                </div>

                <h1 className="mt-6 text-3xl font-black tracking-tight">
                  Secure your account
                </h1>

                <p className="mt-4 text-sm font-medium leading-7 text-slate-300">
                  Your account is using a temporary password. Create a private
                  password before accessing the portal.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
                <LockKeyhole className="h-4 w-4" />
                Secure institutional access
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-9 lg:p-12">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                First sign-in security
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                Change your password
              </h2>

              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                Signed in as{" "}
                <span className="font-black text-slate-800">
                  {user.firstName} {user.lastName}
                </span>
                . After updating your password, sign in again using the new
                password.
              </p>
            </div>

            <ChangePasswordForm />
          </section>
        </div>
      </div>
    </div>
  );
}
