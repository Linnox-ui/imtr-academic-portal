"use client";

import { useRef, useState, useTransition } from "react";
import {
  Check,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { formatEnum } from "@/lib/constants/roles";

import { createRole, deleteRole, updateRole } from "./actions";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  _count: { users: number };
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-all";

export function RoleManagementClient({
  roles,
  systemRoles,
}: {
  roles: RoleRow[];
  systemRoles: readonly string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const createFormRef = useRef<HTMLFormElement>(null);

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createRole(formData);
      setFeedback({
        type: result.success ? "success" : "error",
        text: result.message,
      });
      if (result.success) {
        setShowCreateForm(false);
        createFormRef.current?.reset();
      }
    });
  }

  function handleUpdate(roleId: string, formData: FormData) {
    startTransition(async () => {
      const result = await updateRole(roleId, formData);
      setFeedback({
        type: result.success ? "success" : "error",
        text: result.message,
      });
      if (result.success) setEditingId(null);
    });
  }

  function handleDelete(roleId: string) {
    startTransition(async () => {
      const result = await deleteRole(roleId);
      setFeedback({
        type: result.success ? "success" : "error",
        text: result.message,
      });
      setConfirmDeleteId(null);
    });
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            Portal Roles
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {roles.length} role{roles.length === 1 ? "" : "s"} configured in the
            system.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800 shadow-sm ${FOCUS_RING}`}
        >
          {showCreateForm ? (
            <>
              <X className="h-4 w-4" aria-hidden="true" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden="true" /> New Role
            </>
          )}
        </button>
      </div>

      {feedback ? (
        <div
          role="status"
          className={`mx-5 mt-5 rounded-xl border px-4 py-3 text-xs font-bold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      {showCreateForm ? (
        <form
          ref={createFormRef}
          action={handleCreate}
          className="mx-5 mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-[1fr_2fr_auto] shadow-sm"
        >
          <div>
            <label
              htmlFor="new-role-name"
              className="text-[10px] font-black uppercase tracking-wider text-slate-400"
            >
              Role name
            </label>
            <input
              id="new-role-name"
              name="name"
              required
              placeholder="finance_officer"
              pattern="^[a-z][a-z0-9_]{1,49}$"
              title="Lowercase letters, numbers, and underscores only, starting with a letter."
              className={`mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none ${FOCUS_RING}`}
            />
          </div>

          <div>
            <label
              htmlFor="new-role-description"
              className="text-[10px] font-black uppercase tracking-wider text-slate-400"
            >
              Description
            </label>
            <input
              id="new-role-description"
              name="description"
              placeholder="Manages fee records and invoices"
              className={`mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none ${FOCUS_RING}`}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {isPending ? "Saving…" : "Create Role"}
            </button>
          </div>
        </form>
      ) : null}

      <div
        className={`divide-y divide-slate-100 ${showCreateForm ? "mt-5" : ""}`}
      >
        {roles.map((role) => {
          const isSystemRole = systemRoles.includes(role.name);
          const isEditing = editingId === role.id;
          const isConfirmingDelete = confirmDeleteId === role.id;

          return (
            <article
              key={role.id}
              className="px-5 py-4 hover:bg-slate-50/50 transition-colors"
            >
              {isEditing ? (
                <form
                  action={(formData) => handleUpdate(role.id, formData)}
                  className="grid gap-4 sm:grid-cols-[1fr_2fr_auto]"
                >
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Role name
                    </label>
                    <input
                      name="name"
                      defaultValue={role.name}
                      disabled={isSystemRole}
                      pattern="^[a-z][a-z0-9_]{1,49}$"
                      className={`mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${FOCUS_RING}`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Description
                    </label>
                    <input
                      name="description"
                      defaultValue={role.description ?? ""}
                      className={`mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none ${FOCUS_RING}`}
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      aria-label="Save changes"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60 transition-colors"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel editing"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {formatEnum(role.name)}
                        </p>
                        {isSystemRole ? (
                          <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-700">
                            System
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                        {role.description || "No description provided."}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm">
                      <Users
                        className="h-3.5 w-3.5 text-slate-400"
                        aria-hidden="true"
                      />
                      {role._count.users}
                    </span>

                    <button
                      type="button"
                      onClick={() => setEditingId(role.id)}
                      aria-label={`Edit ${formatEnum(role.name)}`}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 shadow-sm ${FOCUS_RING}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    {isSystemRole || role._count.users > 0 ? (
                      <span
                        title={
                          isSystemRole
                            ? "Core system roles cannot be deleted."
                            : "Reassign users before deleting this role."
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    ) : isConfirmingDelete ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(role.id)}
                        disabled={isPending}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
                      >
                        Confirm Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(role.id)}
                        aria-label={`Delete ${formatEnum(role.name)}`}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-600 transition-colors hover:bg-rose-50 shadow-sm ${FOCUS_RING}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
