async (page) => {
  const baseURL = new URL(page.url()).origin;
  await page.goto(`${baseURL}/`);
  await page.getByRole('textbox', { name: 'Typing test input', exact: true }).waitFor({ state: 'attached' });
  const intro = page.getByRole('button', { name: 'Dismiss the introduction' });
  if (await intro.count()) await intro.click();
  const fixture = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('klack.v1'));
    const now = Date.now();
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const pairStats = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [letters[Math.floor(i / 26)] + letters[i % 26], { h: 18, m: 2 }]));
    const series = { elapsedMs: Array.from({ length: 120 }, (_, i) => (i + 1) * 1000), wpm: Array(120).fill(70.1), rawWpm: Array(120).fill(74.2), burst: Array(120).fill(71.3), errors: Array(120).fill(1) };
    data.results = Array.from({ length: 500 }, (_, i) => ({ id: `load-fixture-${i}`, at: now - i * 180000, mode: 'time', label: '120s', elapsedMs: 120000, wpm: 70, rawWpm: 74, accuracy: 95, consistency: 82, correctChars: 700, incorrectChars: 40, keystrokes: 740, correctKeystrokes: 700, words: 140, samples: Array(120).fill(70.1), performance: series, keyStats: { A: { h: 8, m: 2 }, ':': { h: 8, m: 2 } }, training: { source: 'test', benchmark: { seconds: 120, punctuation: false, numbers: false, stopOnError: false }, pairStats, missedWords: Array.from({ length: 20 }, () => ({ word: 'keyboard', misses: 2 })) } }));
    const serialized = JSON.stringify(data);
    localStorage.setItem('klack.v1', serialized);
    return { bytes: new Blob([serialized]).size, tests: data.results.length };
  });
  await page.reload();
  await page.getByRole('radio', { name: 'Words', exact: true }).click();
  await page.getByRole('radio', { name: '10', exact: true }).click();
  const target = (await page.locator('#typing-target').textContent()).split('Text to type: ')[1].trim();
  await page.keyboard.type(target[0]);
  await page.waitForTimeout(3100);
  await page.keyboard.type(target.slice(1));
  await page.getByRole('button', { name: 'Next test', exact: false }).waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('klack.v1')));
  if (saved.results[0].id.startsWith('load-fixture')) throw new Error('Newest result failed to save with a full history');
  if (saved.results.length !== 500) throw new Error('History exceeded the retention limit');
  await page.getByRole('textbox', { name: 'Typing test input' }).focus();
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  if (!await page.getByRole('textbox', { name: 'Typing test input' }).evaluate((el) => el === document.activeElement)) throw new Error('Full history restart lost focus');
  return { fixture, passed: ['500 detailed results load', 'newest result saves', '500-result cap', 'results restart keeps focus'] };
}
