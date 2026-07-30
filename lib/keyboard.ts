/**
 * A physical US-QWERTY layout used by the accuracy heatmap. Each typing key
 * lists every character it can produce so that `A`/`a` and `!`/`1` roll up to
 * the finger movement that actually caused the miss.
 *
 * Rows are laid out on a 60-column grid. Modifier keys are included as inert
 * "ghosts" purely so the diagram reads as a keyboard rather than a word grid.
 */

export interface KeyDef {
  id: string;
  label: string;
  shiftLabel?: string;
  chars: string[];
  /** Grid columns out of 60. */
  span: number;
  ghost?: boolean;
}

const KEY = 4;

function letter(char: string, span = KEY): KeyDef {
  return { id: char, label: char.toUpperCase(), chars: [char, char.toUpperCase()], span };
}

function pair(id: string, label: string, shiftLabel: string, span = KEY): KeyDef {
  return { id, label, shiftLabel, chars: [label, shiftLabel], span };
}

function ghost(label: string, span: number): KeyDef {
  return { id: `ghost-${label}`, label, chars: [], span, ghost: true };
}

export const KEYBOARD_ROWS: KeyDef[][] = [
  [
    pair("grave", "`", "~"),
    pair("1", "1", "!"),
    pair("2", "2", "@"),
    pair("3", "3", "#"),
    pair("4", "4", "$"),
    pair("5", "5", "%"),
    pair("6", "6", "^"),
    pair("7", "7", "&"),
    pair("8", "8", "*"),
    pair("9", "9", "("),
    pair("0", "0", ")"),
    pair("minus", "-", "_"),
    pair("equal", "=", "+"),
    ghost("delete", 8),
  ],
  [
    ghost("tab", 8),
    ...["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"].map((c) => letter(c)),
    pair("lbracket", "[", "{"),
    pair("rbracket", "]", "}"),
    pair("backslash", "\\", "|"),
  ],
  [
    ghost("caps", 9),
    ...["a", "s", "d", "f", "g", "h", "j", "k", "l"].map((c) => letter(c)),
    pair("semicolon", ";", ":"),
    pair("quote", "'", '"'),
    ghost("enter", 7),
  ],
  [
    ghost("shift", 11),
    ...["z", "x", "c", "v", "b", "n", "m"].map((c) => letter(c)),
    pair("comma", ",", "<"),
    pair("period", ".", ">"),
    pair("slash", "/", "?"),
    ghost("shift", 9),
  ],
  [
    ghost("ctrl", 6),
    ghost("alt", 5),
    { id: "space", label: "space", chars: [" "], span: 36 },
    ghost("alt", 5),
    ghost("ctrl", 8),
  ],
];

/** Only the keys that produce characters, i.e. the ones we can score. */
export const ALL_KEYS: KeyDef[] = KEYBOARD_ROWS.flat().filter((key) => !key.ghost);

/** Human-friendly name for a character, for tooltips and screen readers. */
export function charName(char: string): string {
  if (char === " ") return "space";
  if (char === "\n") return "enter";
  if (char === "\t") return "tab";
  return char;
}
