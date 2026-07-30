import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Choose your theme and accent, set the default test, change how the typing surface behaves, and export or reset your data.",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
          Settings
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft sm:text-base">
          Every option here changes how Klack behaves straight away.
        </p>
      </header>

      <SettingsView />
    </div>
  );
}
