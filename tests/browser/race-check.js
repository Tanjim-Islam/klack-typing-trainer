async (page) => {
  const baseURL = new URL(page.url()).origin;
  const evidence = baseURL.includes('localhost') ? 'output/playwright' : 'output/playwright/live';
  await page.goto(`${baseURL}/race`);
  await page.evaluate(() => localStorage.removeItem('klack.v1'));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const rivalContext = await page.context().browser().newContext();
  const rival = await rivalContext.newPage();
  const checked = [];
  try {
    await page.getByRole('textbox', { name: 'Your race name' }).first().fill('QA Host');
    await page.getByRole('radio', { name: '30s', exact: true }).click();
    await page.getByRole('radio', { name: 'Common words', exact: true }).click();
    await page.getByRole('button', { name: 'Create room', exact: true }).click();
    await page.waitForURL(/\/race\/[A-Z2-9]{8}$/);
    const room = page.url();
    const code = room.split('/').pop();
    await rival.goto(`${baseURL}/race`);
    await rival.getByRole('textbox', { name: 'Your race name' }).last().fill('QA Rival');
    await rival.getByRole('textbox', { name: 'Room code' }).fill(code);
    await rival.getByRole('button', { name: 'Join room', exact: true }).click();
    await rival.getByRole('button', { name: 'Start when ready', exact: true }).waitFor();
    await page.getByText('QA Rival', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Start when ready', exact: true }).click();
    await rival.getByRole('button', { name: 'Start when ready', exact: true }).click();
    let lastText = null;
    for (let round = 1; round <= 2; round++) {
      const hostInput = page.getByRole('textbox', { name: '1v1 typing race input', exact: true });
      const rivalInput = rival.getByRole('textbox', { name: '1v1 typing race input', exact: true });
      await hostInput.waitFor(); await rivalInput.waitFor();
      await page.waitForTimeout(3400);
      const target = await page.locator('.type-track').innerText();
      const other = await rival.locator('.type-track').innerText();
      assert(target === other, `Round ${round} has different text for each racer`);
      if (lastText) assert(target !== lastText, 'Rematch reused old text');
      lastText = target;
      await hostInput.focus();
      await page.keyboard.type(target[0]);
      await hostInput.evaluate((element, char) => element.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: char })), target[1]);
      await page.keyboard.type(target.slice(2, 55));
      await rivalInput.focus(); await rival.keyboard.type(target.slice(0, 45));
      await page.getByRole('button', { name: 'Rematch', exact: true }).waitFor({ timeout: 40000 });
      await rival.getByRole('button', { name: 'Rematch', exact: true }).waitFor({ timeout: 5000 });
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === 'Rematch' && !button.disabled));
      assert(page.url() === room && rival.url() === room, 'Room changed');
      const hostResult = await page.evaluate(() => JSON.parse(localStorage.getItem('klack.v1')).results[0]);
      assert(hostResult.training.source === 'race', 'Race result context missing');
      assert(hostResult.elapsedMs === 30000, 'Race time was not capped');
      assert(hostResult.keystrokes === 55 && hostResult.incorrectChars === 0, 'Race lost a physical-to-touch input');
      checked.push({ round, room: code, duration: hostResult.elapsedMs, keystrokes: hostResult.keystrokes });
      if (round === 1) {
        await page.getByRole('button', { name: 'Rematch', exact: true }).click();
        await rival.getByText('Your rival wants a rematch.', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Cancel rematch', exact: true }).click();
        await rival.getByText('Both players press Rematch to race again here.', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Rematch', exact: true }).click();
        await rival.getByRole('button', { name: 'Rematch', exact: true }).click();
      }
    }
    await page.screenshot({ path: `${evidence}/rematch-result.png`, fullPage: true });
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem('klack.v1')).results);
    assert(history.length === 2 && new Set(history.map((r) => r.id)).size === 2, 'Race saved duplicate or missing results');
    await rival.close();
    await page.getByText('Your rival left.', { exact: false }).waitFor({ timeout: 15000 });
    assert(await page.getByRole('button', { name: 'Rematch', exact: true }).isDisabled(), 'Rematch stayed enabled after rival left');
    return { checked, passed: ['two isolated players on real Realtime', 'two real 30-second races', 'same text per round', 'fresh text on rematch', 'request and cancel', 'same room', 'one saved result per round', 'rival disconnect'] };
  } finally { await rivalContext.close(); }
}
