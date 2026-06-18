'use server';

import { compare, hash } from 'bcryptjs';

import { auth, signOut } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type ChangePasswordResult = {
  success?: boolean;
  error?: string;
};

export async function changeRequiredPassword(
  formData: FormData,
): Promise<ChangePasswordResult> {
  const currentPassword = String(
    formData.get('currentPassword') ?? '',
  );

  const newPassword = String(
    formData.get('newPassword') ?? '',
  );

  const confirmPassword = String(
    formData.get('confirmPassword') ?? '',
  );

  if (!currentPassword) {
    return {
      error: 'Enter your current password.',
    };
  }

  if (!newPassword) {
    return {
      error: 'Enter your new password.',
    };
  }

  if (newPassword.length < 8) {
    return {
      error:
        'Your new password must contain at least 8 characters.',
    };
  }

  if (newPassword.length > 128) {
    return {
      error:
        'Your new password must not exceed 128 characters.',
    };
  }

  if (!/[a-z]/.test(newPassword)) {
    return {
      error:
        'Your new password must contain a lowercase letter.',
    };
  }

  if (!/[A-Z]/.test(newPassword)) {
    return {
      error:
        'Your new password must contain an uppercase letter.',
    };
  }

  if (!/[0-9]/.test(newPassword)) {
    return {
      error:
        'Your new password must contain a number.',
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      error:
        'The new password and confirmation do not match.',
    };
  }

  const session = await auth();

  if (!session?.user?.id) {
    return {
      error:
        'Your session has expired. Sign in again.',
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },

      select: {
        id: true,
        password: true,
        isActive: true,
        requiresPasswordChange: true,
      },
    });

    if (!user || !user.isActive) {
      return {
        error:
          'Your account was not found or is inactive.',
      };
    }

    const currentPasswordIsValid =
      await compare(
        currentPassword,
        user.password,
      );

    if (!currentPasswordIsValid) {
      return {
        error:
          'The current password is incorrect.',
      };
    }

    const newPasswordMatchesOld =
      await compare(
        newPassword,
        user.password,
      );

    if (newPasswordMatchesOld) {
      return {
        error:
          'Your new password must be different from your current password.',
      };
    }

    const passwordHash = await hash(
      newPassword,
      12,
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        password: passwordHash,
        requiresPasswordChange: false,
      },
    });

    await signOut({
      redirectTo: '/login',
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      '[changeRequiredPassword]',
      error,
    );

    return {
      error:
        'Failed to update your password. Please try again.',
    };
  }
}