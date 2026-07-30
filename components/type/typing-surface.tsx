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

const VISIBLE_LINES = 3;

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
}: TypingSurfaceProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);

  const words = useWords(text);

  /**
   * Caret placement and line scrolling are pure DOM measurement, so they are
   * written straight to the elements. Keeping them out of React state means a
   * keystroke re-renders one word rather than the whole paragraph.
   */
  const paint = useCallback(() => {
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
      track.style.transform = "translateY(0px)";
      return;
    }

    const atEnd = cursor >= text.length;
    const x = target.offsetLeft + (atEnd ? target.offsetWidth : 0);
    const y = target.offsetTop;

    if (caretEl) {
      caretEl.style.opacity = "";
      caretEl.style.transform = `translate(${x}px, ${y}px)`;
      caretEl.style.width = caret === "line" ? "2px" : `${Math.max(target.offsetWidth, 6)}px`;
      caretEl.style.height = caret === "underline" ? "2px" : `${lineHeight * 0.76}px`;
      caretEl.style.marginTop =
        caret === "underline" ? `${lineHeight * 0.78}px` : `${lineHeight * 0.12}px`;
    }

    // Park the active line on the second row so the eye stays still while the
    // text scrolls underneath it.
    const line = Math.round(y / lineHeight);
    track.style.transform = `translateY(${-Math.max(0, line - 1) * lineHeight}px)`;
  }, [caret, cursor, text]);

  useLayoutEffect(paint, [paint, words, textSize]);

  useEffect(() => {
    window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, [paint]);

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
          "type-track relative font-mono font-medium tracking-[0.005em]",
          "transition-transform duration-200 ease-key",
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
            "pointer-events-none absolute left-0 top-0 transition-transform duration-100 ease-key",
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
                Click here to focus
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
              <>Then just start typing. The timer waits for your first key.</>
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
