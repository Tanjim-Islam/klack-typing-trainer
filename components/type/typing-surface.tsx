"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { MousePointerClick, Pause } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CharState } from "@/lib/engine";
import type { Settings } from "@/lib/types";
import { Kbd } from "@/components/ui/bits";

/** Compact state codes keep the per-word memo comparison a cheap string check. */
const CODE: Record<CharState, string> = {
  pending: "p",
  correct: "c",
  wrong: "w",
  skipped: "s",
};

const CHAR_CLASS: Record<string, string> = {
  p: "text-type-pending",
  c: "text-type-correct",
  w: "text-type-wrong bg-type-wrong-veil rounded-[2px]",
  // Skipped characters were never keyed at all, so they get a strike as well as
  // a colour: state is never signalled by colour alone.
  s: "text-type-wrong/80 line-through decoration-2",
};

const VISIBLE_LINES = 4;
const CARET_FOLLOW_TAU_MS = 28;
const MAX_FRAME_DELTA_MS = 50;
const STALE_FRAME_MS = 120;
const MOTION_EPSILON_PX = 0.05;

interface FollowerMotion {
  x: number;
  y: number;
  trackY: number;
  targetX: number;
  targetY: number;
  targetTrackY: number;
  lastFrame: number | null;
  initialized: boolean;
}

function createFollowerMotion(): FollowerMotion {
  return {
    x: 0,
    y: 0,
    trackY: 0,
    targetX: 0,
    targetY: 0,
    targetTrackY: 0,
    lastFrame: null,
    initialized: false,
  };
}

const Word = memo(function Word({
  start,
  text,
  codes,
}: {
  start: number;
  text: string;
  codes: string;
}) {
  return (
    <span className="inline-block whitespace-pre">
      {Array.from(text).map((char, index) => (
        <span
          key={index}
          data-i={start + index}
          className={CHAR_CLASS[codes[index]] ?? CHAR_CLASS.p}
        >
          {char}
        </span>
      ))}
    </span>
  );
});

export interface TypingSurfaceProps {
  text: string;
  states: CharState[];
  cursor: number;
  caret: Settings["caret"];
  textSize: Settings["textSize"];
  /** Shows the focus or pause veil over the text. */
  veil: "none" | "focus" | "pause";
  /** Blink only while waiting; a blinking caret mid-run is just noise. */
  blinking: boolean;
  onActivate: () => void;
  focusTitle?: string;
  focusHint?: string;
}

export function TypingSurface({
  text,
  states,
  cursor,
  caret,
  textSize,
  veil,
  blinking,
  onActivate,
  focusTitle,
  focusHint,
}: TypingSurfaceProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const motionRef = useRef<FollowerMotion>(createFollowerMotion());
  const reducedMotionQueryRef = useRef<MediaQueryList | null>(null);
  const previousCursorRef = useRef(cursor);
  const previousTextRef = useRef(text);
  const previousTextSizeRef = useRef(textSize);

  const words = useWords(text);

  const reduceMotion = useCallback(() => {
    reducedMotionQueryRef.current ??= window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    return (
      reducedMotionQueryRef.current.matches ||
      document.documentElement.dataset.motion === "reduced"
    );
  }, []);

  const drawFollower = useCallback(() => {
    const caretEl = caretRef.current;
    const track = trackRef.current;
    if (!caretEl || !track) return;

    const motion = motionRef.current;
    caretEl.style.transform = `translate3d(${motion.x}px, ${motion.y}px, 0)`;
    track.style.transform = `translate3d(0, ${motion.trackY}px, 0)`;
  }, []);

  const snapFollower = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const motion = motionRef.current;
    motion.x = motion.targetX;
    motion.y = motion.targetY;
    motion.trackY = motion.targetTrackY;
    motion.lastFrame = null;
    drawFollower();
  }, [drawFollower]);

  const animateFollower = useCallback(
    function animateFrame(timestamp: number) {
      frameRef.current = null;

      const motion = motionRef.current;
      const frameDelta =
        motion.lastFrame === null ? 1000 / 60 : timestamp - motion.lastFrame;

      if (reduceMotion() || frameDelta > STALE_FRAME_MS) {
        snapFollower();
        return;
      }

      motion.lastFrame = timestamp;
      const blend =
        1 - Math.exp(-Math.min(frameDelta, MAX_FRAME_DELTA_MS) / CARET_FOLLOW_TAU_MS);

      motion.x += (motion.targetX - motion.x) * blend;
      motion.y += (motion.targetY - motion.y) * blend;
      motion.trackY += (motion.targetTrackY - motion.trackY) * blend;

      const settled =
        Math.abs(motion.targetX - motion.x) < MOTION_EPSILON_PX &&
        Math.abs(motion.targetY - motion.y) < MOTION_EPSILON_PX &&
        Math.abs(motion.targetTrackY - motion.trackY) < MOTION_EPSILON_PX;

      if (settled) {
        snapFollower();
        return;
      }

      drawFollower();
      frameRef.current = window.requestAnimationFrame(animateFrame);
    },
    [drawFollower, reduceMotion, snapFollower],
  );

  /**
   * Caret placement and line scrolling are pure DOM measurement, so they are
   * written straight to the elements. Keeping them out of React state means a
   * keystroke re-renders one word rather than the whole paragraph.
   */
  const paint = useCallback((immediate = false) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const caretEl = caretRef.current;
    if (!viewport || !track) return;

    const lineHeight = parseFloat(window.getComputedStyle(track).lineHeight);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

    viewport.style.height = `${lineHeight * VISIBLE_LINES}px`;

    const index = Math.min(cursor, text.length - 1);
    const target =
      index >= 0 ? track.querySelector<HTMLElement>(`[data-i="${index}"]`) : null;

    if (!target) {
      if (caretEl) caretEl.style.opacity = "0";
      motionRef.current.targetX = 0;
      motionRef.current.targetY = 0;
      motionRef.current.targetTrackY = 0;
      motionRef.current.initialized = false;
      snapFollower();
      return;
    }

    const atEnd = cursor >= text.length;
    const x = target.offsetLeft + (atEnd ? target.offsetWidth : 0);
    const y = target.offsetTop;

    if (caretEl) {
      caretEl.style.opacity = "";
      caretEl.style.width = caret === "line" ? "2px" : `${Math.max(target.offsetWidth, 6)}px`;
      caretEl.style.height = caret === "underline" ? "2px" : `${lineHeight * 0.76}px`;
      caretEl.style.marginTop =
        caret === "underline" ? `${lineHeight * 0.78}px` : `${lineHeight * 0.12}px`;
    }

    // Park the active line on the second row so the eye stays still while the
    // text scrolls underneath it.
    const line = Math.round(y / lineHeight);
    const motion = motionRef.current;
    motion.targetX = x;
    motion.targetY = y;
    motion.targetTrackY = -Math.max(0, line - 1) * lineHeight;

    const restarted = cursor === 0 && previousCursorRef.current !== 0;
    const contentChanged = text !== previousTextRef.current;
    const sizeChanged = textSize !== previousTextSizeRef.current;
    const shouldSnap =
      immediate ||
      !motion.initialized ||
      restarted ||
      contentChanged ||
      sizeChanged ||
      reduceMotion();

    previousCursorRef.current = cursor;
    previousTextRef.current = text;
    previousTextSizeRef.current = textSize;
    motion.initialized = true;

    if (shouldSnap) {
      snapFollower();
    } else if (frameRef.current === null) {
      motion.lastFrame = null;
      frameRef.current = window.requestAnimationFrame(animateFollower);
    }
  }, [animateFollower, caret, cursor, reduceMotion, snapFollower, text, textSize]);

  useLayoutEffect(() => {
    paint();
  }, [paint, words, textSize]);

  useEffect(() => {
    const handleResize = () => paint(true);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [paint]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  return (
    <div
      ref={viewportRef}
      onMouseDown={(event) => {
        // Send focus to the hidden input rather than the container.
        event.preventDefault();
        onActivate();
      }}
      data-size={textSize}
      className="type-surface relative cursor-text overflow-hidden"
    >
      <div
        ref={trackRef}
        aria-hidden
        className={cn(
          "type-track relative font-mono font-medium tracking-[0.005em] will-change-transform",
          veil !== "none" && "blur-[2.5px]",
        )}
      >
        {words.map((word) => (
          <Word
            key={word.start}
            start={word.start}
            text={word.text}
            codes={codesFor(states, word.start, word.text.length)}
          />
        ))}

        <span
          ref={caretRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0 top-0 will-change-transform",
            veil !== "none" && "invisible",
            blinking && "animate-caret",
            caret === "line" && "rounded-full bg-caret",
            caret === "block" && "rounded-[2px] border-l-2 border-caret bg-caret/20",
            caret === "underline" && "rounded-full bg-caret",
          )}
        />
      </div>

      {/* Fade the last row so it reads as "more text below", not a cut-off. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-surface to-transparent"
      />

      {veil !== "none" ? (
        <button
          type="button"
          onClick={onActivate}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-surface/60 px-4 text-center backdrop-blur-[1px]"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            {veil === "pause" ? (
              <>
                <Pause className="size-4 text-accent" aria-hidden />
                Paused
              </>
            ) : (
              <>
                <MousePointerClick className="size-4 text-primary" aria-hidden />
                {focusTitle ?? "Click here to focus"}
              </>
            )}
          </span>
          <span className="flex flex-wrap items-center justify-center gap-1 text-xs text-ink-soft">
            {veil === "pause" ? (
              <>
                The clock stopped when the test lost focus. Press <Kbd>Enter</Kbd> or
                click to carry on.
              </>
            ) : (
              <>
                {focusHint ?? "Then just start typing. The timer waits for your first key."}
              </>
            )}
          </span>
        </button>
      ) : null}
    </div>
  );
}

function codesFor(states: CharState[], start: number, length: number): string {
  let out = "";
  for (let i = start; i < start + length; i++) out += CODE[states[i] ?? "pending"];
  return out;
}

/** Splits the target into words, keeping the trailing space with its word so
 *  lines only ever break between words. */
function useWords(text: string) {
  return useMemo(() => {
    const parts = text.split(" ");
    const out: { start: number; text: string }[] = [];
    let start = 0;
    parts.forEach((part, index) => {
      const chunk = index < parts.length - 1 ? `${part} ` : part;
      if (chunk.length === 0) return;
      out.push({ start, text: chunk });
      start += chunk.length;
    });
    return out;
  }, [text]);
}
