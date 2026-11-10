import { Breadcrumb } from "@/app/_layout/Breadcrumb";
import { getGeminiKeyStatus } from "@/lib/api";
import { GeminiKeyForm } from "./GeminiKeyForm";

export default async function SettingsPage() {
  const status = await getGeminiKeyStatus();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Settings" }]} />
      <h1 className="mt-4 text-2xl font-semibold">Settings</h1>
      <GeminiKeyForm status={status} />
    </main>
  );
}
