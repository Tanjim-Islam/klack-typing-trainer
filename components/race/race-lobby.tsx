"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Radio, Swords, Type } from "lucide-react";
import { supabaseConfigured } from "@/lib/supabase/env";
import {
  RACE_DURATIONS,
  RACE_NAME_MAX,
  createRaceCode,
  createRaceConfig,
  createRaceIdentity,
  displayRaceCode,
  normalizeRaceCode,
  raceCodeSchema,
  saveRaceIdentity,
  saveRaceSetup,
  type RaceContent,
} from "@/lib/race";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Input } from "@/components/ui/field";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";

export function RaceLobby() {
  const router = useRouter();
  const { account } = useStore();
  const [enteredName, setEnteredName] = useState<string | null>(null);
  const [duration, setDuration] = useState<(typeof RACE_DURATIONS)[number]>(60);
  const [content, setContent] = useState<RaceContent>("literature");
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const suggestedName =
    account?.displayName ?? account?.email?.split("@")[0] ?? "Guest typist";
  const name = enteredName ?? suggestedName.slice(0, RACE_NAME_MAX);

  const createRoom = () => {
    const code = createRaceCode();
    const identity = createRaceIdentity(name, "host");
    const config = createRaceConfig({ code, hostId: identity.playerId, duration, content });
    saveRaceSetup(identity, config);
    router.push(`/race/${code}`);
  };

  const joinRoom = () => {
    const code = normalizeRaceCode(roomCode);
    const parsed = raceCodeSchema.safeParse(code);
    if (!parsed.success) {
      setJoinError("Enter the full 8-character room code.");
      return;
    }
    setJoinError(null);
    saveRaceIdentity(code, createRaceIdentity(name, "guest"));
    router.push(`/race/${code}`);
  };

  if (!supabaseConfigured) {
    return (
      <Panel className="border-warning/30 bg-warning-soft">
        <PanelBody className="flex items-start gap-3">
          <Radio className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">1v1 is offline here</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Add the two public Supabase variables from <code>.env.example</code> to
              enable live rooms. Solo typing still works without them.
            </p>
          </div>
        </PanelBody>
      </Panel>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,0.9fr)] lg:items-stretch">
      <Panel className="overflow-hidden">
        <PanelHeader
          icon={<Swords className="size-4" aria-hidden />}
          title="Create a room"
          description="Choose the rules once. Your opponent receives the exact same text."
        />
        <PanelBody className="flex flex-col gap-5">
          <NameField id="create-race-name" name={name} onName={setEnteredName} />

          <div>
            <p className="legend mb-2.5">Race length</p>
            <Segmented
              label="Race length"
              value={String(duration)}
              onValueChange={(value) =>
                setDuration(Number(value) as (typeof RACE_DURATIONS)[number])
              }
              options={RACE_DURATIONS.map((seconds) => ({
                value: String(seconds),
                label: `${seconds}s`,
              }))}
            />
          </div>

          <div>
            <p className="legend mb-2.5">Text</p>
            <Segmented
              label="Race text"
              value={content}
              onValueChange={setContent}
              options={[
                {
                  value: "literature",
                  title: "Classic sentences",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="size-3.5" aria-hidden />
                      Classic sentences
                    </span>
                  ),
                },
                {
                  value: "words",
                  title: "Common words",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <Type className="size-3.5" aria-hidden />
                      Common words
                    </span>
                  ),
                },
              ]}
            />
          </div>

          <Button variant="primary" size="lg" onClick={createRoom} disabled={!name.trim()}>
            Create room
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </PanelBody>
      </Panel>

      <div className="relative hidden w-12 items-center justify-center lg:flex" aria-hidden>
        <div className="absolute inset-y-7 left-1/2 w-px bg-line" />
        <span className="keycap relative z-10 flex size-10 items-center justify-center font-display text-xs font-extrabold text-ink-soft">
          VS
        </span>
      </div>

      <Panel className="overflow-hidden">
        <PanelHeader
          icon={<Radio className="size-4" aria-hidden />}
          title="Join a room"
          description="Paste the invite code. The room opens while its host stays connected."
        />
        <PanelBody className="flex h-full flex-col gap-5">
          <NameField id="join-race-name" name={name} onName={setEnteredName} />

          <div className="flex-1">
            <label htmlFor="race-code" className="legend mb-2.5 block">
              Room code
            </label>
            <Input
              id="race-code"
              value={displayRaceCode(roomCode)}
              onChange={(event) => {
                setRoomCode(normalizeRaceCode(event.target.value));
                setJoinError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") joinRoom();
              }}
              placeholder="ABCD EFGH"
              autoComplete="off"
              spellCheck={false}
              maxLength={9}
              aria-invalid={joinError ? true : undefined}
              aria-describedby={joinError ? "race-code-error" : undefined}
              className="h-14 font-mono text-xl uppercase tracking-[0.22em]"
            />
            {joinError ? (
              <p id="race-code-error" className="mt-2 text-xs text-danger">
                {joinError}
              </p>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                Codes exclude easily confused characters such as 0, O, 1, and I.
              </p>
            )}
          </div>

          <Button
            variant="keycap"
            size="lg"
            onClick={joinRoom}
            disabled={!name.trim() || normalizeRaceCode(roomCode).length !== 8}
          >
            Join room
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </PanelBody>
      </Panel>

      <div className="lg:col-span-3">
        <div className="flex flex-wrap items-center justify-center gap-2 text-center text-xs text-ink-faint">
          <Badge tone="neutral">No account required</Badge>
          <span>Two ready presses</span>
          <span aria-hidden>·</span>
          <span>One server broadcast</span>
          <span aria-hidden>·</span>
          <span>One shared countdown</span>
        </div>
      </div>
    </div>
  );
}

function NameField({
  id,
  name,
  onName,
}: {
  id: string;
  name: string;
  onName: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="legend mb-2.5 block">
        Your race name
      </label>
      <Input
        id={id}
        value={name}
        onChange={(event) => onName(event.target.value.slice(0, RACE_NAME_MAX))}
        placeholder="Guest typist"
        autoComplete="nickname"
        maxLength={RACE_NAME_MAX}
      />
    </div>
  );
}
