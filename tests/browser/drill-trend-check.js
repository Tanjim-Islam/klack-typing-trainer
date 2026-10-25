async (page) => {
  const baseURL = new URL(page.url()).origin;
  const evidence = baseURL.includes('localhost') ? 'output/playwright' : 'output/playwright/live';
  const context = await page.context().browser().newContext();
  const check = await context.newPage();
  try {
    await check.goto(`${baseURL}/drills`);
    await check.getByRole('button', { name: 'New drill', exact: true }).click();
    await check.getByRole('textbox', { name: 'Name', exact: true }).fill('QA trend proof');
    await check.getByRole('textbox', { name: 'Practice text', exact: true }).fill('This: that: then: three: things.');
    await check.getByRole('button', { name: 'Create drill', exact: true }).click();
    const runs = [];
    for (const delay of [3200, 5200]) {
      const custom = check.locator('section').filter({ has: check.getByRole('heading', { name: 'Yours (1)', exact: true }) });
      await custom.getByRole('button', { name: 'Practise', exact: true }).click();
      const text = (await check.locator('#typing-target').textContent()).split('Text to type: ')[1].trim();
      await check.getByRole('textbox', { name: 'Typing test input', exact: true }).focus();
      await check.keyboard.type(text[0]);
      await check.waitForTimeout(delay);
      await check.keyboard.type(text.slice(1));
      await check.getByRole('button', { name: 'Next test', exact: false }).waitFor();
      runs.push(await check.evaluate(() => JSON.parse(localStorage.getItem('klack.v1')).results[0]));
      await check.goto(`${baseURL}/drills`);
    }
    if (runs[1].training.drillId !== runs[0].training.drillId || runs[1].wpm >= runs[0].wpm) throw new Error('The two controlled runs do not form the expected comparison');
    const trend = check.getByText(/accuracy since last matching run/);
    await trend.waitFor();
    if (!/[-−]\d+(?:\.\d+)? wpm/.test(await trend.textContent())) throw new Error('The slower run did not show a negative speed change');
    await check.getByRole('button', { name: 'History for QA trend proof', exact: true }).click();
    const dialog = check.getByRole('dialog');
    if (await dialog.getByText('Current', { exact: true }).count() !== 2) throw new Error('Drill history did not retain both runs');
    await check.screenshot({ path: `${evidence}/drill-trend.png`, fullPage: true });
    return { passed: ['two completed runs of one saved drill', 'same drill identity', 'speed change matches the recorded runs', 'both runs in history'], wpm: runs.map(r => r.wpm) };
  } finally { await context.close(); }
}
