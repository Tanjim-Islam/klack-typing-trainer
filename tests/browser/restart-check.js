async (page) => {
  const baseURL = new URL(page.url()).origin;
  await page.goto(`${baseURL}/`);
  await page.getByRole('textbox', { name: 'Typing test input', exact: true }).waitFor({ state: 'attached' });
  const intro = page.getByRole('button', { name: 'Dismiss the introduction' });
  if (await intro.count()) await intro.click();
  await page.getByRole('radio', { name: 'Timed', exact: true }).click();
  await page.getByRole('radio', { name: '120s', exact: true }).click();
  await page.getByRole('textbox', { name: 'Typing test input' }).focus();
  const samples = [];
  const perKey = { Tab: [], Enter: [] };
  for (let i = 0; i < 20; i++) {
    const text = await page.locator('#typing-target').textContent();
    const first = text.split('Text to type: ')[1][0];
    await page.keyboard.press(first);
    await page.evaluate(() => {
      window.restartStart = 0;
      window.restartLatency = null;
      const target = document.getElementById('typing-target');
      const observer = new MutationObserver(() => {
        if (!window.restartStart) return;
        observer.disconnect();
        requestAnimationFrame(() => { window.restartLatency = performance.now() - window.restartStart; });
      });
      observer.observe(target, { childList: true, characterData: true, subtree: true });
      document.addEventListener('keydown', () => { window.restartStart = performance.now(); }, { capture: true, once: true });
    });
    const restartKey = i % 2 === 0 ? 'Tab' : 'Enter';
    await page.keyboard.press(restartKey);
    await page.waitForFunction(() => window.restartLatency !== null);
    const latency = await page.evaluate(() => window.restartLatency);
    samples.push(latency);
    perKey[restartKey].push(latency);
    if (await page.getByRole('textbox', { name: 'Typing test input' }).evaluate((input) => document.activeElement !== input)) throw new Error('Restart lost focus');
  }
  samples.sort((a, b) => a - b);
  const byKey = Object.fromEntries(Object.entries(perKey).map(([key, values]) => {
    values.sort((a, b) => a - b);
    return [key, { count: values.length, median: values[5], max: values[9] }];
  }));
  return { samples: samples.map(Math.round), median: samples[10], p95: samples[18], max: samples[19], byKey, spans: await page.locator('.type-track span').count() };
}
