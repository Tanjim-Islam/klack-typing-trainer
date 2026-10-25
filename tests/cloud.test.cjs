const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fetchAccountData, pushResults } = require("../lib/cloud.ts");
const training = {
  source: "test",
  drillId: "drill-1",
  benchmark: {
    punctuation: true,
    numbers: false,
    stopOnError: false,
    textId: "3-abc",
  },
  missedWords: [{ word: "This:", misses: 1 }],
  pairStats: { Th: { h: 4, m: 1 } },
};
const row = {
  client_id: "result-1",
  taken_at: new Date().toISOString(),
  mode: "drill",
  label: "Symbols",
  elapsed_ms: 10000,
  wpm: "60",
  raw_wpm: "62",
  accuracy: "96",
  consistency: 80,
  correct_chars: 50,
  incorrect_chars: 2,
  keystrokes: 52,
  correct_keystrokes: 50,
  words: 10,
  samples: [],
  performance_samples: {},
  training_details: training,
  result_key_stats: [{ char: "T", hits: 4, misses: 1 }],
};
function database(mode = "current") {
  const calls = [];
  const client = {
    from(table) {
      let columns;
      const builder = {
        select(value) {
          columns = value;
          return builder;
        },
        order() {
          return builder;
        },
        maybeSingle() {
          return Promise.resolve({ data: null, error: null });
        },
        limit() {
          return builder;
        },
        then(resolve, reject) {
          calls.push({ table, columns });
          if (table !== "test_results")
            return Promise.resolve({ data: [], error: null }).then(
              resolve,
              reject,
            );
          if (mode !== "current" && columns.includes("training_details"))
            return Promise.resolve({
              data: null,
              error: { message: "column training_details does not exist" },
            }).then(resolve, reject);
          if (mode === "oldest" && columns.includes("performance_samples"))
            return Promise.resolve({
              data: null,
              error: { message: "column performance_samples does not exist" },
            }).then(resolve, reject);
          const value = { ...row };
          if (mode !== "current") delete value.training_details;
          if (mode === "oldest") delete value.performance_samples;
          if (mode === "invalid")
            value.training_details = { ...training, source: "bad" };
          return Promise.resolve({ data: [value], error: null }).then(
            resolve,
            reject,
          );
        },
      };
      return builder;
    },
    async rpc(name, payload) {
      calls.push({ name, payload });
      return { error: null };
    },
  };
  return { client, calls };
}
test("cloud reads validate and preserve training details and exact key casing", async () => {
  const db = database();
  const data = await fetchAccountData(db.client);
  assert.deepEqual(data.results[0].training, training);
  assert.deepEqual(data.results[0].keyStats.T, { h: 4, m: 1 });
});
test("cloud writes include metadata in the same atomic result RPC", async () => {
  const db = database();
  const data = await fetchAccountData(db.client);
  await pushResults(db.client, data.results);
  const write = db.calls.find((c) => c.name === "save_test_results");
  assert.deepEqual(write.payload.p_results[0].training, training);
});
test("pre-migration servers keep history usable without guessing missing settings", async () => {
  for (const version of ["legacy", "oldest"]) {
    const db = database(version);
    const data = await fetchAccountData(db.client);
    assert.equal(data.results.length, 1);
    assert.equal(data.results[0].training, undefined);
    assert.equal(
      db.calls.filter((call) => call.table === "test_results").length,
      version === "legacy" ? 2 : 3,
    );
  }
});
test("malformed remote training is rejected at the validation boundary", async () => {
  const db = database("invalid");
  const data = await fetchAccountData(db.client);
  assert.equal(data.results.length, 0);
});
