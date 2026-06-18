"use client";

import type { ElementType, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Copy,
  Fingerprint,
  Filter,
  IdCard,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  RefreshCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  createPortalUser,
  openPortalUserPasswordRecovery,
  setPortalUserActiveState,
  updatePortalUserRole,
} from "@/app/actions/super-admin-user.actions";
import type { UserManagementActionResult } from "@/app/actions/super-admin-user.actions";

type PortalRole = {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
};

type PortalUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  accountStatus: string;
  requiresPasswordChange: boolean;
  createdAt: string;
  updatedAt: string;

  role: {
    id: string;
    name: string;
    description: string | null;
  };

  identityProfile: {
    nationalIdLast4: string | null;
    dateOfBirth: string | null;
    phone: string | null;
    staffNumber: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
  } | null;

  studentProfile: {
    id: string;
    admissionNumber: string;
    academicStatus: string;

    intake: {
      id: string;
      code: string;
      title: string;

      course: {
        id: string;
        code: string;
        title: string;
      };
    };
  } | null;
};

type AccountHelpNotice = {
  kind: "NEW_ACCOUNT" | "PASSWORD_RECOVERY";
  title: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  dateOfBirth?: string;
  nationalIdLast4?: string;
  accountStatus?: string;
  referenceLabel: string;
  reference: string;
  privateAccessCode: string;
  staffNumber?: string;
  message: string;
};

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING_ACTIVATION"
  | "IDENTITY_INCOMPLETE"
  | "PASSWORD_CHANGE";

type SuperAdminUserManagerProps = {
  currentAdmin: {
    id: string;
    name: string;
    email: string;
  };

  summary: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    passwordChangeRequired: number;
    activeSuperAdmins: number;
    totalRoles: number;
    incompleteIdentityProfiles: number;
  };

  roles: PortalRole[];
  users: PortalUser[];
};

export function SuperAdminUserManager({
  currentAdmin,
  summary,
  roles,
  users,
}: SuperAdminUserManagerProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");

  const [roleFilter, setRoleFilter] = useState("ALL");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [roleSelections, setRoleSelections] = useState<Record<string, string>>(
    () => Object.fromEntries(users.map((user) => [user.id, user.role.id])),
  );

  const [accountHelpNotice, setAccountHelpNotice] =
    useState<AccountHelpNotice | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);

  const [isCreating, startCreateTransition] = useTransition();

  const [isPerformingUserAction, startUserActionTransition] = useTransition();

  useEffect(() => {
    setRoleSelections(
      Object.fromEntries(users.map((user) => [user.id, user.role.id])),
    );
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedQuery ||
        `${user.firstName} ${user.lastName}`
          .toLowerCase()
          .includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.role.name.toLowerCase().includes(normalizedQuery) ||
        user.identityProfile?.staffNumber
          ?.toLowerCase()
          .includes(normalizedQuery) ||
        user.identityProfile?.phone?.toLowerCase().includes(normalizedQuery) ||
        user.identityProfile?.nationalIdLast4
          ?.toLowerCase()
          .includes(normalizedQuery) ||
        user.studentProfile?.admissionNumber
          .toLowerCase()
          .includes(normalizedQuery) ||
        user.studentProfile?.intake.code
          .toLowerCase()
          .includes(normalizedQuery) ||
        user.studentProfile?.intake.course.code
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesRole = roleFilter === "ALL" || user.role.id === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.isActive) ||
        (statusFilter === "INACTIVE" && !user.isActive) ||
        (statusFilter === "PENDING_ACTIVATION" &&
          user.accountStatus === "PENDING_ACTIVATION") ||
        (statusFilter === "IDENTITY_INCOMPLETE" &&
          user.role.name !== "student" &&
          !hasCompleteStaffIdentity(user)) ||
        (statusFilter === "PASSWORD_CHANGE" && user.requiresPasswordChange);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, searchQuery, statusFilter, users]);

  const handleCreateUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    const firstName = String(formData.get("firstName") ?? "").trim();

    const lastName = String(formData.get("lastName") ?? "").trim();

    const roleId = String(formData.get("roleId") ?? "").trim();
    const selectedRole = roles.find((role) => role.id === roleId);

    const phone = String(formData.get("phone") ?? "").trim();
    const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();

    const nationalId = String(formData.get("nationalId") ?? "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "");

    startCreateTransition(async () => {
      const result = await createPortalUser(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "User account created successfully.");

      if (result.ticketNumber && result.privateAccessCode) {
        setAccountHelpNotice({
          kind: "NEW_ACCOUNT",
          title: "Staff account created successfully",
          name: `${firstName} ${lastName}`,
          email,
          role: selectedRole?.name,
          phone,
          dateOfBirth,
          nationalIdLast4: nationalId.slice(-4),
          accountStatus: "PENDING_ACTIVATION",
          referenceLabel: "Support reference",
          reference: result.ticketNumber,
          privateAccessCode: result.privateAccessCode,
          staffNumber: result.staffNumber,
          message:
            "The staff record is complete. The user can now verify the registered details, create a private password and activate the account without ICT approval.",
        });
      }

      form.reset();
      setIsCreateModalOpen(false);
      router.refresh();
    });
  };

  const runUserAction = (
    actionKey: string,
    operation: () => Promise<UserManagementActionResult>,
    onSuccess?: (result: UserManagementActionResult) => void,
  ) => {
    setActiveActionKey(actionKey);

    startUserActionTransition(async () => {
      try {
        const result = await operation();

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success(result.message ?? "User account updated successfully.");

        onSuccess?.(result);
        router.refresh();
      } finally {
        setActiveActionKey(null);
      }
    });
  };

  const handleRoleUpdate = (user: PortalUser) => {
    const nextRoleId = roleSelections[user.id] ?? user.role.id;

    if (nextRoleId === user.role.id) {
      toast.error("Select a different role before updating.");
      return;
    }

    const nextRole = roles.find((role) => role.id === nextRoleId);

    if (!nextRole) {
      toast.error("The selected role could not be found.");
      return;
    }

    const confirmed = window.confirm(
      `Change ${user.firstName} ${user.lastName}'s role from ${formatRole(
        user.role.name,
      )} to ${formatRole(
        nextRole.name,
      )}?\n\nTheir portal permissions will change immediately.`,
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();

    formData.set("userId", user.id);
    formData.set("roleId", nextRoleId);

    runUserAction(`role-${user.id}`, () => updatePortalUserRole(formData));
  };

  const handleAccountStatus = (user: PortalUser) => {
    const nextActiveState = !user.isActive;

    const actionLabel = nextActiveState ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `${actionLabel.slice(0, 1).toUpperCase()}${actionLabel.slice(
        1,
      )} ${user.firstName} ${user.lastName}?\n\n${
        nextActiveState
          ? "The user will regain portal access."
          : "The user will no longer be allowed to sign in."
      }`,
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();

    formData.set("userId", user.id);
    formData.set("isActive", String(nextActiveState));

    runUserAction(`status-${user.id}`, () =>
      setPortalUserActiveState(formData),
    );
  };

  const handlePasswordRecovery = (user: PortalUser) => {
    const confirmed = window.confirm(
      `Open a password-recovery ticket for ${user.firstName} ${user.lastName}?\n\nICT will verify the user’s identity before authorizing a secure password change. Their current password will not be exposed or replaced now.`,
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();

    formData.set("userId", user.id);

    runUserAction(
      `recovery-${user.id}`,
      () => openPortalUserPasswordRecovery(formData),
      (result) => {
        if (!result.ticketNumber || !result.privateAccessCode) {
          return;
        }

        setAccountHelpNotice({
          kind: "PASSWORD_RECOVERY",
          title: "Password-recovery ticket",
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role.name,
          phone: user.identityProfile?.phone ?? undefined,
          dateOfBirth: user.identityProfile?.dateOfBirth ?? undefined,
          nationalIdLast4: user.identityProfile?.nationalIdLast4 ?? undefined,
          accountStatus: user.accountStatus,
          referenceLabel: "Recovery ticket number",
          reference: result.ticketNumber,
          privateAccessCode: result.privateAccessCode,
          staffNumber: user.identityProfile?.staffNumber ?? undefined,
          message:
            result.message ?? "The recovery ticket was opened successfully.",
        });
      },
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
  };

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 overflow-hidden">
      {accountHelpNotice ? (
        <AccountHelpModal
          notice={accountHelpNotice}
          onClose={() => setAccountHelpNotice(null)}
        />
      ) : null}

      {isCreateModalOpen ? (
        <CreateStaffAccountModal
          roles={roles}
          currentAdmin={currentAdmin}
          isCreating={isCreating}
          onSubmit={handleCreateUser}
          onClose={() => setIsCreateModalOpen(false)}
        />
      ) : null}

      {/* --- EXECUTIVE HERO BANNER --- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 sm:px-8 sm:py-8 text-white shadow-md border border-slate-800">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px]" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                Super Administrator
              </p>
            </div>

            <h1 className="mt-1 break-words text-2xl font-black tracking-tight sm:text-3xl">
              Portal User Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
              Create user accounts, assign roles, control access and manage
              secure account activation and recovery across the IMTR Academic
              Portal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <HeroStat label="Users" value={summary.totalUsers} />
            <HeroStat label="Active" value={summary.activeUsers} />
            <HeroStat label="Roles" value={summary.totalRoles} />
          </div>
        </div>
      </section>

      {/* --- TELEMETRY CARDS --- */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <SummaryCard
          icon={Users}
          label="Total Users"
          value={`${summary.totalUsers}`}
          helper="All portal accounts"
          tone="sky"
        />

        <SummaryCard
          icon={UserCheck}
          label="Active"
          value={`${summary.activeUsers}`}
          helper="Can access the portal"
          tone="emerald"
        />

        <SummaryCard
          icon={UserMinus}
          label="Inactive"
          value={`${summary.inactiveUsers}`}
          helper="Access currently blocked"
          tone="rose"
        />

        <SummaryCard
          icon={KeyRound}
          label="Recovery Req."
          value={`${summary.passwordChangeRequired}`}
          helper="User action required"
          tone="amber"
        />

        <SummaryCard
          icon={Shield}
          label="Super Admins"
          value={`${summary.activeSuperAdmins}`}
          helper="System authorities"
          tone="violet"
        />

        <SummaryCard
          icon={Fingerprint}
          label="Identity Gaps"
          value={`${summary.incompleteIdentityProfiles}`}
          helper="Needs completion"
          tone="rose"
        />
      </section>

      {/* --- MAIN USERS TABLE & FILTERS --- */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
        <div className="border-b border-slate-100 bg-slate-50/50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <UserCog className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-900">
                  Portal Accounts
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {filteredUsers.length} of {users.length} accounts displayed
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-wider text-indigo-700">
                Role-Based Access
              </span>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800"
              >
                <UserPlus className="h-4 w-4" />
                Register Staff Account
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_190px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                type="search"
                placeholder="Search name, email, staff or admission number..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="relative">
              <Shield className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {formatRole(role.name)}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PENDING_ACTIVATION">Pending activation</option>
                <option value="IDENTITY_INCOMPLETE">Identity incomplete</option>
                <option value="PASSWORD_CHANGE">
                  Activation/recovery required
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 shadow-sm"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyUsers />
        ) : (
          <div className="space-y-4 p-4 sm:p-5">
            {filteredUsers.map((user) => (
              <UserAccountCard
                key={user.id}
                user={user}
                roles={roles}
                currentAdminId={currentAdmin.id}
                selectedRoleId={roleSelections[user.id] ?? user.role.id}
                onSelectedRoleChange={(roleId) =>
                  setRoleSelections((current) => ({
                    ...current,
                    [user.id]: roleId,
                  }))
                }
                onRoleUpdate={() => handleRoleUpdate(user)}
                onStatusChange={() => handleAccountStatus(user)}
                onPasswordRecovery={() => handlePasswordRecovery(user)}
                activeActionKey={activeActionKey}
                actionPending={isPerformingUserAction}
              />
            ))}
          </div>
        )}
      </section>

      {/* --- ROLE SUMMARY --- */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
        <div className="border-b border-slate-100 bg-slate-50/50 p-5">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Portal Role Summary
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                Current account distribution across registered roles.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {roles.map((role) => (
            <article
              key={role.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">
                  {role.userCount}
                </span>
              </div>
              <p className="mt-3 font-black text-slate-900">
                {formatRole(role.name)}
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                {role.description ?? "Portal access role"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-black text-amber-900">
              Privileged account controls
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-amber-700">
              Role changes and account deactivation take effect immediately. The
              system prevents you from deactivating or demoting your own account
              and protects the last active Super Administrator.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CreateStaffAccountModal({
  roles,
  currentAdmin,
  isCreating,
  onSubmit,
  onClose,
}: {
  roles: PortalRole[];
  currentAdmin: { id: string; name: string; email: string };
  isCreating: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const staffRoles = roles.filter(
    (role) => !["student", "coordinator"].includes(role.name),
  );

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-900/80 backdrop-blur-sm">
      <div className="flex min-h-full w-full items-start justify-center sm:items-center sm:p-4">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-staff-title"
          className="flex min-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:min-h-0 sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:border sm:border-slate-200"
        >
          <header className="relative shrink-0 overflow-hidden bg-slate-900 px-5 py-5 text-white sm:px-7 sm:py-6 border-b border-slate-800">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.15),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_42%)]" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-indigo-400 shadow-sm">
                  <UserPlus className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-indigo-400">
                    Super Administrator
                  </p>
                  <h2
                    id="create-staff-title"
                    className="mt-1 text-xl font-black tracking-tight sm:text-2xl"
                  >
                    Register a Staff Account
                  </h2>
                  <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-slate-300 sm:text-sm">
                    Capture the staff member’s official identity and portal
                    role. The system will generate the permanent staff number
                    and secure activation request automatically.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                aria-label="Close staff registration"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <form
            onSubmit={onSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-7 bg-slate-50">
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-6">
                  <FormSection
                    icon={UserCheck}
                    title="Personal and portal details"
                    description="Use the staff member’s official names and active contact email."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        icon={UserCheck}
                        label="First name"
                        name="firstName"
                        placeholder="Enter first name"
                        autoComplete="given-name"
                        disabled={isCreating}
                      />
                      <FormField
                        icon={UserCheck}
                        label="Last name"
                        name="lastName"
                        placeholder="Enter last name"
                        autoComplete="family-name"
                        disabled={isCreating}
                      />
                      <div className="sm:col-span-2">
                        <FormField
                          icon={Mail}
                          label="Official email address"
                          name="email"
                          placeholder="staff@imtr.go.ke"
                          autoComplete="email"
                          type="email"
                          inputMode="email"
                          disabled={isCreating}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label
                          htmlFor="new-user-role"
                          className="text-sm font-black text-slate-900"
                        >
                          Portal role <span className="text-rose-600">*</span>
                        </label>
                        <div className="relative">
                          <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <select
                            required
                            id="new-user-role"
                            name="roleId"
                            defaultValue=""
                            disabled={isCreating}
                            className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                          >
                            <option value="" disabled>
                              Select staff portal role...
                            </option>
                            {staffRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {formatRole(role.name)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection
                    icon={Fingerprint}
                    title="Identity verification record"
                    description="These details support secure activation and future account recovery."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        icon={IdCard}
                        label="National ID or passport"
                        name="nationalId"
                        placeholder="Enter ID or passport number"
                        autoComplete="off"
                        disabled={isCreating}
                      />
                      <FormField
                        icon={Phone}
                        label="Phone number"
                        name="phone"
                        placeholder="0712345678"
                        autoComplete="tel"
                        type="tel"
                        inputMode="tel"
                        disabled={isCreating}
                      />
                      <div className="sm:col-span-2">
                        <FormField
                          icon={CalendarDays}
                          label="Date of birth"
                          name="dateOfBirth"
                          placeholder=""
                          autoComplete="bday"
                          type="date"
                          disabled={isCreating}
                        />
                      </div>
                    </div>
                  </FormSection>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-0">
                  <div className="overflow-hidden rounded-2xl border border-sky-200 bg-sky-50">
                    <div className="border-b border-sky-100 bg-sky-100/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
                          <Fingerprint className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-sky-900">
                            Automatic staff number
                          </p>
                          <p className="mt-0.5 text-[10px] font-semibold text-sky-700">
                            Permanent institutional reference
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="rounded-xl border border-sky-200 bg-white px-4 py-3 text-center font-mono text-sm font-black tracking-wide text-sky-900">
                        IMTR/STF/YYYY/001
                      </p>
                      <p className="mt-3 text-xs font-semibold leading-5 text-sky-800">
                        The final sequence is assigned safely when the record is
                        saved. It is independent of the person’s role and
                        remains unchanged throughout employment.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-black text-amber-900">
                          Secure activation flow
                        </p>
                        <ol className="mt-3 space-y-3 text-xs font-semibold leading-5 text-amber-800">
                          <li className="flex gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[9px] font-black text-white">
                              1
                            </span>
                            Activation reference and code are generated.
                          </li>
                          <li className="flex gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[9px] font-black text-white">
                              2
                            </span>
                            Staff member verifies identity in the Account Help
                            Centre.
                          </li>
                          <li className="flex gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[9px] font-black text-white">
                              3
                            </span>
                            Creates a private password to become active.
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Registering administrator
                    </p>
                    <p className="mt-2 text-sm font-black text-slate-900">
                      {currentAdmin.name}
                    </p>
                    <p className="mt-1 break-all text-xs font-semibold text-slate-500">
                      {currentAdmin.email}
                    </p>
                  </div>
                </aside>
              </div>
            </div>

            <footer className="z-20 flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" /> Register Staff Account
                  </>
                )}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ElementType;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function UserAccountCard({
  user,
  roles,
  currentAdminId,
  selectedRoleId,
  onSelectedRoleChange,
  onRoleUpdate,
  onStatusChange,
  onPasswordRecovery,
  activeActionKey,
  actionPending,
}: {
  user: PortalUser;
  roles: PortalRole[];
  currentAdminId: string;
  selectedRoleId: string;
  onSelectedRoleChange: (roleId: string) => void;
  onRoleUpdate: () => void;
  onStatusChange: () => void;
  onPasswordRecovery: () => void;
  activeActionKey: string | null;
  actionPending: boolean;
}) {
  const isCurrentAdmin = user.id === currentAdminId;

  const roleActionKey = `role-${user.id}`;
  const statusActionKey = `status-${user.id}`;
  const recoveryActionKey = `recovery-${user.id}`;

  const roleChanged = selectedRoleId !== user.role.id;

  const identityComplete =
    user.role.name === "student" || hasCompleteStaffIdentity(user);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
              user.isActive
                ? "bg-indigo-50 text-indigo-600"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {getInitials(user.firstName, user.lastName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words font-black text-slate-900">
                {user.firstName} {user.lastName}
              </h3>

              {isCurrentAdmin ? (
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-violet-700">
                  Your Account
                </span>
              ) : null}
            </div>

            <p className="mt-1 break-all text-xs font-semibold text-slate-500">
              {user.email}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <RoleBadge role={user.role.name} />

              <AccountStatusBadge
                accountStatus={user.accountStatus}
                active={user.isActive}
              />

              <span
                className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                  identityComplete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {identityComplete ? "Identity Complete" : "Identity Incomplete"}
              </span>

              {user.requiresPasswordChange ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-700">
                  Activation/Recovery Req
                </span>
              ) : (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                  Credentials Confirmed
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 text-xs lg:text-right">
          <AccountDetail label="Created" value={formatDate(user.createdAt)} />
          <AccountDetail label="Updated" value={formatDate(user.updatedAt)} />
        </div>
      </div>

      {user.role.name !== "student" ? (
        <div
          className={`border-t border-slate-100 px-4 py-3 sm:px-5 ${
            identityComplete ? "bg-emerald-50/50" : "bg-rose-50/50"
          }`}
        >
          {user.identityProfile ? (
            <div
              className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold ${
                identityComplete ? "text-emerald-800" : "text-rose-800"
              }`}
            >
              <span>
                Staff No:{" "}
                <strong>{user.identityProfile.staffNumber ?? "Missing"}</strong>
              </span>
              <span>
                National ID:{" "}
                <strong>
                  {user.identityProfile.nationalIdLast4
                    ? `••••${user.identityProfile.nationalIdLast4}`
                    : "Missing"}
                </strong>
              </span>
              <span>
                DOB:{" "}
                <strong>
                  {user.identityProfile.dateOfBirth
                    ? formatDate(user.identityProfile.dateOfBirth)
                    : "Missing"}
                </strong>
              </span>
              <span>
                Phone:{" "}
                <strong>{user.identityProfile.phone ?? "Missing"}</strong>
              </span>
            </div>
          ) : (
            <p className="text-xs font-semibold text-rose-700">
              No staff identity profile exists. Account activation and recovery
              should remain blocked until the identity record is completed.
            </p>
          )}
        </div>
      ) : null}

      {user.studentProfile ? (
        <div className="border-t border-slate-100 bg-sky-50 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-sky-800">
            <span>
              Admission: <strong>{user.studentProfile.admissionNumber}</strong>
            </span>
            <span>
              Intake: <strong>{user.studentProfile.intake.code}</strong>
            </span>
            <span>
              Course: <strong>{user.studentProfile.intake.course.code}</strong>
            </span>
            <span>
              Academic Status:{" "}
              <strong>{formatRole(user.studentProfile.academicStatus)}</strong>
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <select
            value={selectedRoleId}
            onChange={(event) => onSelectedRoleChange(event.target.value)}
            disabled={isCurrentAdmin || actionPending}
            aria-label={`Role for ${user.firstName} ${user.lastName}`}
            className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {roles
              .filter(
                (role) =>
                  role.name !== "coordinator" ||
                  user.role.name === "coordinator",
              )
              .map((role) => (
                <option key={role.id} value={role.id}>
                  {formatRole(role.name)}
                </option>
              ))}
          </select>

          <button
            type="button"
            onClick={onRoleUpdate}
            disabled={isCurrentAdmin || actionPending || !roleChanged}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-xs font-black text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:border-transparent disabled:bg-slate-100 disabled:text-slate-400"
          >
            {activeActionKey === roleActionKey ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCog className="h-4 w-4" />
            )}
            Update Role
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onPasswordRecovery}
            disabled={
              isCurrentAdmin ||
              actionPending ||
              (user.role.name !== "student" && !identityComplete)
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {activeActionKey === recoveryActionKey ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Recovery Ticket
          </button>

          <button
            type="button"
            onClick={onStatusChange}
            disabled={isCurrentAdmin || actionPending}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
              user.isActive
                ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {activeActionKey === statusActionKey ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : user.isActive ? (
              <UserMinus className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}

            {user.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {isCurrentAdmin ? (
        <div className="border-t border-slate-100 bg-violet-50/50 px-4 py-3 text-xs font-semibold text-violet-700 sm:px-5">
          Your own role, status and account recovery cannot be changed from this
          management screen.
        </div>
      ) : null}
    </article>
  );
}

function AccountHelpModal({
  notice,
  onClose,
}: {
  notice: AccountHelpNotice;
  onClose: () => void;
}) {
  const isNewAccount = notice.kind === "NEW_ACCOUNT";

  const copyDetails = async () => {
    const lines = [
      "IMTR PORTAL ACCOUNT DETAILS",
      "",
      `Name: ${notice.name}`,
      `Email: ${notice.email}`,
      ...(notice.role ? [`Portal role: ${formatRole(notice.role)}`] : []),
      ...(notice.staffNumber ? [`Staff number: ${notice.staffNumber}`] : []),
      ...(notice.phone ? [`Phone: ${notice.phone}`] : []),
      ...(notice.dateOfBirth
        ? [`Date of birth: ${formatDateOnly(notice.dateOfBirth)}`]
        : []),
      ...(notice.nationalIdLast4
        ? [`National ID/passport: Ending in ${notice.nationalIdLast4}`]
        : []),
      ...(notice.accountStatus
        ? [`Account status: ${formatRole(notice.accountStatus)}`]
        : []),
      "",
      ...(isNewAccount
        ? [
            "ACTIVATION STEPS",
            "1. Open /account-help/activate",
            "2. Enter the staff number, full National ID/passport and date of birth",
            "3. Create a private password and sign in",
          ]
        : [
            `${notice.referenceLabel}: ${notice.reference}`,
            `Private access code: ${notice.privateAccessCode}`,
            "Open /account-help/track to continue.",
          ]),
      ...(isNewAccount
        ? [
            "",
            "SUPPORT FALLBACK",
            `${notice.referenceLabel}: ${notice.reference}`,
            `Private access code: ${notice.privateAccessCode}`,
          ]
        : []),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Account details copied to the clipboard.");
    } catch {
      toast.error("The browser could not copy the account details.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-0 backdrop-blur-sm sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-help-title"
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[94dvh] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-slate-200"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-emerald-100 bg-emerald-50 p-5 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <BadgeCheck className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                {isNewAccount
                  ? "Registration Complete"
                  : "Support Request Created"}
              </p>
              <h2
                id="account-help-title"
                className="mt-1 text-xl font-black text-emerald-900 sm:text-2xl"
              >
                {notice.title}
              </h2>
              <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-emerald-800 sm:text-sm">
                {notice.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close account details"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100/50 text-emerald-700 transition-colors hover:bg-emerald-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <IdCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">
                      Account Record
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      Details saved in the IMTR portal.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  <DetailField label="Account holder" value={notice.name} />
                  <DetailField label="Official email" value={notice.email} />
                  {notice.role ? (
                    <DetailField
                      label="Portal role"
                      value={formatRole(notice.role)}
                    />
                  ) : null}
                  {notice.staffNumber ? (
                    <DetailField
                      label="Staff number"
                      value={notice.staffNumber}
                      mono
                    />
                  ) : null}
                  {notice.phone ? (
                    <DetailField label="Phone number" value={notice.phone} />
                  ) : null}
                  {notice.dateOfBirth ? (
                    <DetailField
                      label="Date of birth"
                      value={formatDateOnly(notice.dateOfBirth)}
                    />
                  ) : null}
                  {notice.nationalIdLast4 ? (
                    <DetailField
                      label="National ID / passport"
                      value={`Ending in ${notice.nationalIdLast4}`}
                    />
                  ) : null}
                  {notice.accountStatus ? (
                    <DetailField
                      label="Account status"
                      value={formatRole(notice.accountStatus)}
                    />
                  ) : null}
                </div>
              </section>

              {isNewAccount ? (
                <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50">
                  <div className="flex items-center gap-3 border-b border-emerald-100 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-emerald-900">
                        What the staff member does next
                      </h3>
                      <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                        No ICT approval is required for normal activation.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <ActivationStep
                      number="1"
                      title="Open Account Activation"
                      description="Go to /account-help/activate from the login page."
                    />
                    <ActivationStep
                      number="2"
                      title="Verify registered identity"
                      description="Enter the staff number, full National ID/passport number and date of birth."
                    />
                    <ActivationStep
                      number="3"
                      title="Create a private password"
                      description="After the details match, create a password and sign in immediately."
                    />
                  </div>
                </section>
              ) : null}
            </div>

            <div className="space-y-5">
              <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-sky-600" />
                  <div>
                    <h3 className="font-black text-sky-900">
                      {isNewAccount
                        ? "Self-service activation enabled"
                        : "Secure recovery access"}
                    </h3>
                    <p className="mt-2 text-xs font-semibold leading-5 text-sky-800">
                      {isNewAccount
                        ? "The user does not need a temporary password, ticket approval or manual ICT verification when the registered identity details match."
                        : "The ticket number and private access code allow the account holder to securely track this recovery request."}
                    </p>
                  </div>
                </div>

                {isNewAccount ? (
                  <button
                    type="button"
                    onClick={() =>
                      window.open("/account-help/activate", "_blank")
                    }
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-black text-white transition-colors hover:bg-sky-700 shadow-sm"
                  >
                    <UserCheck className="h-4 w-4" /> Open Activation Page
                  </button>
                ) : null}
              </section>

              <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
                <div className="border-b border-amber-100 p-4">
                  <div className="flex items-center gap-3 text-amber-900">
                    <LockKeyhole className="h-5 w-5" />
                    <h3 className="font-black">
                      {isNewAccount ? "Support fallback" : "Ticket access"}
                    </h3>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-amber-800">
                    {isNewAccount
                      ? "These details are needed only if automatic activation fails and support assistance is required."
                      : "Save these details before closing this window."}
                  </p>
                </div>

                <div className="space-y-3 p-4">
                  <DetailField
                    label={notice.referenceLabel}
                    value={notice.reference}
                    mono
                  />
                  <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-wider text-amber-700">
                      Private access code
                    </p>
                    <p className="mt-2 break-all font-mono text-xl font-black tracking-[0.2em] text-slate-900">
                      {notice.privateAccessCode}
                    </p>
                  </div>
                </div>
              </section>

              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <p className="text-xs font-semibold leading-5 text-rose-800">
                    Save or copy these details before closing. The private
                    access code is stored only as a secure hash and cannot be
                    displayed again.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:justify-end sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 shadow-sm"
          >
            Close
          </button>
          <button
            type="button"
            onClick={copyDetails}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 shadow-sm"
          >
            <Copy className="h-4 w-4" /> Copy Complete Account Details
          </button>
        </div>
      </section>
    </div>
  );
}

function ActivationStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
        {number}
      </span>
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 break-all text-sm font-black text-slate-900 ${mono ? "font-mono tracking-wide text-indigo-700" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function FormField({
  icon: Icon,
  label,
  name,
  placeholder,
  autoComplete,
  type = "text",
  inputMode,
  disabled = false,
}: {
  icon?: ElementType;
  label: string;
  name: string;
  placeholder: string;
  autoComplete: string;
  type?: "text" | "email" | "tel" | "date";
  inputMode?: "text" | "email" | "tel" | "numeric";
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={`new-user-${name}`}
        className="text-sm font-black text-slate-900"
      >
        {label} <span className="text-rose-600">*</span>
      </label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        ) : null}
        <input
          required
          id={`new-user-${name}`}
          name={name}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          className={`h-12 w-full rounded-xl border border-slate-200 bg-white pr-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50 ${
            Icon ? "pl-10" : "px-4"
          }`}
        />
      </div>
    </div>
  );
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[11px] font-black text-slate-700">{value}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    super_admin: "border-violet-200 bg-violet-50 text-violet-700",
    academic_director: "border-indigo-200 bg-indigo-50 text-indigo-700",
    training_admin: "border-cyan-200 bg-cyan-50 text-cyan-700",
    ict_admin: "border-slate-200 bg-slate-50 text-slate-700",
    coordinator: "border-sky-200 bg-sky-50 text-sky-700",
    lecturer: "border-amber-200 bg-amber-50 text-amber-700",
    student: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        styles[role] ?? "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      {formatRole(role)}
    </span>
  );
}

function AccountStatusBadge({
  accountStatus,
  active,
}: {
  accountStatus: string;
  active: boolean;
}) {
  const styles: Record<string, string> = {
    PENDING_ACTIVATION: "border-amber-200 bg-amber-50 text-amber-700",
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    SUSPENDED: "border-orange-200 bg-orange-50 text-orange-700",
    LOCKED: "border-violet-200 bg-violet-50 text-violet-700",
    DISABLED: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        styles[accountStatus] ??
        (active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700")
      }`}
    >
      {formatRole(accountStatus)}
    </span>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: string;
  helper: string;
  tone: "sky" | "emerald" | "rose" | "amber" | "violet";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        {helper}
      </p>
    </article>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-w-[100px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm shadow-sm">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
    </div>
  );
}

function EmptyUsers() {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Users className="h-8 w-8" />
      </div>
      <p className="mt-5 text-lg font-black text-slate-900">
        No matching users found
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
        Adjust the search term or filters to display additional portal accounts.
      </p>
    </div>
  );
}

function hasCompleteStaffIdentity(user: PortalUser) {
  return Boolean(
    user.identityProfile?.staffNumber &&
    user.identityProfile.nationalIdLast4 &&
    user.identityProfile.dateOfBirth &&
    user.identityProfile.phone,
  );
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase();
}

function formatRole(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}
