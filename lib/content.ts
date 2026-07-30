/**
 * Bundled practice content. All prose and code samples are written for Klack,
 * so nothing here depends on a network request or a third-party licence.
 */

/** ~240 high-frequency English words, 2-9 letters. The backbone of word tests. */
export const COMMON_WORDS = [
  "the","and","for","are","but","not","you","all","any","can","had","her","was","one","our","out",
  "day","get","has","him","his","how","man","new","now","old","see","two","way","who","boy","did",
  "its","let","put","say","she","too","use","time","work","word","make","made","many","most","move",
  "much","must","name","need","next","only","open","over","part","play","point","right","said","same",
  "some","take","tell","than","that","them","then","there","these","they","thing","think","this","those",
  "three","through","under","water","where","which","while","white","whole","world","would","write","year",
  "about","above","after","again","air","also","back","because","been","before","being","below","best",
  "between","both","bring","build","call","came","carry","change","city","close","come","could","country",
  "cover","cross","cut","dark","does","done","door","down","draw","drive","each","early","earth","eight",
  "end","enough","even","ever","every","eyes","face","fact","fall","family","far","fast","feel","field",
  "find","fire","first","five","food","foot","form","found","four","free","from","front","full","give",
  "goes","gone","good","great","green","group","grow","half","hand","hard","have","head","hear","heart",
  "held","help","here","high","hold","home","hope","horse","hour","house","idea","inside","into","keep",
  "kind","knew","know","land","large","last","late","learn","least","leave","left","less","life","light",
  "like","line","list","little","live","local","long","look","lost","love","main","mark","matter","mean",
  "mind","miss","money","month","morning","mother","mountain","music","near","never","night","north","note",
  "nothing","number","often","once","order","other","paper","pass","past","people","perhaps","person",
  "picture","place","plan","plant","please","power","press","price","quick","quiet","raise","reach",
  "read","ready","real","reason","record","remember","rest","return","river","road","rock","room","round",
  "run","school","sea","season","second","seem","sense","serve","seven","several","shape","share","short",
  "should","show","side","simple","since","sing","sit","six","size","sky","sleep","slow","small","smile",
  "snow","soft","sound","south","space","speak","special","spring","stand","star","start","state","stay",
  "step","still","stone","stop","store","story","street","strong","study","such","summer","sure","table",
  "talk","teach","team","ten","thank","their","thought","today","together","told","took","top","toward",
  "town","tree","true","try","turn","until","upon","voice","wait","walk","wall","want","warm","watch",
  "week","well","went","were","what","wheel","when","white","whose","wide","wife","will","wind","window",
  "winter","wish","with","within","without","woman","wonder","wood","write","wrong","yard","yes","yet","young",
].filter((w) => /^[a-z]+$/.test(w));

const NUMBER_TOKENS = [
  "7", "12", "42", "108", "365", "1024", "2049", "3.14", "60", "99", "1500", "80",
];

const SENTENCE_ENDS = [".", ".", ".", "!", "?"];
const MID_MARKS = [",", ",", ";", ":", "-"];

/** Original prose passages: real sentences with capitals and punctuation. */
export const PROSE_PASSAGES: { text: string; source: string }[] = [
  {
    text: "A keyboard is the shortest distance between a thought and a thing that exists. The faster you cross it, the less of the thought you lose on the way.",
    source: "On writing quickly",
  },
  {
    text: "Speed is a side effect of accuracy. Nobody types fast by hurrying; they type fast by making fewer trips backwards.",
    source: "Practice notes",
  },
  {
    text: "The hardest keys are never the ones you expect. It is rarely the letter itself, but the reach between two letters that slows the whole hand down.",
    source: "Practice notes",
  },
  {
    text: "Learn the shape of a word and your fingers will find it without asking. Learn only the letters and you will spell it out forever, one small hesitation at a time.",
    source: "On muscle memory",
  },
  {
    text: "Work in short sessions. Ten focused minutes will teach your hands more than an hour of tired repetition, and it leaves you wanting to come back tomorrow.",
    source: "Practice notes",
  },
  {
    text: "Every craft has a moment where the tool disappears. The carpenter stops seeing the chisel, the driver stops seeing the wheel, and the writer stops seeing the keys.",
    source: "On tools",
  },
  {
    text: "There is a quiet pleasure in a clean line of text appearing exactly as fast as you imagined it. Chase that feeling and the numbers will follow on their own.",
    source: "On flow",
  },
  {
    text: "Rest your wrists, not your attention. Soft hands, straight back, and eyes on the words ahead rather than the ones already behind you.",
    source: "Posture",
  },
  {
    text: "When a word goes wrong, finish the thought before you fix the letter. Stopping to repair every small mistake breaks the rhythm that makes you quick.",
    source: "Practice notes",
  },
  {
    text: "The best practice text is slightly harder than you are comfortable with, and slightly easier than you are afraid of.",
    source: "On difficulty",
  },
];

/** Original code samples chosen to exercise brackets, operators and symbols. */
export const CODE_SNIPPETS: { text: string; language: string }[] = [
  {
    language: "TypeScript",
    text: `const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);`,
  },
  {
    language: "TypeScript",
    text: `type Result<T> = { ok: true; value: T } | { ok: false; error: string };`,
  },
  {
    language: "JavaScript",
    text: `for (let i = 0; i < rows.length; i++) { if (!rows[i].active) continue; render(rows[i]); }`,
  },
  {
    language: "JavaScript",
    text: `const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");`,
  },
  {
    language: "Python",
    text: `def mean(xs): return sum(xs) / len(xs) if xs else 0.0`,
  },
  {
    language: "Python",
    text: `keys = {k: v for k, v in stats.items() if v["misses"] > 0}`,
  },
  {
    language: "CSS",
    text: `.card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgb(0 0 0 / 0.18); }`,
  },
  {
    language: "Shell",
    text: `git log --oneline -n 20 | grep -i "fix" | awk '{ print $1 }' > hashes.txt`,
  },
  {
    language: "SQL",
    text: `SELECT day, AVG(wpm) FROM tests WHERE mode = 'time' GROUP BY day ORDER BY day DESC;`,
  },
];

/** Seeded drills. Read-only, but every one can be duplicated and edited. */
export const BUILT_IN_DRILLS: {
  id: string;
  name: string;
  description: string;
  text: string;
}[] = [
  {
    id: "builtin-home-row",
    name: "Home row anchors",
    description: "Rebuild the eight resting positions your hands return to.",
    text: "asdf jkl asdf jkl sad lads fall flask salad ask dad half salsa alfalfa all fads dial flask lads a sad dad falls half a salad ask all lads flask dials",
  },
  {
    id: "builtin-top-row",
    name: "Top row reach",
    description: "Stretch upward without letting the wrists lift off.",
    text: "quite type were pour tree quiet weary poetry tower report proper puppet require utter twenty typewriter powerful pottery quietly ripe wire quote tutor uproot",
  },
  {
    id: "builtin-bottom-row",
    name: "Bottom row curl",
    description: "The row most people fumble: curl the fingers, keep them light.",
    text: "vacant number combine maximize buzz civic mixing became zebra vacuum canvas bonsai crunch invoice back nimble maze convex zinc vanish mob cabin exam vex",
  },
  {
    id: "builtin-numbers",
    name: "Number row",
    description: "Digits, dates and quantities without looking down.",
    text: "12 units at 4.50 each on 2024-08-19 order 7781 invoice 30294 total 1024 rows 365 days 60 seconds 99 percent 3.14159 radius 42 degrees 108 pages 1500 words",
  },
  {
    id: "builtin-symbols",
    name: "Symbols and brackets",
    description: "The punctuation that slows programmers down the most.",
    text: "{ } [ ] ( ) < > => !== === && || ?? ?. ... #hash @user *star* _under_ ~tilde~ /slash/ |pipe| +plus+ %mod% ^caret^ & $dollar 'quote' \"double\"",
  },
  {
    name: "Capitals and commas",
    id: "builtin-capitals",
    description: "Shift keys, sentence starts and mid-sentence pauses.",
    text: "Monday, Tuesday and Wednesday. New York, London, Berlin; then Tokyo. Dr. Adams called, but Ms. Reyes had already left. Yes, of course: the North Sea, the Pacific, the Nile.",
  },
  {
    id: "builtin-bigrams",
    name: "Common pairs",
    description: "The twelve letter pairs that make up a third of English.",
    text: "the she her his that this then them there their other another under after over their thing think through where when what which while would could should",
  },
];

/* -------------------------------------------------------------------------- */
/* Text generation                                                            */
/* -------------------------------------------------------------------------- */

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export type WordTextOptions = {
  count: number;
  punctuation: boolean;
  numbers: boolean;
};

/**
 * Builds a word-list practice string. Punctuation and numbers are woven in
 * rather than appended, so the harder characters land mid-flow where they
 * actually trip people up.
 */
export function generateWordText({ count, punctuation, numbers }: WordTextOptions): string {
  const words: string[] = [];
  let sentenceStart = true;

  for (let i = 0; i < count; i++) {
    let word = numbers && Math.random() < 0.08 ? pick(NUMBER_TOKENS) : pick(COMMON_WORDS);

    if (punctuation) {
      if (sentenceStart && /^[a-z]/.test(word)) {
        word = word[0].toUpperCase() + word.slice(1);
      }
      sentenceStart = false;

      const isLast = i === count - 1;
      const roll = Math.random();
      if (isLast) {
        word += ".";
      } else if (roll < 0.1) {
        word += pick(SENTENCE_ENDS);
        sentenceStart = true;
      } else if (roll < 0.2) {
        word += pick(MID_MARKS);
      } else if (roll < 0.23) {
        word = `"${word}"`;
      } else if (roll < 0.26) {
        word = `(${word})`;
      }
    }

    words.push(word);
  }

  return words.join(" ");
}

/** A long stream for timed tests, generous enough that nobody runs out. */
export function generateTimedText(opts: Omit<WordTextOptions, "count">): string {
  return generateWordText({ ...opts, count: 220 });
}

export function randomProse() {
  return pick(PROSE_PASSAGES);
}

export function randomCode() {
  return pick(CODE_SNIPPETS);
}
