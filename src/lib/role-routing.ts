export const PORTAL_ROLES = [
  "student",
  "lecturer",
  "coordinator",
  "department_admin",
  "ict_admin",
  "academic_director",
  "super_admin",
] as const;

export type PortalRole = (typeof PORTAL_ROLES)[number];

export const ROLE_DASHBOARDS: Record<PortalRole, string> = {
  student: "/student",
  lecturer: "/lecturer",
  coordinator: "/coordinator",
  department_admin: "/department-admin",
  ict_admin: "/ict-admin",
  academic_director: "/academic-director",
  super_admin: "/super-admin",
};

const ROLE_ALLOWED_PREFIXES: Record<PortalRole, readonly string[]> = {
  student: ["/student", "/account-help", "/change-password", "/unauthorized"],

  lecturer: [
    "/lecturer",
    "/coordinator",
    "/account-help",
    "/change-password",
    "/unauthorized",
  ],

  coordinator: [
    "/coordinator",
    "/account-help",
    "/change-password",
    "/unauthorized",
  ],

  department_admin: [
    "/department-admin",
    "/account-help",
    "/change-password",
    "/unauthorized",
  ],

  ict_admin: [
    "/ict-admin",
    "/account-help",
    "/change-password",
    "/unauthorized",
  ],

  academic_director: [
    "/academic-director",
    "/account-help",
    "/change-password",
    "/unauthorized",
  ],

  super_admin: [
    "/super-admin",
    "/ict-admin",
    "/academic-director",
    "/coordinator",
    "/account-help",
    "/change-password",
    "/unauthorized",
  ],
};

export function isPortalRole(value: unknown): value is PortalRole {
  return (
    typeof value === "string" && PORTAL_ROLES.includes(value as PortalRole)
  );
}

export function getDashboardForRole(role: unknown) {
  if (!isPortalRole(role)) {
    return "/unauthorized";
  }

  return ROLE_DASHBOARDS[role];
}

export function canRoleAccessPath(role: unknown, pathname: string) {
  if (!isPortalRole(role)) {
    return false;
  }

  return ROLE_ALLOWED_PREFIXES[role].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isDashboardPath(pathname: string) {
  return PORTAL_ROLES.some((role) => {
    const dashboard = ROLE_DASHBOARDS[role];

    return pathname === dashboard || pathname.startsWith(`${dashboard}/`);
  });
}

export function formatPortalRole(role: string) {
  return role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
