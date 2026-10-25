async (page) => {
  const baseURL = new URL(page.url()).origin;
  const context = await page.context().browser().newContext();
  const check = await context.newPage();
  try {
    await check.goto(`${baseURL}/`);
    await check.getByRole('button', { name: 'Dismiss the introduction' }).click();
    await check.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('klack.v1'));
      const base = {
        at: Date.now(), mode: 'time', label: '30s', elapsedMs: 30000,
        wpm: 60, rawWpm: 66, accuracy: 90, consistency: 80,
        correctChars: 150, incorrectChars: 15, keystrokes: 165,
        correctKeystrokes: 150, words: 30, samples: [],
        keyStats: { A: { h: 5, m: 5 }, a: { h: 40, m: 0 }, ':': { h: 5, m: 5 } },
        training: {
          source: 'test',
          benchmark: { seconds: 30, punctuation: false, numbers: false, stopOnError: false },
          pairStats: { th: { h: 4, m: 4 } }, missedWords: [],
        },
      };
      data.results = [
        { ...base, id: 'recent' },
        { ...base, id: 'code', at: base.at - 1000, mode: 'code', label: 'Code', training: { ...base.training, benchmark: { punctuation: true, numbers: true, stopOnError: false, textId: 'example', textLabel: 'const count = 1;' } } },
        { ...base, id: 'legacy', at: base.at - 2000, training: undefined },
      ];
      localStorage.setItem('klack.v1', JSON.stringify(data));
    });
    await check.goto(`${baseURL}/progress`);
    const targets = check.locator('ol li kbd');
    const tokens = await targets.allTextContents();
    for (const token of ['A', ':', 'th']) if (!tokens.includes(token)) throw new Error(`Missing target ${token}`);
    await check.getByRole('button', { name: 'Practise these targets', exact: true }).click();
    await check.waitForURL(`${baseURL}/`);
    const text = await check.locator('#typing-target').textContent();
    for (const token of ['A', ':', 'th']) if (!text.includes(token)) throw new Error(`Drill omitted ${token}`);
    await check.goto(`${baseURL}/progress`);
    await check.getByRole('combobox', { name: 'Compare similar tests' }).click();
    await check.getByRole('option', { name: 'All history', exact: true }).click();
    await check.getByText('3 tests in this view, 3 saved in total.', { exact: true }).waitFor();
    if (await check.getByText('Speed over time', { exact: true }).count()) throw new Error('All history mixes speed comparisons');
    await check.getByRole('combobox', { name: 'Compare similar tests' }).click();
    await check.getByRole('option', { name: 'Older tests, settings unknown', exact: true }).click();
    await check.getByText('1 test in this view, 3 saved in total.', { exact: true }).waitFor();
    if (await check.getByText('Speed over time', { exact: true }).count()) throw new Error('Legacy results guess settings');
    await check.getByRole('button', { name: 'Clear entire history', exact: true }).click();
    await check.getByText('All 3 saved tests will be deleted, including your key', { exact: false }).waitFor();
    await check.getByRole('button', { name: 'Cancel', exact: true }).click();
    await check.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('klack.v1'));
      const clean = structuredClone(data.results[0]);
      clean.id = 'improved'; clean.at = Date.now() + 1000;
      clean.keyStats = { A: { h: 40, m: 0 }, ':': { h: 40, m: 0 } };
      clean.training.pairStats = { th: { h: 40, m: 0 } };
      data.results.unshift(clean);
      localStorage.setItem('klack.v1', JSON.stringify(data));
    });
    await check.reload();
    await check.getByText('Nothing stands out yet.', { exact: false }).waitFor();
    if (await check.getByRole('button', { name: 'Practise these targets', exact: true }).count()) throw new Error('Improved targets were not retired');
    return { passed: ['exact capital, colon and pair targets', 'generated drill contains each target', 'all-history access without mixed comparisons', 'legacy history without guessed settings', 'clear confirmation counts all history', 'improved targets retire'] };
  } finally { await context.close(); }
}
