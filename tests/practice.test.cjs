const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createEngine,
  applyChar,
  applyBackspace,
  buildResult,
} = require("../lib/engine.ts");
const { resultSchema, trainingSchema } = require("../lib/types.ts");
const {
  repairConfig,
  practiceTargets,
  practiceText,
  trainingFor,
  textId,
  benchmarkKey,
  comparableResults,
  dailyStatus,
  dailyConfig,
} = require("../lib/practice.ts");
const {
  defaultStore,
  exportStore,
  importStore,
  saveStore,
  loadStore,
} = require("../lib/storage.ts");
const { acceptsRaceStart, raceStartSchema } = require("../lib/race.ts");

const type = (state, chars, stopOnError = false) =>
  [...chars].reduce((s, c) => applyChar(s, c, { stopOnError }), state);
const config = {
  mode: "time",
  seconds: 30,
  punctuation: false,
  numbers: false,
};
function result(overrides = {}) {
  return resultSchema.parse({
    id: "r1",
    at: Date.now(),
    mode: "time",
    label: "30s",
    elapsedMs: 30000,
    wpm: 60,
    rawWpm: 62,
    accuracy: 97,
    consistency: 80,
    correctChars: 150,
    incorrectChars: 2,
    keystrokes: 152,
    correctKeystrokes: 150,
    words: 30,
    keyStats: {},
    samples: [],
    training: {
      ...trainingFor(config, "this is the text", false),
      missedWords: [],
      pairStats: {},
    },
    ...overrides,
  });
}
function built(state) {
  return buildResult({
    id: "engine",
    mode: "words",
    label: "Test",
    at: Date.now(),
    state,
    elapsedMs: 6000,
    samples: [],
    training: trainingFor(
      { mode: "words", count: 10, punctuation: true, numbers: false },
      state.target,
      false,
    ),
  });
}

test("repair remembers an incorrect word even after backspace fixes it", () => {
  let state = type(createEngine("the then other"), "tx");
  state = applyBackspace(state, false);
  state = type(state, "he then other");
  const r = built(state);
  assert.equal(r.incorrectChars, 0);
  assert.deepEqual(r.training.missedWords, [{ word: "the", misses: 1 }]);
  assert.match(repairConfig(r).text, /\bthe\b/);
  assert.equal(r.keyStats.h.m, 1);
});
test("rejected errors, skipped words and a missing space stay in the repair record", () => {
  const rejected = type(createEngine("This: then"), "xh", true);
  assert.equal(built(rejected).training.missedWords[0].word, "This:");
  const skipped = type(createEngine("the other"), " ");
  assert.deepEqual(built(skipped).training.missedWords, [
    { word: "the", misses: 3 },
  ]);
  assert.equal(
    built(type(createEngine("a b"), "axb")).training.missedWords[0].word,
    "a",
  );
});
test("a clean result offers no repair", () =>
  assert.equal(
    repairConfig(built(type(createEngine("the then"), "the then"))),
    null,
  ));
test("pair accuracy is separate from single-key accuracy", () => {
  const r = built(type(createEngine("that then"), "txat then"));
  assert.deepEqual(r.training.pairStats.th, { h: 1, m: 1 });
  assert.equal(r.training.pairStats.ha.m, 1);
  assert.equal(r.training.pairStats["t "], undefined);
});
test("backspacing a correct word boundary preserves the completed word", () => {
  const state = type(createEngine("the then"), "the ");
  assert.equal(applyBackspace(state, true).cursor, 4);
});
test("weak capitals, colons and pairs never collapse onto their base keys", () => {
  const r = result({
    keyStats: {
      A: { h: 5, m: 5 },
      a: { h: 80, m: 0 },
      ":": { h: 5, m: 5 },
      ";": { h: 80, m: 0 },
    },
  });
  r.training.pairStats.th = { h: 4, m: 4 };
  const tokens = practiceTargets([r]).map((t) => t.token);
  assert.deepEqual(new Set(tokens), new Set(["A", ":", "th"]));
  const text = practiceText(tokens);
  assert.match(text, /A/);
  assert.match(text, /:/);
  assert.match(text, /th/);
});
test("recent improvement retires a target and old history cannot keep it alive", () => {
  const older = result({ at: 1000, keyStats: { a: { h: 10, m: 90 } } });
  const fresh = result({ at: 2000, keyStats: { a: { h: 40, m: 0 } } });
  assert.equal(practiceTargets([older]).length, 1);
  assert.equal(practiceTargets([older, fresh]).length, 0);
});
test("small samples are not prescribed as weaknesses", () =>
  assert.equal(
    practiceTargets([result({ keyStats: { q: { h: 0, m: 1 } } })]).length,
    0,
  ));
test("comparison separates duration, count, punctuation, numbers and error settings", () => {
  const r = result();
  for (const patch of [
    { seconds: 60 },
    { punctuation: true },
    { numbers: true },
    { stopOnError: true },
  ]) {
    const other = result();
    Object.assign(other.training.benchmark, patch);
    assert.notEqual(benchmarkKey(other), benchmarkKey(r));
  }
  assert.equal(
    comparableResults(r, [r, result({ training: undefined })]).length,
    1,
  );
  assert.equal(benchmarkKey(result({ training: undefined })), null);
});
test("races are separate, daily baseline and re-test match normal timed practice", () => {
  const r = result();
  const daily = result();
  daily.training.source = "daily";
  const race = result();
  race.training.source = "race";
  assert.equal(benchmarkKey(daily), benchmarkKey(r));
  assert.notEqual(benchmarkKey(race), benchmarkKey(r));
});
test("saved drill rename keeps history, editing text starts a separate comparison", () => {
  const drill = {
    mode: "drill",
    id: "saved-1",
    name: "Before",
    text: "the then other words",
  };
  const r = result({
    mode: "drill",
    training: trainingFor(drill, drill.text, false),
  });
  const renamed = result({
    mode: "drill",
    training: trainingFor({ ...drill, name: "After" }, drill.text, false),
  });
  const edited = result({
    mode: "drill",
    training: trainingFor(drill, "different words here", false),
  });
  assert.equal(r.training.drillId, "saved-1");
  assert.equal(benchmarkKey(r), benchmarkKey(renamed));
  assert.notEqual(benchmarkKey(r), benchmarkKey(edited));
  assert.notEqual(textId("abc"), textId("abd"));
});
test("daily progress resumes, counts each full round once, ignores partial rounds", () => {
  const now = new Date(2026, 9, 25, 12).getTime();
  const day = dailyStatus([], now).day;
  const round = (step, elapsedMs = 60000) =>
    result({
      elapsedMs,
      training: { ...trainingFor(dailyConfig([], step, day), "text", false) },
    });
  assert.equal(
    dailyStatus([round(1), round(1), round(2, 5000)], now).nextStep,
    2,
  );
  assert.equal(
    dailyStatus([round(1), round(2), round(3), round(4), round(5)], now).done,
    true,
  );
  assert.equal(dailyStatus([round(1)], now + 86400000).completed, 0);
});
test("daily target rounds have a full minute of text and use mistakes from preceding rounds", () => {
  const r = result({ keyStats: { ":": { h: 5, m: 10 } } });
  for (const step of [2, 3, 4]) {
    const round = dailyConfig([r], step, "2026-10-25");
    assert.equal(round.seconds, 60);
    assert.ok(round.text.length >= 4000);
    if (step === 2) assert.match(round.text, /:/);
  }
});
test("new training details and older results survive export/import and isolated account caches", () => {
  const data = defaultStore();
  data.results = [
    result({ at: 2000 }),
    result({ id: "old", at: 1000, training: undefined }),
  ];
  const parsed = importStore(exportStore(data));
  assert.equal(parsed.ok, true);
  assert.deepEqual(
    parsed.data.results,
    JSON.parse(JSON.stringify(data.results)),
  );
  const memory = new Map();
  global.window = {
    localStorage: {
      setItem: (k, v) => memory.set(k, v),
      getItem: (k) => memory.get(k) ?? null,
    },
  };
  saveStore(data, "account-a");
  saveStore(defaultStore(), "account-b");
  assert.equal(loadStore("account-a").data.results.length, 2);
  assert.equal(loadStore("account-b").data.results.length, 0);
  assert.equal(loadStore(null).data.results.length, 0);
  delete global.window;
});
test("training validation rejects invalid daily steps, settings and oversized pair keys", () => {
  const t = result().training;
  assert.equal(
    trainingSchema.safeParse({ ...t, daily: { day: "bad", step: 6 } }).success,
    false,
  );
  assert.equal(
    trainingSchema.safeParse({ ...t, pairStats: { abc: { h: 1, m: 0 } } })
      .success,
    false,
  );
  assert.equal(
    trainingSchema.safeParse({
      ...t,
      benchmark: { ...t.benchmark, seconds: -1 },
    }).success,
    false,
  );
});

const raceConfig = {
  version: 1,
  code: "ABCDEFGH",
  hostId: "host",
  duration: 30,
  content: "words",
  text: "the then other words and more",
  createdAt: 1,
};
const presence = {
  playerId: "guest",
  name: "Guest",
  role: "guest",
  joinedAt: 1,
  ready: true,
  status: "lobby",
  raceId: null,
};
const start = (patch = {}) =>
  raceStartSchema.parse({
    version: 1,
    raceId: "round-1",
    playerIds: ["host", "guest"],
    countdownMs: 3000,
    config: raceConfig,
    ...patch,
  });
test("first race requires both expected participants and local readiness", () => {
  assert.equal(acceptsRaceStart(start(), presence, null, "host"), true);
  assert.equal(
    acceptsRaceStart(start(), { ...presence, ready: false }, null, "host"),
    false,
  );
  assert.equal(
    acceptsRaceStart(
      start({ playerIds: ["host", "stranger"] }),
      presence,
      null,
      "host",
    ),
    false,
  );
});
test("rematches reject duplicate starts, old rounds and cancelled readiness", () => {
  const finished = { ...presence, status: "finished", raceId: "round-1" };
  const next = start({ raceId: "round-2", previousRaceId: "round-1" });
  assert.equal(acceptsRaceStart(next, finished, "round-1", "host"), true);
  assert.equal(acceptsRaceStart(start(), finished, "round-1", "host"), false);
  assert.equal(
    acceptsRaceStart(next, { ...finished, ready: false }, "round-1", "host"),
    false,
  );
  assert.equal(acceptsRaceStart(next, finished, "round-2", "host"), false);
});
