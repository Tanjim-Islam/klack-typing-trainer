"use client";

import { useRouter } from "next/navigation";
import { Keyboard, Wand2 } from "lucide-react";
import {
  buildAdaptiveDrill,
  mergeKeyStats,
  weakestKeys,
  MIN_ATTEMPTS_FOR_WEAKNESS,
} from "@/lib/analysis";
import { formatDecimal, formatInt } from "@/lib/format";
import { charName } from "@/lib/keyboard";
import { queueDrill } from "@/lib/store";
import type { TestResult } from "@/lib/types";
import { KeyHeatmap } from "@/components/charts/key-heatmap";
import { Kbd } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";

/**
 * The centrepiece of the app: which keys are costing you the most, and a
 * one-click drill built from them.
 */
export function WeakKeysPanel({ results }: { results: TestResult[] }) {
  const router = useRouter();
  const toast = useToast();

  const stats = mergeKeyStats(results);
  const weak = weakestKeys(results, 5);
  const keyIds = weak.map((k) => k.id);

  const startDrill = () => {
    const drill = buildAdaptiveDrill(weak);
    if (!drill) return;
    queueDrill({
      name: `Weak keys: ${drill.keys.map(charName).join(" ")}`,
      text: drill.text,
      keys: drill.keys,
    });
    toast({
      tone: "info",
      message: "Drill ready",
      detail: `Built from your ${drill.keys.length} weakest keys.`,
    });
    router.push("/");
  };

  return (
    <Panel>
      <PanelHeader
        icon={<Keyboard className="size-4" aria-hidden />}
        title="Accuracy by key"
        description="Every keystroke is scored against the key you were aiming for. Hotter keys are the ones you miss most."
        actions={
          weak.length > 0 ? (
            <Button variant="primary" onClick={startDrill}>
              <Wand2 className="size-4" aria-hidden />
              Drill these keys
            </Button>
          ) : null
        }
      />
      <PanelBody className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10">
        <KeyHeatmap stats={stats} flaggedKeys={keyIds} className="min-w-0" />

        <div className="lg:border-l lg:border-line lg:pl-8">
          <h3 className="legend mb-3">Weakest keys</h3>

          {weak.length === 0 ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              Nothing stands out yet. A key needs at least{" "}
              {MIN_ATTEMPTS_FOR_WEAKNESS} attempts before Klack will call it a
              weakness, so keep typing and this list will fill in.
            </p>
          ) : (
            <>
              <ol className="flex flex-col divide-y divide-line">
                {weak.map((key, index) => (
                  <li
                    key={key.id}
                    className="flex items-center gap-3 py-2.5 first:pt-0"
                  >
                    <span className="w-3 font-mono text-xs text-ink-faint tnum">
                      {index + 1}
                    </span>
                    <Kbd className="min-w-8">{charName(key.char)}</Kbd>
                    <span className="ml-auto text-right">
                      <span className="block font-mono text-sm font-medium text-ink tnum">
                        {formatDecimal(key.accuracy, 1)}%
                      </span>
                      <span className="block font-mono text-[0.625rem] text-ink-faint tnum">
                        {formatInt(key.misses)} of {formatInt(key.attempts)} missed
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-4 text-xs leading-relaxed text-ink-soft">
                Ranked by total mistakes rather than percentage, so a key you miss
                often outranks one you missed once.
              </p>
            </>
          )}
        </div>
      </PanelBody>
    </Panel>
  );
}
