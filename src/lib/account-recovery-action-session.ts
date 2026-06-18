import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { cookies } from "next/headers";

const COOKIE_NAME =
  "imtr_account_recovery_action";

const SESSION_DURATION_SECONDS = 15 * 60;

export type AccountRecoveryActionSession = {
  version: 1;
  tokenId: string;
  rawToken: string;
  ticketId: string;
  userId: string;
  expiresAt: number;
};

function getSessionSecret() {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET or BETTER_AUTH_SECRET is required for account-recovery sessions.",
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

export function hashAccountRecoveryToken(
  rawToken: string,
) {
  return createHmac(
    "sha256",
    getSessionSecret(),
  )
    .update(`ACCOUNT_RECOVERY_TOKEN:${rawToken}`)
    .digest("hex");
}

export async function setAccountRecoveryActionSession(
  session: Omit<
    AccountRecoveryActionSession,
    "version" | "expiresAt"
  >,
) {
  const payload: AccountRecoveryActionSession = {
    version: 1,
    ...session,
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
      sameSite: "strict",
      path: "/account-help/set-password",
      maxAge: SESSION_DURATION_SECONDS,
    },
  );
}

export async function getAccountRecoveryActionSession(): Promise<AccountRecoveryActionSession | null> {
  const cookieStore = await cookies();

  const cookieValue =
    cookieStore.get(COOKIE_NAME)?.value;

  if (!cookieValue) {
    return null;
  }

  const [encodedPayload, signature] =
    cookieValue.split(".");

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
    ) as AccountRecoveryActionSession;

    if (
      payload.version !== 1 ||
      !payload.tokenId ||
      !payload.rawToken ||
      !payload.ticketId ||
      !payload.userId ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function clearAccountRecoveryActionSession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "strict",
    path: "/account-help/set-password",
    maxAge: 0,
  });
}
