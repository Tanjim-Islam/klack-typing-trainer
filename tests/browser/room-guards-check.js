async (page) => {
  const baseURL = new URL(page.url()).origin;
  const browser = page.context().browser();
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const extraContext = await browser.newContext();
  try {
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();
    const extra = await extraContext.newPage();
    await host.goto(`${baseURL}/race`);
    await host.getByRole('textbox', { name: 'Your race name' }).first().fill('QA Guard Host');
    await host.getByRole('button', { name: 'Create room', exact: true }).click();
    await host.waitForURL(/\/race\/[A-Z2-9]{8}$/);
    const room = host.url();
    await guest.goto(room);
    await guest.getByText('QA Guard Host', { exact: true }).waitFor();
    await guest.getByRole('button', { name: 'Start when ready', exact: true }).waitFor();
    await extra.goto(room);
    await extra.getByText('This room already has two racers', { exact: true }).waitFor();
    await extra.close();
    await host.close();
    await guest.getByText('The host left before the race started.', { exact: false }).waitFor({ timeout: 15000 });
    await guest.close();
    const empty = await extraContext.newPage();
    await empty.goto(room);
    await empty.getByText('No host is sharing this code yet', { exact: true }).waitFor({ timeout: 15000 });
    return { passed: ['third racer refused', 'host departure before start', 'empty room has a clear explanation'] };
  } finally {
    await hostContext.close();
    await guestContext.close();
    await extraContext.close();
  }
}
