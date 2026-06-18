'use client';

import type { FormEvent } from 'react';

import {
  useState,
  useTransition,
} from 'react';

import { useRouter } from 'next/navigation';

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';

import { changeRequiredPassword } from '@/app/actions/change-password.actions';

export function ChangePasswordForm() {
  const router = useRouter();

  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] =
    useState(false);

  const [isPending, startTransition] =
    useTransition();

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError('');

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result =
        await changeRequiredPassword(
          formData,
        );

      if (result.error) {
        setError(result.error);
        return;
      }

      /*
       * The server action normally signs the user
       * out and redirects. This is only a fallback.
       */
      router.replace('/login');
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
    >
      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="text-sm font-black">
              Password change unsuccessful
            </p>

            <p className="mt-1 text-xs font-semibold leading-5">
              {error}
            </p>
          </div>
        </div>
      ) : null}

      <PasswordField
        id="currentPassword"
        name="currentPassword"
        label="Current password"
        placeholder="Enter your temporary password"
        autoComplete="current-password"
        visible={showPasswords}
        disabled={isPending}
      />

      <PasswordField
        id="newPassword"
        name="newPassword"
        label="New password"
        placeholder="Create a new secure password"
        autoComplete="new-password"
        visible={showPasswords}
        disabled={isPending}
      />

      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm new password"
        placeholder="Enter the new password again"
        autoComplete="new-password"
        visible={showPasswords}
        disabled={isPending}
      />

      <button
        type="button"
        onClick={() =>
          setShowPasswords(
            (current) => !current,
          )
        }
        disabled={isPending}
        className="inline-flex items-center gap-2 text-xs font-black text-sky-700 transition-colors hover:text-sky-900 disabled:opacity-60"
      >
        {showPasswords ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}

        {showPasswords
          ? 'Hide passwords'
          : 'Show passwords'}
      </button>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black text-slate-800">
          Your new password must contain:
        </p>

        <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">
          <Requirement text="At least 8 characters" />
          <Requirement text="One uppercase letter" />
          <Requirement text="One lowercase letter" />
          <Requirement text="At least one number" />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-13 w-full items-center justify-center rounded-2xl bg-[#082f49] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-[#0c4a6e] focus:outline-none focus:ring-4 focus:ring-sky-700/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-65"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Updating password...
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-5 w-5" />
            Update password
          </>
        )}
      </button>
    </form>
  );
}

function PasswordField({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  visible,
  disabled,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  autoComplete:
    | 'current-password'
    | 'new-password';
  visible: boolean;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-sm font-black text-slate-800"
      >
        {label}
      </label>

      <div className="group relative">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-700" />

        <input
          required
          id={id}
          name={name}
          type={
            visible ? 'text' : 'password'
          }
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-950 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-600 focus:bg-white focus:ring-4 focus:ring-sky-600/10 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    </div>
  );
}

function Requirement({
  text,
}: {
  text: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      {text}
    </span>
  );
}