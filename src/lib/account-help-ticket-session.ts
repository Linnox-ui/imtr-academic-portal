import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { cookies } from "next/headers";

const COOKIE_NAME =
  "imtr_account_help_ticket";

const SESSION_DURATION_SECONDS = 30 * 60;

type TicketSessionPayload = {
  version: 1;
  ticketId: string;
  ticketNumber: string;
  expiresAt: number;
};

function getSessionSecret() {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET or BETTER_AUTH_SECRET is required for Account Help Centre sessions.",
    );
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac(
    "sha256",
    getSessionSecret(),
  )
    .update(payload)
    .digest("base64url");
}

export async function setAccountHelpTicketSession({
  ticketId,
  ticketNumber,
}: {
  ticketId: string;
  ticketNumber: string;
}) {
  const payload: TicketSessionPayload = {
    version: 1,
    ticketId,
    ticketNumber,
    expiresAt:
      Date.now() +
      SESSION_DURATION_SECONDS * 1000,
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url");

  const signature = signPayload(
    encodedPayload,
  );

  const cookieStore = await cookies();

  cookieStore.set(
    COOKIE_NAME,
    `${encodedPayload}.${signature}`,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/account-help",
      maxAge: SESSION_DURATION_SECONDS,
    },
  );
}

export async function getAccountHelpTicketSession(): Promise<TicketSessionPayload | null> {
  const cookieStore = await cookies();

  const sessionCookie =
    cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  const [encodedPayload, signature] =
    sessionCookie.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature =
    signPayload(encodedPayload);

  const receivedBuffer =
    Buffer.from(signature);

  const expectedBuffer =
    Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return null;
  }

  if (
    !timingSafeEqual(
      receivedBuffer,
      expectedBuffer,
    )
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url",
      ).toString("utf8"),
    ) as TicketSessionPayload;

    if (
      payload.version !== 1 ||
      !payload.ticketId ||
      !payload.ticketNumber ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function clearAccountHelpTicketSession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "lax",
    path: "/account-help",
    maxAge: 0,
  });
}
