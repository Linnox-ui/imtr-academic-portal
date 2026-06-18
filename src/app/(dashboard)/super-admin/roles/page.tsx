import { redirect } from "next/navigation";
import { Info, ShieldCheck } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SYSTEM_ROLES } from "@/lib/constants/roles";

import { RoleManagementClient } from "./role-management-client";

export const dynamic = "force-dynamic";

export default async function RoleManagementPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true, role: { select: { name: true } } },
  });

  if (
    !currentUser ||
    !currentUser.isActive ||
    currentUser.role.name !== "super_admin"
  ) {
    redirect("/unauthorized");
  }

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { users: true } },
    },
  });

  const totalAssigned = roles.reduce((sum, role) => sum + role._count.users, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {/* --- EXECUTIVE HERO BANNER --- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 sm:px-8 sm:py-8 text-white shadow-md border border-slate-800">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck
                className="h-4 w-4 text-indigo-400"
                aria-hidden="true"
              />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                Access Control
              </p>
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl mb-2">
              Role Management
            </h1>

            <p className="max-w-2xl text-sm font-medium leading-6 text-slate-300">
              Create and maintain the access roles that group portal accounts.
              Core roles are protected; custom roles are yours to define.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col items-center justify-center min-w-[100px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm shadow-sm">
              <p className="text-2xl font-black text-white">{roles.length}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Roles
              </p>
            </div>
            <div className="flex flex-col items-center justify-center min-w-[100px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm shadow-sm">
              <p className="text-2xl font-black text-white">{totalAssigned}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Assigned
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- INFO ALERT --- */}
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-50/50 px-5 py-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600"
          aria-hidden="true"
        />
        <p className="text-xs font-bold leading-5 text-indigo-900">
          Adding a role here only creates a label — it does not grant access to
          any module. Route guards check for specific role names in code, so a
          new role needs matching checks added elsewhere before it can do
          anything.
        </p>
      </div>

      {/* --- CLIENT COMPONENT --- */}
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
        <RoleManagementClient roles={roles} systemRoles={SYSTEM_ROLES} />
      </div>
    </div>
  );
}
