"use client";

import { useRef, useState } from "react";
import {
  Database,
  Download,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  TriangleAlert,
  Upload,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { downloadJson } from "@/lib/storage";
import { exportAll, replaceAll, resetAll, updateSettings, useStore } from "@/lib/store";
import {
  ACCENTS,
  ACCENT_LABELS,
  ACCENT_SHORT,
  DURATIONS,
  MODE_HINTS,
  MODE_LABELS,
  TEST_MODES,
  WORD_COUNTS,
  type Accent,
  type TestMode,
} from "@/lib/types";
import { Skeleton } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Segmented, Select, Switch } from "@/components/ui/controls";
import { SettingRow } from "@/components/ui/field";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { AccountPanel } from "./account-panel";

function AccentPicker({
  value,
  onChange,
}: {
  value: Accent;
  onChange: (accent: Accent) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Accent colour" className="flex gap-2">
      {ACCENTS.map((accent) => {
        const active = accent === value;
        return (
          <button
            key={accent}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(accent)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-md border px-2.5 text-[0.8125rem] font-medium transition-colors",
              active
                ? "border-primary bg-primary-soft text-primary"
                : "border-line text-ink-soft hover:bg-muted hover:text-ink",
            )}
          >
            <span
              aria-hidden
              data-swatch={accent}
              className="size-3.5 rounded-full border border-line"
            />
            {ACCENT_SHORT[accent]}
            <span className="sr-only">{ACCENT_LABELS[accent]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SettingsView() {
  const toast = useToast();
  const { ready, status, settings, results, drills, account } = useStore();

  const fileRef = useRef<HTMLInputElement>(null);
  const [resetting, setResetting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`klack-backup-${stamp}.json`, exportAll());
    toast({
      tone: "success",
      message: "Backup downloaded",
      detail: `${results.length} tests and ${drills.filter((d) => !d.builtIn).length} of your drills.`,
    });
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const outcome = replaceAll(text);
      if (outcome.ok) {
        toast({
          tone: "success",
          message: "Backup restored",
          detail: "Your history, drills and settings were replaced.",
        });
      } else {
        toast({ tone: "error", message: "Import failed", detail: outcome.error });
      }
    } catch {
      toast({
        tone: "error",
        message: "Import failed",
        detail: "That file could not be read.",
      });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!ready) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-64" />
        <Skeleton className="h-72" />
        <Skeleton className="h-56" />
        <span className="sr-only">Loading your settings</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AccountPanel />

      {status === "recovered" ? (
        <Panel className="border-warning/30 bg-warning-soft">
          <PanelBody className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-4.5 shrink-0 text-warning" aria-hidden />
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Your saved data could not be read
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                Klack started fresh rather than guess at damaged data. The unreadable
                copy was kept aside under the key{" "}
                <code className="rounded bg-raised px-1 py-0.5 font-mono text-xs">
                  klack.v1.unreadable
                </code>{" "}
                in this browser&apos;s local storage, in case you want to recover it
                by hand.
              </p>
            </div>
          </PanelBody>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          icon={<Palette className="size-4" aria-hidden />}
          title="Appearance"
          description="Applies immediately and is remembered in this browser."
        />
        <PanelBody className="divide-y divide-line py-0">
          <SettingRow
            label="Theme"
            description="Match your system, or pin it."
            control={
              <Segmented
                label="Theme"
                value={settings.theme}
                onValueChange={(theme) => updateSettings({ theme })}
                options={[
                  {
                    value: "light",
                    title: "Light",
                    label: <Sun className="size-4" aria-hidden />,
                  },
                  {
                    value: "dark",
                    title: "Dark",
                    label: <Moon className="size-4" aria-hidden />,
                  },
                  {
                    value: "system",
                    title: "Match system",
                    label: <Monitor className="size-4" aria-hidden />,
                  },
                ]}
              />
            }
          />
          <SettingRow
            label="Accent colour"
            description="Used for the caret, buttons and charts."
            control={
              <AccentPicker
                value={settings.accent}
                onChange={(accent) => updateSettings({ accent })}
              />
            }
          />
          <SettingRow
            label="Reduce motion"
            htmlFor="setting-motion"
            description="Turns off transitions and the blinking caret, whatever your system is set to."
            control={
              <Switch
                id="setting-motion"
                checked={settings.motion === "reduced"}
                onCheckedChange={(on) =>
                  updateSettings({ motion: on ? "reduced" : "system" })
                }
              />
            }
          />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          icon={<Wand2 className="size-4" aria-hidden />}
          title="Test defaults"
          description="What loads when you open the Type page."
        />
        <PanelBody className="divide-y divide-line py-0">
          <SettingRow
            label="Starting mode"
            htmlFor="setting-mode"
            descriptionId="setting-mode-hint"
            description={MODE_HINTS[settings.defaultMode]}
            control={
              <Select
                id="setting-mode"
                ariaLabel="Starting mode"
                value={settings.defaultMode}
                onValueChange={(defaultMode: TestMode) => updateSettings({ defaultMode })}
                options={TEST_MODES.map((mode) => ({
                  value: mode,
                  label: MODE_LABELS[mode],
                }))}
              />
            }
          />
          <SettingRow
            label="Timed length"
            description="Used by timed tests."
            control={
              <Segmented
                label="Timed length"
                value={String(settings.duration)}
                onValueChange={(value) =>
                  updateSettings({
                    duration: Number(value) as (typeof DURATIONS)[number],
                  })
                }
                options={DURATIONS.map((d) => ({ value: String(d), label: `${d}s` }))}
              />
            }
          />
          <SettingRow
            label="Word count"
            description="Used by word tests."
            control={
              <Segmented
                label="Word count"
                value={String(settings.wordCount)}
                onValueChange={(value) =>
                  updateSettings({
                    wordCount: Number(value) as (typeof WORD_COUNTS)[number],
                  })
                }
                options={WORD_COUNTS.map((c) => ({ value: String(c), label: String(c) }))}
              />
            }
          />
          <SettingRow
            label="Include punctuation"
            htmlFor="setting-punctuation"
            description="Commas, full stops, quotes and brackets woven into generated text."
            control={
              <Switch
                id="setting-punctuation"
                checked={settings.punctuation}
                onCheckedChange={(punctuation) => updateSettings({ punctuation })}
              />
            }
          />
          <SettingRow
            label="Include numbers"
            htmlFor="setting-numbers"
            description="Mixes digits into generated text."
            control={
              <Switch
                id="setting-numbers"
                checked={settings.numbers}
                onCheckedChange={(numbers) => updateSettings({ numbers })}
              />
            }
          />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          icon={<Monitor className="size-4" aria-hidden />}
          title="While you type"
          description="How the typing surface behaves."
        />
        <PanelBody className="divide-y divide-line py-0">
          <SettingRow
            label="Stop on error"
            htmlFor="setting-stop"
            description="Wrong keys are rejected until you type the right one. Slower, but it builds accuracy."
            control={
              <Switch
                id="setting-stop"
                checked={settings.stopOnError}
                onCheckedChange={(stopOnError) => updateSettings({ stopOnError })}
              />
            }
          />
          <SettingRow
            label="Show live speed"
            htmlFor="setting-live"
            description="Turn this off to stop watching the numbers mid-test."
            control={
              <Switch
                id="setting-live"
                checked={settings.showLiveStats}
                onCheckedChange={(showLiveStats) => updateSettings({ showLiveStats })}
              />
            }
          />
          <SettingRow
            label="Caret"
            description="The marker showing where you are."
            control={
              <Segmented
                label="Caret style"
                value={settings.caret}
                onValueChange={(caret) => updateSettings({ caret })}
                options={[
                  { value: "block", label: "Block" },
                  { value: "line", label: "Line" },
                  { value: "underline", label: "Under" },
                ]}
              />
            }
          />
          <SettingRow
            label="Text size"
            description="Larger text is easier to read ahead in."
            control={
              <Segmented
                label="Text size"
                value={settings.textSize}
                onValueChange={(textSize) => updateSettings({ textSize })}
                options={[
                  { value: "md", label: "Regular" },
                  { value: "lg", label: "Large" },
                ]}
              />
            }
          />
          <SettingRow
            label="Keystroke sound"
            htmlFor="setting-sound"
            description="A synthesised click on every key. Nothing is downloaded; it is generated in the browser."
            control={
              <Switch
                id="setting-sound"
                checked={settings.sound}
                onCheckedChange={(sound) => updateSettings({ sound })}
              />
            }
          />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          icon={<Database className="size-4" aria-hidden />}
          title="Your data"
          description={
            account
              ? "Your history is stored in your account. This browser keeps a copy so the app opens instantly."
              : "Without an account, everything lives in this browser's local storage."
          }
        />
        <PanelBody className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-muted/40 px-4 py-3">
              <p className="legend">Tests saved</p>
              <p className="mt-1.5 font-display text-xl font-semibold text-ink tnum">
                {results.length}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-muted/40 px-4 py-3">
              <p className="legend">Your drills</p>
              <p className="mt-1.5 font-display text-xl font-semibold text-ink tnum">
                {drills.filter((d) => !d.builtIn).length}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-muted/40 px-4 py-3">
              <p className="legend">Storage</p>
              <p className="mt-1.5 text-sm font-medium text-ink">
                {account ? "Your account" : "This browser only"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="keycap" onClick={handleExport}>
              <Download className="size-4" aria-hidden />
              Export backup
            </Button>

            <Button
              variant="keycap"
              loading={importing}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" aria-hidden />
              Import backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Choose a Klack backup file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImport(file);
              }}
            />

            <Button
              variant="dangerGhost"
              onClick={() => setResetting(true)}
              className="ml-auto"
            >
              <RotateCcw className="size-4" aria-hidden />
              Reset everything
            </Button>
          </div>

          <p className="text-xs leading-relaxed text-ink-faint">
            {account
              ? "Importing replaces everything currently stored, in this browser and in your account. Resetting deletes your tests, drills and settings from the database too."
              : "Importing replaces everything currently stored. Clearing your browser data or using private browsing will lose your history, so export a backup if it matters to you."}
          </p>
        </PanelBody>
      </Panel>

      <ConfirmDialog
        open={resetting}
        onOpenChange={setResetting}
        title="Reset Klack to a clean slate?"
        body={
          <>
            This deletes all {results.length} saved tests, your{" "}
            {drills.filter((d) => !d.builtIn).length} custom drills and every setting
            on this page
            {account ? ", from your account as well as this browser" : ""}. Built-in
            drills come back. This cannot be undone.
          </>
        }
        confirmLabel="Reset everything"
        onConfirm={() => {
          resetAll();
          setResetting(false);
          toast({ tone: "success", message: "Klack has been reset" });
        }}
      />
    </div>
  );
}
