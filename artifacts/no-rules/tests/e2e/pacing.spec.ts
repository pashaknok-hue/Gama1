import { test, expect } from '@playwright/test';
async function install(page: any) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/');
}
async function load(page: any, age = 0, suppress = false) {
  await page.evaluate(
    async ({ age, suppress }) => {
      const { seededLife } = await import('/src/game/seeded-life.ts');
      const { ensureSimulation } = await import('/src/game/causal-state.ts');
      const life = seededLife(20040521, { countryCode: 'KE' });
      life.birthDate = '2004-05-21';
      life.currentDate = `${2004 + age}-05-21`;
      life.age = age;
      life.character.name = 'Makuu Owuor';
      delete life.character.personalName;
      life.events = [];
      delete life.simulation;
      const s = ensureSimulation(life);
      if (suppress) {
        Object.assign(s.person.flags, {
          'preschool-interest-chosen': true,
          'preschool-sharing-chosen': true,
          'preschool-family-chosen': true,
          'friend-request-answered': true,
          'training-planned': true,
        });
      }
      localStorage.setItem('no-rules-life-v1', JSON.stringify(life));
    },
    { age, suppress },
  );
  await page.reload();
  await page.getByTestId('button-load-life').click();
}
const saved = (page: any) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('no-rules-life-v1')!));
test('Makuu reaches first choice in 15 seconds, pauses, reloads, then skips to age four', async ({
  page,
}) => {
  await install(page);
  await load(page);
  await page.clock.runFor(14900);
  expect((await saved(page)).age).toBe(2);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.clock.runFor(200);
  const first = await saved(page);
  expect(first.currentDate).toBe('2007-05-21');
  expect(first.age).toBe(3);
  await expect(page.getByRole('dialog')).toContainText('Во что поиграем вместе?');
  await page.clock.runFor(30000);
  expect(await saved(page)).toEqual(first);
  await page.reload();
  await page.getByTestId('button-load-life').click();
  expect(await saved(page)).toEqual(first);
  await page.locator('.nr-choice').first().click();
  await page.getByTestId('button-next-decision').click();
  expect((await saved(page)).currentDate).toBe('2008-05-21');
  await expect(page.getByRole('dialog')).toContainText('Одна игрушка на двоих');
  await page.clock.runFor(30000);
  expect((await saved(page)).currentDate).toBe('2008-05-21');
});
test('Each childhood band advances a year at its own rate and pause freezes fractional progress', async ({
  page,
}) => {
  await install(page);
  for (const [age, seconds] of [
    [0, 5],
    [3, 10],
    [6, 25],
    [12, 40],
  ]) {
    await load(page, age, true);
    await page.clock.runFor(seconds * 1000 - 5);
    expect((await saved(page)).age).toBe(age);
    await page.clock.runFor(10);
    expect((await saved(page)).currentDate).toBe(`${2005 + age}-05-21`);
  }
  await load(page, 5, true);
  await page.clock.runFor(10010);
  expect((await saved(page)).age).toBe(6);
  await page.clock.runFor(24980);
  expect((await saved(page)).age).toBe(6);
  await page.clock.runFor(20);
  expect((await saved(page)).age).toBe(7);
  await load(page, 0, true);
  await page.clock.runFor(200);
  await page.getByTestId('button-pause-time').click();
  const frozen = await saved(page);
  await page.clock.runFor(10000);
  expect(await saved(page)).toEqual(frozen);
  await page.getByTestId('button-play-time').click();
  await page.clock.runFor(200);
  expect((await saved(page)).currentDate).toBe(frozen.currentDate);
  await page.clock.runFor(30);
  expect((await saved(page)).currentDate).not.toBe(frozen.currentDate);
});
test('Next-choice control fits short portrait and landscape screens', async ({ page }) => {
  await install(page);
  await load(page);
  await page.getByTestId('button-pause-time').click();
  for (const size of [
    { width: 320, height: 480 },
    { width: 390, height: 664 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    const button = page.getByTestId('button-next-decision');
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
    const geometry=await page.evaluate(()=>({scene:document.querySelector('.nr-scene')!.getBoundingClientRect().height,journal:document.querySelector('[data-testid=display-events]')!.getBoundingClientRect().height}));
    console.log('Pacing layout',size,geometry);
    expect(geometry.scene).toBeGreaterThan(80);expect(geometry.journal).toBeGreaterThan(30);
    if(size.width===320)await page.screenshot({path:test.info().outputPath('pacing-320.png')});
    expect(
      await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.scrollHeight,
      ]),
    ).toEqual([size.width, size.height]);
  }
});

test('Actual foreground wall-clock time to Makuu first decision, without mocked clocks', async ({
  page,
}) => {
  await page.goto('/');
  await load(page);
  const started = Date.now();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('no-rules-life-v1')!).age === 3,
    {},
    { timeout: 23000 },
  );
  const elapsed = (Date.now() - started) / 1000;
  console.log(`Actual first-decision time: ${elapsed.toFixed(2)} seconds`);
  expect(elapsed).toBeGreaterThan(14);
  expect(elapsed).toBeLessThan(23);
  await expect(page.getByRole('dialog')).toContainText('Во что поиграем вместе?');
});
