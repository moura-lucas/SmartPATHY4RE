"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/app/_auth/AuthCard";
import { Field } from "@/app/_dialog/modal";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const ok = await login({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      });
      if (ok) {
        router.replace("/"); // AC18.2
        router.refresh();
        return;
      }
      setError("Invalid email or password."); // AC18.2: never says which one
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <AuthCard
      title="Log in"
      footer={
        <>
          No account yet?{" "}
          <Link href="/register" className="underline hover:no-underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Email" name="email" required>
          <input id="email" name="email" type="email" autoComplete="email" className="input" />
        </Field>
        <Field label="Password" name="password" required>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="input"
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthCard>
  );
}
