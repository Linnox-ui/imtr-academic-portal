"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SYSTEM_ROLES,
  ROLE_NAME_PATTERN,
  formatEnum,
} from "@/lib/constants/roles";

const ROLES_PATH = "/super-admin/roles";

export type RoleActionResult = {
  success: boolean;
  message: string;
};

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true, role: { select: { name: true } } },
  });

  if (!user || !user.isActive || user.role.name !== "super_admin") {
    redirect("/unauthorized");
  }
}

export async function createRole(
  formData: FormData,
): Promise<RoleActionResult> {
  await requireSuperAdmin();

  const name = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase();
  const description = String(formData.get("description") ?? "").trim();

  if (!ROLE_NAME_PATTERN.test(name)) {
    return {
      success: false,
      message:
        "Role name must be lowercase, start with a letter, and contain only letters, numbers, and underscores (e.g. finance_officer).",
    };
  }

  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) {
    return {
      success: false,
      message: `A role named "${name}" already exists.`,
    };
  }

  await prisma.role.create({
    data: { name, description: description || null },
  });

  revalidatePath(ROLES_PATH);
  return { success: true, message: `Role "${formatEnum(name)}" was created.` };
}

export async function updateRole(
  roleId: string,
  formData: FormData,
): Promise<RoleActionResult> {
  await requireSuperAdmin();

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    return {
      success: false,
      message: "Role not found. It may have already been deleted.",
    };
  }

  const description = String(formData.get("description") ?? "").trim();
  const nameInput = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase();

  const data: { description: string | null; name?: string } = {
    description: description || null,
  };

  const isSystemRole = SYSTEM_ROLES.includes(
    role.name as (typeof SYSTEM_ROLES)[number],
  );

  if (!isSystemRole && nameInput && nameInput !== role.name) {
    if (!ROLE_NAME_PATTERN.test(nameInput)) {
      return {
        success: false,
        message:
          "Role name must be lowercase, start with a letter, and contain only letters, numbers, and underscores.",
      };
    }

    const clash = await prisma.role.findUnique({ where: { name: nameInput } });
    if (clash) {
      return {
        success: false,
        message: `A role named "${nameInput}" already exists.`,
      };
    }

    data.name = nameInput;
  }

  await prisma.role.update({ where: { id: roleId }, data });

  revalidatePath(ROLES_PATH);
  return { success: true, message: "Role updated." };
}

export async function deleteRole(roleId: string): Promise<RoleActionResult> {
  await requireSuperAdmin();

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { name: true, _count: { select: { users: true } } },
  });

  if (!role) {
    return {
      success: false,
      message: "Role not found. It may have already been deleted.",
    };
  }

  if (SYSTEM_ROLES.includes(role.name as (typeof SYSTEM_ROLES)[number])) {
    return {
      success: false,
      message: `"${formatEnum(role.name)}" is a core system role wired into route access checks and cannot be deleted.`,
    };
  }

  if (role._count.users > 0) {
    return {
      success: false,
      message: `Cannot delete "${formatEnum(role.name)}" — ${role._count.users} account(s) are still assigned to it. Reassign them first.`,
    };
  }

  await prisma.role.delete({ where: { id: roleId } });

  revalidatePath(ROLES_PATH);
  return {
    success: true,
    message: `Role "${formatEnum(role.name)}" was deleted.`,
  };
}
