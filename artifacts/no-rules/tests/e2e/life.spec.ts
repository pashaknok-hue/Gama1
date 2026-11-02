import { test, expect } from '@playwright/test';

test('Automatic time, pause, resume, 4x and reload preserve an adult on mobile', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.evaluate(async () => {
    const { seededLife } = await import('/src/game/seeded-life.ts');
    const {ensureSimulation}=await import('/src/game/causal-state.ts');
    const life=seededLife(772);life.age=30;life.currentDate=String(Number(life.birthDate.slice(0,4))+30)+life.birthDate.slice(4);delete life.simulation;
    const s=ensureSimulation(life);s.person.flags['training-planned']=true;s.person.flags['friend-request-answered']=true;s.person.money.cash=0;s.person.job={status:'retired',title:'Распорядок',income:s.person.money.expenses};
    localStorage.setItem('no-rules-life-v1', JSON.stringify(life));
  });
  await page.reload();
  await page.getByTestId('button-load-life').click();
  const date = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('no-rules-life-v1')!).currentDate);
  const initial = await date();
  await page.clock.runFor(10000);
  expect(await date()).not.toBe(initial);
  await page.getByTestId('button-pause-time').click();
  const paused = await date();
  await page.clock.runFor(30000);
  expect(await date()).toBe(paused);
  await page.getByTestId('button-play-time').click();
  await page.clock.runFor(10000);
  expect(await date()).not.toBe(paused);
  await page.getByTestId('button-speed').click();
  await page.getByTestId('button-speed').click();
  const before = await date();
  await page.clock.runFor(10000);
  expect(
    await page.evaluate(
      ([a, b]) =>
        (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 +
        Number(b.slice(5, 7)) -
        Number(a.slice(5, 7)),
      [before, await date()],
    ),
  ).toBe(4);
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 664 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(() => ({
        w: document.documentElement.scrollWidth,
        h: document.documentElement.scrollHeight,
      })),
    ).toEqual({ w: size.width, h: size.height });
  }
  const current = await date();
  await page.reload();
  await page.getByTestId('button-load-life').click();
  expect(await date()).toBe(current);
  expect(errors).toEqual([]);
});

test('Important choices conceal unknown results; a full life fits storage and loads at 85', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install();
  await page.goto('/');
  await page.evaluate(async () => {
    const { seededLife } = await import('/src/game/seeded-life.ts');
    const { ensureSimulation } = await import('/src/game/causal-state.ts');
    const life = seededLife(61);
    life.birthDate = '2000-01-31';
    life.currentDate = '2016-01-31';
    life.age = 16;
    life.events = [];
    delete life.simulation;
    const s = ensureSimulation(life);
    s.person.flags['friend-request-answered'] = true;
    s.person.money.cash = 100;
    localStorage.setItem('no-rules-life-v1', JSON.stringify(life));
  });
  await page.reload();
  await page.getByTestId('button-load-life').click();
  await page.clock.runFor(10000);
  await expect(page.getByRole('dialog')).toBeVisible();
  const summaries = await page.locator('.nr-choice-effect').allTextContents();
  expect(summaries.join(' ')).not.toMatch(/через \d|близость [+-]|здоровье [+-]|план через/);
  await page.locator('.nr-choice').nth(1).click();
  const old = await page.evaluate(async () => {
    const { seededLife } = await import('/src/game/seeded-life.ts');
    const { advanceTime, resolveChoice } = await import('/src/game/simulation.ts');
    const { pendingDecision, canChoose } = await import('/src/game/event-rules.ts');
    const { saveLife, loadLife } = await import('/src/game/storage.ts');
    const life = seededLife(10001, { countryCode: 'CH' });
    for (let m = 0; m < 1020; m++) {
      advanceTime(life);
      const e = pendingDecision(life);
      if (e)
        resolveChoice(
          life,
          e.id,
          e.choices!.findIndex((_, i) => canChoose(life, e, i)),
        );
    }
    if (!saveLife(life) || JSON.stringify(loadLife()) !== JSON.stringify(life))
      throw Error('Storage round trip failed');
    return { age: life.age, name: life.character.name };
  });
  expect(old.age).toBe(85);
  await page.reload();
  await page.getByTestId('button-load-life').click();
  await expect(page.getByTestId('display-age').locator('strong')).toHaveText('85');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('no-rules-life-v1')!).character.name),
  ).toBe(old.name);
  await page.getByTestId('button-open-actions').click();
  await page.locator('[data-testid="life-overview"] summary').click();
  await expect(page.getByTestId('life-overview')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Birth to old age through actual time buttons and modal choices', async ({ page }) => {
  test.setTimeout(180_000);
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/');
  await page.evaluate(async () => {
    const { seededLife } = await import('/src/game/seeded-life.ts');
    localStorage.setItem(
      'no-rules-life-v1',
      JSON.stringify(seededLife(884, { countryCode: 'FR' })),
    );
  });
  await page.reload();
  await page.getByTestId('button-load-life').click();
  let decisions = 0,
    steps = 0;
  while (steps++ < 1500) {
    const life = await page.evaluate(() => JSON.parse(localStorage.getItem('no-rules-life-v1')!));
    if (life.age >= 85) break;
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible()) {
      const choices = dialog.locator('.nr-choice:enabled');
      await expect(choices.first()).toBeVisible();
      await choices.first().click();
      decisions++;
    } else await page.getByTestId('button-next-year').click();
  }
  expect(steps).toBeLessThan(1500);
  expect(decisions).toBeGreaterThan(5);
  await expect(page.getByTestId('display-age').locator('strong')).toHaveText('85');
  const final = await page.evaluate(() => JSON.parse(localStorage.getItem('no-rules-life-v1')!));
  await page.reload();
  await page.getByTestId('button-load-life').click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('no-rules-life-v1')!))).toEqual(
    final,
  );
});
