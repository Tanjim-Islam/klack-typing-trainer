"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Check,
  Clipboard,
  Crown,
  Loader2,
  Radio,
  RotateCcw,
  Swords,
  Trophy,
  UserRound,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { CharState } from "@/lib/engine";
import { createId, formatClock, formatDecimal } from "@/lib/format";
import {
  createRaceConfig,
  createRaceIdentity,
  displayRaceCode,
  loadRaceConfig,
  loadRaceIdentity,
  raceConfigSchema,
  raceFinishSchema,
  racePresenceSchema,
  raceProgressSchema,
  raceStartSchema,
  saveRaceIdentity,
  saveRaceSetup,
  type RaceConfig,
  type RaceFinish,
  type RaceIdentity,
  type RacePresence,
  type RaceProgress,
  type RaceStart,
} from "@/lib/race";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";
import { useStore } from "@/lib/store";
import type { Settings } from "@/lib/types";
import { Badge, Stat } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { TypingSurface } from "@/components/type/typing-surface";
import { useFocusStage } from "@/components/type/use-focus-stage";
import { useRaceTyping, type RaceLiveSnapshot } from "./use-race-typing";

type ConnectionState = "connecting" | "connected" | "error";

export function RaceRoom({ code }: { code: string }) {
  const { ready, account, settings } = useStore();

  if (!ready) {
    return (
      <Panel>
        <PanelBody className="flex min-h-64 items-center justify-center gap-3 text-ink-soft">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
          Preparing room {displayRaceCode(code)}
        </PanelBody>
      </Panel>
    );
  }

  const suggestedName =
    account?.displayName ?? account?.email?.split("@")[0] ?? "Guest typist";

  return <BootedRaceRoom code={code} settings={settings} suggestedName={suggestedName} />;
}

function BootedRaceRoom({
  code,
  settings,
  suggestedName,
}: {
  code: string;
  settings: Settings;
  suggestedName: string;
}) {
  const [boot] = useState(() => prepareRaceBoot(code, suggestedName));

  return (
    <ConnectedRaceRoom
      code={code}
      identity={boot.identity}
      initialConfig={boot.config}
      settings={settings}
    />
  );
}

function prepareRaceBoot(
  code: string,
  suggestedName: string,
): { identity: RaceIdentity; config: RaceConfig | null } {
  const savedIdentity = loadRaceIdentity(code);
  const identity = savedIdentity ?? createRaceIdentity(suggestedName, "guest");
  if (!savedIdentity) saveRaceIdentity(code, identity);

  let config = identity.role === "host" ? loadRaceConfig(code) : null;
  if (identity.role === "host" && !config) {
    config = createRaceConfig({
      code,
      hostId: identity.playerId,
      duration: 60,
      content: "literature",
    });
    saveRaceSetup(identity, config);
  }

  return { identity, config };
}

function ConnectedRaceRoom({
  code,
  identity,
  initialConfig,
  settings,
}: {
  code: string;
  identity: RaceIdentity;
  initialConfig: RaceConfig | null;
  settings: Settings;
}) {
  const toast = useToast();
  const [connection, setConnection] = useState<ConnectionState>(() =>
    supabaseConfigured ? "connecting" : "error",
  );
  const [connectionError, setConnectionError] = useState<string | null>(() =>
    supabaseConfigured ? null : "Supabase Realtime is not configured in this deployment.",
  );
  const [players, setPlayers] = useState<RacePresence[]>([]);
  const [config, setConfig] = useState<RaceConfig | null>(initialConfig);
  const [startSignal, setStartSignal] = useState<RaceStart | null>(null);
  const [remoteProgress, setRemoteProgress] = useState<RaceProgress | null>(null);
  const [remoteFinish, setRemoteFinish] = useState<RaceFinish | null>(null);
  const [focused, setFocused] = useState(false);
  const [waitExpired, setWaitExpired] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const configRef = useRef<RaceConfig | null>(initialConfig);
  const raceIdRef = useRef<string | null>(null);
  const startSentRef = useRef(false);
  const [initialPresence] = useState<RacePresence>(() => ({
    playerId: identity.playerId,
    name: identity.name,
    role: identity.role,
    joinedAt: Date.now(),
    ready: false,
    status: "lobby",
  }));
  const presenceRef = useRef(initialPresence);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const sendBroadcast = useCallback(async (event: string, payload: unknown) => {
    const channel = channelRef.current;
    if (!channel) return "error";
    return channel.send({ type: "broadcast", event, payload });
  }, []);

  const updatePresence = useCallback(async (patch: Partial<RacePresence>) => {
    const channel = channelRef.current;
    if (!channel) return;
    const next = racePresenceSchema.parse({ ...presenceRef.current, ...patch });
    presenceRef.current = next;
    const status = await channel.track(next);
    if (status !== "ok") {
      setConnectionError("The room could not update your ready state.");
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;

    let active = true;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`klack-race:${code}`, {
      config: {
        private: false,
        broadcast: { self: true, ack: true },
        presence: { key: identity.playerId, enabled: true },
      },
    });
    channelRef.current = channel;

    const syncPlayers = () => {
      const next = playersFromPresence(channel);
      if (active) setPlayers(next);
      if (identity.role === "host" && configRef.current) {
        void channel.send({
          type: "broadcast",
          event: "room-state",
          payload: configRef.current,
        });
      }
    };

    channel
      .on("presence", { event: "sync" }, syncPlayers)
      .on("broadcast", { event: "state-request" }, () => {
        if (identity.role === "host" && configRef.current) {
          void channel.send({
            type: "broadcast",
            event: "room-state",
            payload: configRef.current,
          });
        }
      })
      .on("broadcast", { event: "room-state" }, ({ payload }) => {
        const parsed = raceConfigSchema.safeParse(payload);
        if (!parsed.success || parsed.data.code !== code) return;
        configRef.current = parsed.data;
        if (active) {
          setConfig(parsed.data);
          setWaitExpired(false);
        }
      })
      .on("broadcast", { event: "race-start" }, ({ payload }) => {
        const parsed = raceStartSchema.safeParse(payload);
        if (!parsed.success || parsed.data.config.code !== code) return;
        raceIdRef.current = parsed.data.raceId;
        configRef.current = parsed.data.config;
        startSentRef.current = true;
        if (active) {
          setConfig(parsed.data.config);
          setRemoteProgress(null);
          setRemoteFinish(null);
          setStartSignal(parsed.data);
          void updatePresence({ ready: false, status: "racing" });
        }
      })
      .on("broadcast", { event: "race-progress" }, ({ payload }) => {
        const parsed = raceProgressSchema.safeParse(payload);
        if (
          !parsed.success ||
          parsed.data.playerId === identity.playerId ||
          parsed.data.raceId !== raceIdRef.current
        ) {
          return;
        }
        if (active) setRemoteProgress(parsed.data);
      })
      .on("broadcast", { event: "race-finish" }, ({ payload }) => {
        const parsed = raceFinishSchema.safeParse(payload);
        if (
          !parsed.success ||
          parsed.data.playerId === identity.playerId ||
          parsed.data.raceId !== raceIdRef.current
        ) {
          return;
        }
        if (active) setRemoteFinish(parsed.data);
      })
      .subscribe((status, error) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          setConnection("connected");
          setConnectionError(null);
          void channel.track(presenceRef.current);
          if (identity.role === "host" && configRef.current) {
            void channel.send({
              type: "broadcast",
              event: "room-state",
              payload: configRef.current,
            });
          } else {
            void channel.send({ type: "broadcast", event: "state-request", payload: {} });
          }
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnection("error");
          setConnectionError(error?.message ?? "The live room connection failed.");
        }
      });

    return () => {
      active = false;
      channelRef.current = null;
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [code, identity.playerId, identity.role, updatePresence]);

  useEffect(() => {
    if (identity.role !== "guest" || config || connection !== "connected") return;
    const id = window.setTimeout(() => setWaitExpired(true), 8000);
    return () => window.clearTimeout(id);
  }, [config, connection, identity.role]);

  const handleProgress = useCallback(
    (snapshot: RaceLiveSnapshot) => {
      const raceId = raceIdRef.current;
      if (!raceId) return;
      void sendBroadcast("race-progress", {
        version: 1,
        raceId,
        playerId: identity.playerId,
        ...snapshot,
      });
    },
    [identity.playerId, sendBroadcast],
  );

  const handleFinish = useCallback(
    (summary: Omit<RaceFinish, "version" | "raceId" | "playerId">) => {
      const raceId = raceIdRef.current;
      if (!raceId) return;
      void sendBroadcast("race-finish", {
        version: 1,
        raceId,
        playerId: identity.playerId,
        ...summary,
      });
      void updatePresence({ ready: false, status: "finished" });
    },
    [identity.playerId, sendBroadcast, updatePresence],
  );

  const typing = useRaceTyping({
    start: startSignal,
    settings,
    onProgress: handleProgress,
    onFinish: handleFinish,
  });

  const activePlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      const aHost = config ? a.playerId === config.hostId : a.role === "host";
      const bHost = config ? b.playerId === config.hostId : b.role === "host";
      if (aHost !== bHost) return aHost ? -1 : 1;
      return a.joinedAt - b.joinedAt;
    });
    return sorted.slice(0, 2);
  }, [config, players]);

  const currentPlayer = activePlayers.find((player) => player.playerId === identity.playerId);
  const opponent = activePlayers.find((player) => player.playerId !== identity.playerId);
  const roomFull = players.length > 2 && !currentPlayer;
  const bothReady = activePlayers.length === 2 && activePlayers.every((player) => player.ready);

  useEffect(() => {
    if (
      identity.role !== "host" ||
      !config ||
      connection !== "connected" ||
      startSignal ||
      !bothReady ||
      startSentRef.current
    ) {
      return;
    }

    startSentRef.current = true;
    const message = raceStartSchema.parse({
      version: 1,
      raceId: createId(),
      countdownMs: 3000,
      config,
    });
    void sendBroadcast("race-start", message).then((status) => {
      if (status !== "ok") {
        startSentRef.current = false;
        setConnectionError("The shared countdown could not start. Press Start again.");
        void updatePresence({ ready: false });
      }
    });
  }, [bothReady, config, connection, identity.role, sendBroadcast, startSignal, updatePresence]);

  const focusStage = typing.phase === "countdown" || typing.phase === "running";
  useFocusStage(focusStage);

  const copyInvite = async () => {
    const invite = window.location.href;
    try {
      await navigator.clipboard.writeText(invite);
      toast({ tone: "success", message: "Invite link copied", detail: displayRaceCode(code) });
    } catch {
      toast({ tone: "error", message: "Could not copy the link", detail: invite });
    }
  };

  if (connection === "error") {
    return (
      <StatePanel
        icon={<WifiOff className="size-5" aria-hidden />}
        title="The room lost its live connection"
        detail={connectionError ?? "Reload the room and try again."}
      />
    );
  }

  if (roomFull) {
    return (
      <StatePanel
        icon={<UserRound className="size-5" aria-hidden />}
        title="This room already has two racers"
        detail="Ask the host for a new room code. 1v1 rooms only keep two active lanes."
      />
    );
  }

  if (focusStage && startSignal && config) {
    return (
      <RaceFocusStage
        code={code}
        config={config}
        identity={identity}
        opponent={opponent}
        remoteProgress={remoteProgress}
        phase={typing.phase === "countdown" ? "countdown" : "running"}
        countdown={typing.countdown}
        remainingMs={typing.remainingMs}
        wpm={typing.wpm}
        accuracy={typing.accuracy}
        states={typing.engine.states}
        cursor={typing.engine.cursor}
        progress={typing.progress}
        attachInput={typing.attachInput}
        focusInput={typing.focusInput}
        focused={focused}
        onFocused={setFocused}
      />
    );
  }

  if (typing.phase === "finished" && typing.result && config) {
    return (
      <RaceResultPanel
        code={code}
        identity={identity}
        opponent={opponent}
        result={typing.result}
        recorded={typing.recorded}
        remoteFinish={remoteFinish}
      />
    );
  }

  const hostConnected = config
    ? players.some((player) => player.playerId === config.hostId)
    : players.some((player) => player.role === "host");

  return (
    <div className="flex flex-col gap-5">
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <p className="legend">Room code</p>
            <p className="mt-1 font-mono text-xl font-semibold tracking-[0.16em] text-ink">
              {displayRaceCode(code)}
            </p>
          </div>
          <Button variant="keycap" size="sm" onClick={copyInvite} className="sm:ml-2">
            <Clipboard className="size-3.5" aria-hidden />
            Copy invite
          </Button>
          <ConnectionBadge state={connection} className="ml-auto" />
        </div>

        <PanelBody className="flex flex-col gap-6 p-5 sm:p-6">
          {waitExpired && !config ? (
            <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3">
              <p className="text-sm font-semibold text-ink">No host is sharing this code yet</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Check the eight characters, or ask the host to keep their room page open.
              </p>
            </div>
          ) : null}

          {config && !hostConnected && !startSignal ? (
            <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-ink-soft">
              The host left before the race started. Ask them to reopen the invite link.
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch">
            <PlayerLane
              player={activePlayers[0]}
              slot="Lane 1"
              currentId={identity.playerId}
              hostId={config?.hostId}
            />
            <div className="flex items-center justify-center px-2" aria-hidden>
              <span className="keycap flex size-10 items-center justify-center font-display text-xs font-extrabold text-ink-soft">
                VS
              </span>
            </div>
            <PlayerLane
              player={activePlayers[1]}
              slot="Lane 2"
              currentId={identity.playerId}
              hostId={config?.hostId}
            />
          </div>

          <div className="grid gap-4 rounded-lg border border-line bg-muted/35 p-4 sm:grid-cols-3">
            <RaceRule label="Clock" value={config ? `${config.duration} seconds` : "Waiting for host"} />
            <RaceRule
              label="Text"
              value={
                config?.content === "literature"
                  ? "Classic sentences"
                  : config
                    ? "Common words"
                    : "Shared after joining"
              }
            />
            <RaceRule label="Start" value="Both players ready" />
          </div>

          {config?.source ? (
            <p className="text-center text-xs text-ink-faint">Text source: {config.source}</p>
          ) : null}

          <div className="flex flex-col items-center gap-3 border-t border-line pt-5">
            <Button
              variant={currentPlayer?.ready ? "outline" : "primary"}
              size="lg"
              disabled={!config || connection !== "connected" || !currentPlayer}
              onClick={() => void updatePresence({ ready: !currentPlayer?.ready, status: "lobby" })}
              className="min-w-56"
            >
              {currentPlayer?.ready ? (
                <>
                  <Check className="size-4" aria-hidden />
                  Ready, waiting for rival
                </>
              ) : (
                <>
                  <Swords className="size-4" aria-hidden />
                  Start when ready
                </>
              )}
            </Button>
            <p className="text-center text-xs text-ink-faint">
              {activePlayers.length < 2
                ? "Share the code. The countdown waits for both Start presses."
                : bothReady
                  ? "Both ready. Starting the shared countdown now."
                  : "Each player controls only their own ready state."}
            </p>
          </div>
        </PanelBody>
      </Panel>
    </div>
  );
}

function playersFromPresence(channel: RealtimeChannel): RacePresence[] {
  const raw = channel.presenceState<Record<string, unknown>>();
  const byPlayer = new Map<string, RacePresence>();

  for (const presences of Object.values(raw)) {
    for (const presence of presences) {
      const parsed = racePresenceSchema.safeParse(presence);
      if (!parsed.success) continue;
      const existing = byPlayer.get(parsed.data.playerId);
      if (!existing || parsed.data.joinedAt >= existing.joinedAt) {
        byPlayer.set(parsed.data.playerId, parsed.data);
      }
    }
  }

  return [...byPlayer.values()].sort((a, b) => a.joinedAt - b.joinedAt);
}

function RaceFocusStage({
  code,
  config,
  identity,
  opponent,
  remoteProgress,
  phase,
  countdown,
  remainingMs,
  wpm,
  accuracy,
  states,
  cursor,
  progress,
  attachInput,
  focusInput,
  focused,
  onFocused,
}: {
  code: string;
  config: RaceConfig;
  identity: RaceIdentity;
  opponent: RacePresence | undefined;
  remoteProgress: RaceProgress | null;
  phase: "countdown" | "running";
  countdown: number;
  remainingMs: number;
  wpm: number;
  accuracy: number;
  states: CharState[];
  cursor: number;
  progress: number;
  attachInput: (element: HTMLTextAreaElement | null) => void;
  focusInput: () => void;
  focused: boolean;
  onFocused: (focused: boolean) => void;
}) {
  if (phase === "countdown") {
    return (
      <div className="fixed inset-x-0 bottom-0 top-15 z-30 flex items-center justify-center bg-canvas px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-xl border border-primary/30 bg-primary-soft text-primary shadow-key">
            <Swords className="size-7" aria-hidden />
          </div>
          <p className="legend">Both racers ready</p>
          <p className="mt-3 font-display text-8xl font-extrabold leading-none text-primary tnum">
            {countdown}
          </p>
          <p className="mt-5 text-sm text-ink-soft">Same text. Same clock. Eyes forward.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-15 z-30 overflow-y-auto bg-canvas px-4 sm:px-6">
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-center py-8 sm:py-12">
        <div className="flex w-full flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-7 sm:gap-10">
              <RaceReadout
                label="Time left"
                value={formatClock(Math.ceil(remainingMs / 1000))}
              />
              <RaceReadout label="Speed" value={formatDecimal(wpm, 0)} unit="wpm" />
              <RaceReadout
                label="Accuracy"
                value={formatDecimal(accuracy, 0)}
                unit="%"
              />
            </div>
            <div className="min-w-44 text-right">
              <p className="legend">Racing</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {identity.name} vs {opponent?.name ?? "opponent"}
              </p>
              <p className="mt-0.5 font-mono text-[0.6875rem] tracking-[0.12em] text-ink-faint">
                {displayRaceCode(code)}
              </p>
            </div>
          </div>

          <OpponentTrack
            name={opponent?.name ?? "Opponent"}
            progress={remoteProgress?.progress ?? 0}
          />

          <div className="relative">
            <textarea
              ref={attachInput}
              value=""
              onChange={() => undefined}
              onFocus={() => onFocused(true)}
              onBlur={() => onFocused(false)}
              aria-label="1v1 typing race input"
              aria-describedby="race-typing-target"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="absolute inset-0 -z-10 size-full resize-none opacity-0"
            />
            <p id="race-typing-target" className="sr-only">
              Type the shared race text. The clock continues if focus leaves the field. Text to
              type: {config.text}
            </p>
            <TypingSurface
              text={config.text}
              states={states}
              cursor={cursor}
              caret={"block"}
              textSize={"lg"}
              veil={focused ? "none" : "focus"}
              blinking={false}
              focusTitle="Click to keep racing"
              focusHint="The shared clock is still running."
              onActivate={focusInput}
            />
          </div>

          <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RaceResultPanel({
  code,
  identity,
  opponent,
  result,
  recorded,
  remoteFinish,
}: {
  code: string;
  identity: RaceIdentity;
  opponent: RacePresence | undefined;
  result: NonNullable<ReturnType<typeof useRaceTyping>["result"]>;
  recorded: boolean;
  remoteFinish: RaceFinish | null;
}) {
  const outcome = remoteFinish ? compareRace(result.correctChars, result.accuracy, remoteFinish) : null;
  const heading = outcome === "win" ? "You won" : outcome === "loss" ? "Your rival won" : "Dead heat";

  return (
    <div className="flex flex-col gap-5">
      <Panel className="animate-rise overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
          <Badge tone={outcome === "win" ? "accent" : "primary"}>
            <Trophy className="size-3" aria-hidden />
            {outcome ? heading : "Waiting for rival"}
          </Badge>
          <span className="font-mono text-xs tracking-[0.12em] text-ink-faint">
            {displayRaceCode(code)}
          </span>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:p-6">
          <ResultLane
            name={identity.name}
            label="You"
            wpm={result.wpm}
            accuracy={result.accuracy}
            correctChars={result.correctChars}
            winner={outcome === "win"}
          />
          <div className="flex items-center justify-center" aria-hidden>
            <span className="font-display text-sm font-extrabold text-ink-faint">VS</span>
          </div>
          {remoteFinish ? (
            <ResultLane
              name={opponent?.name ?? "Opponent"}
              label="Rival"
              wpm={remoteFinish.wpm}
              accuracy={remoteFinish.accuracy}
              correctChars={remoteFinish.correctChars}
              winner={outcome === "loss"}
            />
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-muted/30 text-center">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
              <p className="mt-3 text-sm font-medium text-ink">Waiting for the other finish</p>
              <p className="mt-1 text-xs text-ink-faint">Their result will appear live.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-muted/40 px-5 py-4 sm:px-6">
          <Button variant="primary" asChild>
            <Link href="/race">
              <RotateCcw className="size-4" aria-hidden />
              New race
            </Link>
          </Button>
          <Button variant="ghost" asChild className="ml-auto">
            <Link href="/progress">See progress</Link>
          </Button>
        </div>
      </Panel>

      <p className="text-center text-xs text-ink-faint">
        {recorded
          ? "Your 1v1 result was saved with your typing history."
          : "This result was too short to save, but it still counts for this room."}
      </p>
    </div>
  );
}

function compareRace(
  localCorrect: number,
  localAccuracy: number,
  remote: RaceFinish,
): "win" | "loss" | "draw" {
  if (localCorrect !== remote.correctChars) {
    return localCorrect > remote.correctChars ? "win" : "loss";
  }
  if (Math.abs(localAccuracy - remote.accuracy) > 0.05) {
    return localAccuracy > remote.accuracy ? "win" : "loss";
  }
  return "draw";
}

function PlayerLane({
  player,
  slot,
  currentId,
  hostId,
}: {
  player: RacePresence | undefined;
  slot: string;
  currentId: string;
  hostId: string | undefined;
}) {
  if (!player) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-muted/25 text-center">
        <Radio className="size-5 text-ink-faint" aria-hidden />
        <p className="mt-2 text-sm font-medium text-ink-soft">Waiting for opponent</p>
        <p className="mt-1 text-xs text-ink-faint">{slot}</p>
      </div>
    );
  }

  const isHost = hostId ? player.playerId === hostId : player.role === "host";
  const isCurrent = player.playerId === currentId;

  return (
    <div
      className={cn(
        "relative flex min-h-32 flex-col justify-between rounded-lg border p-4",
        isCurrent ? "border-primary/35 bg-primary-soft/55" : "border-line bg-surface",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="legend">{slot}</span>
        {isHost ? <Crown className="size-4 text-accent" aria-label="Host" /> : null}
      </div>
      <div>
        <p className="truncate font-display text-lg font-semibold text-ink">{player.name}</p>
        <p className="mt-1 text-xs text-ink-faint">{isCurrent ? "You" : isHost ? "Host" : "Rival"}</p>
      </div>
      <p
        className={cn(
          "mt-3 flex items-center gap-1.5 text-xs font-medium",
          player.ready ? "text-success" : "text-ink-soft",
        )}
      >
        <span className={cn("size-2 rounded-full", player.ready ? "bg-success" : "bg-line")} />
        {player.ready ? "Ready" : "Not ready"}
      </p>
    </div>
  );
}

function RaceRule({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="legend">{label}</p>
      <p className="mt-1.5 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function ConnectionBadge({ state, className }: { state: ConnectionState; className?: string }) {
  return (
    <Badge tone={state === "connected" ? "success" : "neutral"} className={className}>
      {state === "connecting" ? (
        <Loader2 className="size-3 animate-spin" aria-hidden />
      ) : (
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
      )}
      {state === "connected" ? "Live" : "Connecting"}
    </Badge>
  );
}

function RaceReadout({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="legend">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-semibold tracking-tight text-ink tnum sm:text-4xl">
          {value}
        </span>
        {unit ? <span className="font-mono text-xs text-ink-faint">{unit}</span> : null}
      </p>
    </div>
  );
}

function OpponentTrack({ name, progress }: { name: string; progress: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 truncate text-xs font-medium text-ink-soft">{name}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>
      <span className="w-9 text-right font-mono text-[0.6875rem] text-ink-faint tnum">
        {Math.round(progress * 100)}%
      </span>
    </div>
  );
}

function ResultLane({
  name,
  label,
  wpm,
  accuracy,
  correctChars,
  winner,
}: {
  name: string;
  label: string;
  wpm: number;
  accuracy: number;
  correctChars: number;
  winner: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5",
        winner ? "border-accent/35 bg-accent-soft" : "border-line bg-surface",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="legend">{label}</p>
          <h2 className="mt-1 truncate font-display text-lg font-semibold text-ink">{name}</h2>
        </div>
        {winner ? <Trophy className="size-5 text-accent" aria-label="Winner" /> : null}
      </div>
      <div className="mt-6 flex flex-wrap items-end gap-6">
        <Stat label="WPM" value={formatDecimal(wpm, 0)} size="lg" tone="primary" />
        <Stat label="Accuracy" value={formatDecimal(accuracy, 1)} unit="%" size="sm" />
        <Stat label="Correct" value={correctChars} unit="chars" size="sm" />
      </div>
    </div>
  );
}

function StatePanel({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Panel>
      <PanelBody className="flex min-h-72 flex-col items-center justify-center text-center">
        <span className="keycap flex size-11 items-center justify-center text-danger">{icon}</span>
        <h1 className="mt-4 font-display text-xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{detail}</p>
        <Button variant="keycap" asChild className="mt-5">
          <Link href="/race">Back to 1v1</Link>
        </Button>
      </PanelBody>
    </Panel>
  );
}
