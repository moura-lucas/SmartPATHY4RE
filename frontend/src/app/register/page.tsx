"use client";

import { validateRegister, type RegisterFieldErrors } from "@smartpathy/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/app/_auth/AuthCard";
import { Field } from "@/app/_dialog/modal";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // AC18.1: same shared schema as the backend.
    const validation = validateRegister({
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await register(validation.data);
      if (result.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      setErrors(result.fieldErrors);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not create the account.");
    }
    setSubmitting(false);
  }

  const invalid = (name: keyof RegisterFieldErrors) => (errors[name] ? true : undefined);

  return (
    <AuthCard
      title="Create account"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="underline hover:no-underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Name" name="name" required errors={errors.name}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            maxLength={120}
            aria-invalid={invalid("name")}
            className="input"
          />
        </Field>
        <Field label="Email" name="email" required errors={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={invalid("email")}
            className="input"
          />
        </Field>
        <Field label="Password" name="password" required errors={errors.password}>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={invalid("password")}
            className="input"
          />
        </Field>
        <p className="-mt-2 text-xs text-zinc-600 dark:text-zinc-400">At least 8 characters.</p>
        {submitError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {submitError}
          </p>
        )}
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
