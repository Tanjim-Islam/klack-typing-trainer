async (page) => {
  const baseURL = new URL(page.url()).origin;
  await page.goto(`${baseURL}/`);
  const input = page.getByRole('textbox', { name: 'Typing test input', exact: true });
  await input.focus();
  const target = (await page.locator('#typing-target').textContent()).split('Text to type: ')[1].trim();
  await page.keyboard.type(target[0]);
  await input.evaluate((element, char) => element.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: char })), target[1]);
  const cls = await page.locator('.type-track [data-i="1"]').getAttribute('class');
  if (!cls.includes('text-type-correct')) throw new Error('Touch input was swallowed after a physical key');
  await page.getByRole('link', { name: 'Klack home', exact: true }).focus();
  await page.getByRole('button', { name: /Paused/ }).waitFor();
  await input.focus();
  await page.keyboard.press('Enter');
  if (await page.getByRole('button', { name: /Paused/ }).count()) throw new Error('Enter did not resume');
  await page.keyboard.press('Tab');
  const before = await page.locator('#typing-target').textContent();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  if (before !== await page.locator('#typing-target').textContent()) throw new Error('Shift+Tab restarted');
  return { passed: ['physical-to-touch input', 'blur pauses', 'Enter resumes', 'Shift+Tab preserves text'] };
}
