import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  canRoleAccessPath,
  getDashboardForRole,
  isDashboardPath,
  isPortalRole,
} from "@/lib/role-routing";

const LOGIN_PATH = "/login";
const UNAUTHORIZED_PATH = "/unauthorized";
const CHANGE_PASSWORD_PATH = "/change-password";

export const proxy = auth((request) => {
  const { pathname, search } =
    request.nextUrl;

  if (!isDashboardPath(pathname)) {
    return NextResponse.next();
  }

  const sessionUser =
    request.auth?.user;

  if (!sessionUser) {
    const loginUrl = new URL(
      LOGIN_PATH,
      request.nextUrl.origin,
    );

    loginUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${search}`,
    );

    return NextResponse.redirect(loginUrl);
  }

  const role = sessionUser.role;

  if (!isPortalRole(role)) {
    return NextResponse.redirect(
      new URL(
        UNAUTHORIZED_PATH,
        request.nextUrl.origin,
      ),
    );
  }

  if (
    sessionUser.requiresPasswordChange &&
    pathname !== CHANGE_PASSWORD_PATH
  ) {
    return NextResponse.redirect(
      new URL(
        CHANGE_PASSWORD_PATH,
        request.nextUrl.origin,
      ),
    );
  }

  if (!canRoleAccessPath(role, pathname)) {
    const unauthorizedUrl = new URL(
      UNAUTHORIZED_PATH,
      request.nextUrl.origin,
    );

    unauthorizedUrl.searchParams.set(
      "from",
      pathname,
    );

    unauthorizedUrl.searchParams.set(
      "home",
      getDashboardForRole(role),
    );

    return NextResponse.redirect(
      unauthorizedUrl,
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/student/:path*",
    "/lecturer/:path*",
    "/coordinator/:path*",
    "/department-admin/:path*",
    "/ict-admin/:path*",
    "/academic-director/:path*",
    "/super-admin/:path*",
  ],
};
