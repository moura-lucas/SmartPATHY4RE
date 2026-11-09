import Link from "next/link";
import { getGeminiKeyStatus } from "@/lib/api";
import { GeminiKeyForm } from "./GeminiKeyForm";

export default async function SettingsPage() {
  const status = await getGeminiKeyStatus();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Settings</h1>
      <GeminiKeyForm status={status} />
    </main>
  );
}
