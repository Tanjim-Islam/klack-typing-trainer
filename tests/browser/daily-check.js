async (page) => {
  const baseURL = new URL(page.url()).origin;
  const evidence = baseURL.includes('localhost') ? 'output/playwright' : 'output/playwright/live';
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const text = async () => (await page.locator('#typing-target').textContent()).split('Text to type: ')[1].trim();
  await page.goto(`${baseURL}/`);
  await page.getByRole('button', { name: 'Start daily practice', exact: true }).click();
  await page.clock.install();
  const summaries = [];
  for (let step = 1; step <= 5; step++) {
    await page.getByText(`Daily practice · ${step}/5`, { exact: false }).waitFor();
    const target = await text();
    if (step === 1) {
      // Collect deliberate mistakes, then make sure the next round targets them.
      await page.keyboard.type('x'.repeat(200));
    } else {
      if (step === 2) {
        const heading = await page.getByText(`Daily practice · ${step}/5`, { exact: false }).textContent();
        assert(heading.includes('Focus:'), 'Warm-up mistakes did not produce practice targets');
        for (const token of heading.split('Focus: ')[1].split(', '))
          assert(target.includes(token), `Daily practice omitted its target ${token}`);
      }
      await page.keyboard.type(target.slice(0, 45));
    }
    await page.clock.fastForward(61000);
    await page.getByRole('button', { name: step === 5 ? 'Finish daily practice' : 'Next round', exact: false }).waitFor();
    const result = await page.evaluate(() => JSON.parse(localStorage.getItem('klack.v1')).results[0]);
    assert(result.training.daily.step === step, `Round ${step} was not recorded`);
    assert(result.elapsedMs === 60000, `Round ${step} has wrong duration`);
    summaries.push({ step, mode: result.mode, elapsed: result.elapsedMs, targets: result.training.missedWords.length });
    if (step === 2) {
      await page.reload();
      await page.getByText('2/5 rounds done.', { exact: false }).waitFor();
      await page.getByRole('button', { name: 'Continue daily practice', exact: true }).click();
    } else if (step < 5) {
      // Results keyboard shortcut must advance a daily round, not repeat it.
      await page.getByRole('textbox', { name: 'Typing test input', exact: true }).focus();
      await page.keyboard.press('Enter');
    }
  }
  await page.getByText('Five minutes complete. Your daily practice is saved.', { exact: true }).waitFor();
  await page.screenshot({ path: `${evidence}/daily-complete.png`, fullPage: true });
  await page.getByRole('button', { name: 'Finish daily practice', exact: false }).click();
  assert(await page.getByRole('button', { name: 'Done for today', exact: true }).isDisabled(), 'Daily completion not shown');
  await page.reload();
  assert(await page.getByRole('button', { name: 'Done for today', exact: true }).isDisabled(), 'Daily completion lost after reload');
  return { passed: ['five full rounds', 'targets change after warm-up', 'reload and resume at round 3', 'Enter advances rounds', 'five-minute total', 'completion survives reload'], summaries };
}
