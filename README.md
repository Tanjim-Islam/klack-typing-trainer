# Klack

**Typing practice that finds your weak keys and drills them.**

Klack measures your typing speed and accuracy key by key. After a few tests it
shows an accuracy heat map of the whole keyboard, tells you which keys are
costing you the most mistakes, and generates a practice drill aimed at exactly
those keys.

Everything runs in the browser. There is no account, no server and no network
request: your history is stored in this browser's local storage.

---

## Who it is for

People who type for a living and want to get measurably faster: developers,
writers, support agents, students. It assumes a physical keyboard and a few
spare minutes, not a training course.

## Why this concept

Most typing testers tell you a number. A 62 wpm score does not tell you what to
do next. Klack's one differentiating idea is that the measurement feeds
directly back into the practice: because every keystroke is recorded against the
character it was aiming for, the app can rank keys by how many mistakes they
actually caused and then build text that hammers those keys. The loop is
**test, see your weak keys, drill them, test again**.

## The main flow

1. Open the app and start typing. The clock starts on your first keystroke.
2. Finish the test and read the result: speed, accuracy, consistency, and the
   keys you fumbled in that run.
3. Go to **Progress** for speed over time and a keyboard accuracy heat map.
4. Press **Drill these keys**. Klack generates a drill from your five weakest
   keys and drops you back on the test screen with it loaded.
5. Repeat. The streak counter and the trend arrow tell you whether it is working.

## Features

**Five test modes**

| Mode | What it is |
| --- | --- |
| Timed | 15, 30, 60 or 120 seconds of generated words |
| Words | A fixed count: 10, 25, 50 or 100 words |
| Prose | Full sentences with capitals and punctuation |
| Code | Brackets, operators and symbols from real code snippets |
| Drill | A saved drill, or one generated from your weak keys |

Generated text can optionally include punctuation and numbers.

**Scoring**

- Net words per minute, based on correctly typed characters (5 characters = 1 word)
- Raw words per minute, before mistakes
- Accuracy, measured per keystroke including corrections
- Consistency, the inverse coefficient of variation of per-second speed
- Per-character hit and miss tallies, stored with every test

**Progress**

- Six summary tiles including a 10-test trend and a daily streak
- Speed-over-time chart with accuracy overlaid and a hover crosshair
- Keyboard accuracy heat map with the weakest keys outlined and listed
- 28-day practice activity strip
- Searchable, filterable, sortable test history with per-row and bulk delete

**Drills**

- Seven built-in drills (home row, top row, bottom row, numbers, symbols,
  capitals, common letter pairs)
- Create, edit, duplicate and delete your own drills with validation
- Built-ins are read-only but can be duplicated into editable copies

**Settings that actually change behaviour**

- Light, dark or system theme; three accent themes
- Reduce motion, independent of the OS setting
- Default mode, test length and word count
- Punctuation and numbers in generated text
- Stop on error (wrong keys are rejected until corrected)
- Hide live speed during a test
- Caret style: block, line or underline
- Text size: regular or large
- Synthesised keystroke click (generated with Web Audio, no audio files)
- Export a JSON backup, import one, or reset everything

## Behaviour worth knowing

- **Tab** loads fresh text without leaving focus mode. **Escape** resets the test and
  leaves focus mode. **Ctrl+Backspace** clears the current unfinished or incorrect word,
  but never erases a fully correct word.
  **Shift+Tab** moves focus out of the typing field.
- Pressing **space** mid-word skips the rest of it. Skipped characters are struck
  through and count as misses, so the shortcut is a trade-off rather than free.
- The clock **pauses** when the test loses focus, the window blurs, or the tab is
  hidden. Time away never counts against a score.
- Tests shorter than **3 seconds** or under **10 keystrokes** are scored and shown
  but not saved, so warm-ups do not skew your averages.
- Reported speed is capped at 400 wpm. Anything beyond that comes from a clock
  anomaly, not from typing.

## Technology

| Choice | Why |
| --- | --- |
| **Next.js 16** (App Router, Turbopack) | Already the project's framework. Pages are static shells; all state is client-side, so no server work is needed. |
| **Tailwind CSS 4** | Already configured. Used with a semantic token layer in `app/globals.css` rather than raw utility colours. |
| **Radix UI** (`radix-ui`) | Accessible unstyled primitives for dialog, alert dialog, dropdown, select, switch, toggle group and tooltip. Focus trapping, roving tabindex and ARIA wiring are solved; every pixel of styling is ours. |
| **lucide-react** | One consistent stroke-based icon set. |
| **zod** | Validates the drill form and, more importantly, the shape of data read back from local storage. |
| **clsx** + **tailwind-merge** | The `cn()` helper for conditional classes. |

**Deliberately not used:**

- *A chart library.* The two charts here are a line chart and a sparkline. Hand-written
  SVG is smaller, reads from the same design tokens as everything else, and gave
  exact control over the crosshair and the accuracy overlay.
- *An animation library.* All motion is CSS keyframes and transitions. A JavaScript
  animation library added a real failure mode: animation frames stop in a hidden
  tab, so anything whose removal was gated on an exit animation could stay in the
  DOM indefinitely. CSS also gets reduced-motion support for free.
- *A state management library.* One module-level store read through
  `useSyncExternalStore` was enough (see below).
- *A second component library.* Radix plus the local design system is the only
  design approach in the app.


### Architecture notes

**The engine is pure.** `lib/engine.ts` holds the typing rules as plain
functions over an immutable state object: `applyChar`, `applyBackspace`, `score`.
No React, no DOM. `components/type/use-typing-test.ts` wraps it with the clock,
the input listeners and the result plumbing.

**The store is a module, not a context.** Local storage cannot be read while
rendering on the server, and reading it in an effect means a render pass with
the wrong data. `lib/store.ts` keeps the document at module scope and exposes it
through `useSyncExternalStore`: the server snapshot is the defaults, and the
saved document swaps in the moment the first component subscribes. Actions are
plain exported functions, so there is no provider to thread through the tree.

**The typing surface writes to the DOM directly.** Caret position and line
scrolling are measurements, not state. `paint()` in `typing-surface.tsx` reads
the active character's offsets in a layout effect and sets the caret's transform
and the track's scroll offset imperatively. Combined with a memoised `Word`
component keyed on a compact per-character state string, a keystroke re-renders
one word instead of a 1,200 character paragraph.

## Setup

Requires Node.js 20.9 or newer.

```bash
npm install
```

```bash
npm run dev
```

## Design system

**Direction: "keycap industrial".** Warm paper surfaces, machined edges, ink
legends. Cards carry a hard bottom edge and an inset highlight so they read as
keycaps; the page sits on a faint dot grid.

**Colour.** Every colour is a semantic token in `app/globals.css`
(`--canvas`, `--surface`, `--ink`, `--ink-soft`, `--primary`, `--danger`,
`--type-pending`, `--chart-1`, and so on), exposed to Tailwind through
`@theme inline`. Components never use raw hex values. Light is a warm cream
palette, dark is a warm charcoal one designed separately rather than inverted.
Three accent themes swap the brand pair while status colours stay fixed, so
"error" never becomes ambiguous.

Muted text tones were measured against their real backgrounds and adjusted to
clear 4.5:1 in both themes.

**Typography.** Three faces, each with one job:

- **Bricolage Grotesque** for the wordmark, headings and large score readouts
- **Archivo** for UI and body text
- **JetBrains Mono** for the typing surface, numbers and key legends. Chosen for
  character disambiguation: telling `1`/`l`/`I` and `0`/`O` apart matters more
  here than anywhere else in the interface.

Numeric readouts use tabular figures so digits do not shuffle as they change.

**Spacing and radii.** A single spacing scale, with a squarer radius scale than
Tailwind's default (3/5/8/12/16px) to match the machined feel.

## Motion

All motion is CSS. Shared timings and one shared easing curve
(`--ease-key`) keep the app feeling like one machine. Motion is used for
purposeful moments only: panel reveals, the results panel rising in, toasts
popping in, caret movement, hover and press feedback, and the pressed-key travel
on buttons.

**Reduced motion** is honoured two ways, and both collapse every animation and
transition to effectively zero, stop the caret blinking and stop the loading
shimmer:

1. the `prefers-reduced-motion: reduce` media query
2. the in-app **Reduce motion** setting, for people who want calm UI without
   changing their OS

## Accessibility

- Semantic landmarks, a skip link, and one `h1` per page
- Radix primitives handle focus trapping in dialogs, roving tabindex in
  segmented controls, and ARIA wiring for menus and selects
- A visible 2px focus ring with a 2px offset on every focusable element
- Destructive actions route through a confirmation dialog with focus on Cancel
- Form fields are label-linked, with `aria-invalid` and `aria-describedby`
  pointing at field-level error text; input is preserved on a failed submit
- Sortable table headers expose `aria-sort`
- State is never colour-only: skipped characters are struck through as well as
  tinted, and every heat-map key shows its accuracy as a number
- The hidden typing input is labelled and described by the full target text, so
  the text to type is readable by a screen reader
- Comfortable touch targets, and a bottom tab bar on phones
