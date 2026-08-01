/**
 * Bundled practice content. Original drills live alongside clearly attributed
 * public-domain book sentences, so generating a test never needs the network.
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

const NUMBER_SENTENCES = [
  "At 7 in the morning, the station clock rang twice before the first train arrived.",
  "She counted 12 candles on the table, but only 3 of them were still burning.",
  "The old map placed the river 42 miles north of the town and 8 miles beyond the bridge.",
  "By page 108, the mystery had introduced 5 suspects and removed every easy answer.",
  "The captain waited 60 seconds, checked the compass again, and ordered the crew forward.",
  "Room 2049 stood at the end of a quiet hall on the 20th floor.",
];

/**
 * Complete sentences from public-domain books. Punctuation mode draws from
 * these instead of decorating unrelated words, so the text has grammar,
 * cadence, and phrases a reader can anticipate.
 */
export const CLASSIC_PASSAGES: { source: string; sentences: string[] }[] = [
  {
    source: "Pride and Prejudice, Jane Austen",
    sentences: [
      "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
      "However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.",
    ],
  },
  {
    source: "Alice's Adventures in Wonderland, Lewis Carroll",
    sentences: [
      "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.",
      "Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.",
      "And what is the use of a book, thought Alice, without pictures or conversations?",
    ],
  },
  {
    source: "Moby-Dick, Herman Melville",
    sentences: [
      "Call me Ishmael.",
      "Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.",
    ],
  },
  {
    source: "A Tale of Two Cities, Charles Dickens",
    sentences: [
      "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.",
      "It was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness.",
      "We had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way.",
    ],
  },
  {
    source: "Jane Eyre, Charlotte Bronte",
    sentences: [
      "There was no possibility of taking a walk that day.",
      "We had been wandering, indeed, in the leafless shrubbery an hour in the morning.",
      "Since dinner the cold winter wind had brought with it clouds so sombre, and a rain so penetrating, that further outdoor exercise was now out of the question.",
    ],
  },
  {
    source: "Frankenstein, Mary Shelley",
    sentences: [
      "It was on a dreary night of November that I beheld the accomplishment of my toils.",
      "With an anxiety that almost amounted to agony, I collected the instruments of life around me.",
      "I might infuse a spark of being into the lifeless thing that lay at my feet.",
    ],
  },
  {
    source: "The Time Machine, H. G. Wells",
    sentences: [
      "The Time Traveller, for so it will be convenient to speak of him, was expounding a recondite matter to us.",
      "His grey eyes shone and twinkled, and his usually pale face was flushed and animated.",
      "The fire burned brightly, and the soft radiance of the incandescent lights caught the bubbles that flashed and passed in our glasses.",
    ],
  },
  {
    source: "The Secret Garden, Frances Hodgson Burnett",
    sentences: [
      "When Mary Lennox was sent to Misselthwaite Manor to live with her uncle everybody said she was the most disagreeable-looking child ever seen.",
      "It was true, too.",
      "She had a little thin face and a little thin body, thin light hair and a sour expression.",
    ],
  },
  {
    source: "The Wind in the Willows, Kenneth Grahame",
    sentences: [
      "The Mole had been working very hard all the morning, spring-cleaning his little home.",
      "First with brooms, then with dusters; then on ladders and steps and chairs, with a brush and a pail of whitewash.",
      "He had dust in his throat and eyes, splashes of whitewash all over his black fur, and an aching back and weary arms.",
    ],
  },
  {
    source: "Peter Pan, J. M. Barrie",
    sentences: [
      "All children, except one, grow up.",
      "They soon know that they will grow up, and the way Wendy knew was this.",
      "One day when she was two years old she was playing in a garden, and she plucked another flower and ran with it to her mother.",
    ],
  },
  {
    source: "The Wonderful Wizard of Oz, L. Frank Baum",
    sentences: [
      "Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer's wife.",
      "When Dorothy stood in the doorway and looked around, she could see nothing but the great gray prairie on every side.",
      "Not a tree nor a house broke the broad sweep of flat country that reached to the edge of the sky.",
    ],
  },
  {
    source: "The Adventures of Sherlock Holmes, Arthur Conan Doyle",
    sentences: [
      "To Sherlock Holmes she is always the woman.",
      "I have seldom heard him mention her under any other name.",
      "In his eyes she eclipses and predominates the whole of her sex.",
    ],
  },
];

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

export interface GeneratedPassage {
  text: string;
  /** Attribution for sentence-based passages. */
  source?: string;
}

interface SourcedSentence {
  text: string;
  source: string;
  words: number;
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function shuffle<T>(values: readonly T[]): T[] {
  const out = values.slice();
  for (let index = out.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}

const CLASSIC_SENTENCES: SourcedSentence[] = CLASSIC_PASSAGES.flatMap((passage) =>
  passage.sentences.map((text) => ({
    text,
    source: passage.source,
    words: countWords(text),
  })),
);

/**
 * Builds complete, attributable sentences until the requested length is met.
 * The final sentence may take the text a little past the target. That is
 * preferable to chopping a sentence in half just to preserve an exact number.
 */
export function generateLiteraryPassage(
  minimumWords: number,
  numbers = false,
): GeneratedPassage {
  const pool = shuffle(CLASSIC_SENTENCES);
  const selected: SourcedSentence[] = [];
  const sources = new Set<string>();
  let total = 0;
  let cursor = 0;

  while (total < minimumWords) {
    const remaining = minimumWords - total;
    const unused = pool.slice(cursor);
    const ranked = unused
      .map((sentence) => ({ sentence, distance: Math.abs(sentence.words - remaining) }))
      .sort((a, b) => a.distance - b.distance || a.sentence.words - b.sentence.words);
    const window = ranked.slice(0, Math.min(4, ranked.length));
    const chosen = pick(window).sentence;
    const chosenIndex = pool.indexOf(chosen, cursor);

    [pool[cursor], pool[chosenIndex]] = [pool[chosenIndex], pool[cursor]];
    cursor++;
    selected.push(chosen);
    sources.add(chosen.source);
    total += chosen.words;

    if (numbers && selected.length % 3 === 0 && total < minimumWords) {
      const numberText = pick(NUMBER_SENTENCES);
      selected.push({
        text: numberText,
        source: "Klack number passages",
        words: countWords(numberText),
      });
      total += countWords(numberText);
    }

    if (cursor >= pool.length && total < minimumWords) {
      pool.splice(0, pool.length, ...shuffle(CLASSIC_SENTENCES));
      cursor = 0;
    }
  }

  const sourceList = [...sources];
  const source =
    sourceList.length === 1
      ? sourceList[0]
      : sourceList.length === 2
        ? sourceList.join(" + ")
        : `Public-domain classics (${sourceList.length} works)`;

  return {
    text: selected.map((sentence) => sentence.text).join(" "),
    source,
  };
}

function generateLooseWords(count: number, numbers: boolean): string {
  const words: string[] = [];

  for (let i = 0; i < count; i++) {
    words.push(numbers && Math.random() < 0.08 ? pick(NUMBER_TOKENS) : pick(COMMON_WORDS));
  }

  return words.join(" ");
}

/**
 * Generates either clean word practice or complete literary sentences.
 * Punctuation mode intentionally changes the content source rather than
 * sprinkling punctuation onto random words.
 */
export function generateWordPassage(options: WordTextOptions): GeneratedPassage {
  if (options.punctuation) {
    return generateLiteraryPassage(options.count, options.numbers);
  }
  return { text: generateLooseWords(options.count, options.numbers) };
}

export function generateWordText(options: WordTextOptions): string {
  return generateWordPassage(options).text;
}

/** A long stream for timed tests, including fast 120-second attempts. */
export function generateTimedPassage(
  opts: Omit<WordTextOptions, "count">,
): GeneratedPassage {
  return generateWordPassage({ ...opts, count: 520 });
}

export function generateTimedText(opts: Omit<WordTextOptions, "count">): string {
  return generateTimedPassage(opts).text;
}

export function randomProse() {
  return pick(PROSE_PASSAGES);
}

export function randomCode() {
  return pick(CODE_SNIPPETS);
}
