import { test, expect } from '@playwright/test';
async function fixture(page: any, age = 0, mode = 'auto', code = 'AO') {
  await page.evaluate(
    async ({ age, mode, code }) => {
      const { seededLife } = await import('/src/game/seeded-life.ts');
      const life = seededLife(771, { countryCode: code });
      life.birthDate = '2000-01-01';
      life.currentDate = `${2000 + age}-01-01`;
      life.age = age;
      life.events = [];
      delete life.simulation;
      life.playback = { mode: mode as any };
      localStorage.setItem('no-rules-life-v1', JSON.stringify(life));
    },
    { age, mode, code },
  );
  await page.reload();
  await page.getByTestId('button-load-life').click();
}
const saved = (page: any) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('no-rules-life-v1')!));
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/');
});
test('Auto resumes after a decision; explicit pause persists through decision and reload', async ({
  page,
}) => {
  await fixture(page);
  await page.clock.runFor(15050);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('.nr-choice').first().click();
  const at = await saved(page);
  await page.clock.runFor(1000);
  expect((await saved(page)).currentDate).not.toBe(at.currentDate);
  await fixture(page, 3, 'paused');
  await page.getByTestId('button-next-month').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.reload();
  await page.getByTestId('button-load-life').click();
  await page.locator('.nr-choice').first().click();
  const paused = await saved(page);
  await page.clock.runFor(15000);
  expect(await saved(page)).toEqual(paused);
  await expect(page.getByTestId('button-play-time')).toBeVisible();
});
test('Next-choice mode continues after an answer and can be disabled inside the card', async ({
  page,
}) => {
  await fixture(page);
  await page.getByTestId('button-next-decision').click();
  expect((await saved(page)).age).toBe(3);
  await page.locator('.nr-choice').first().click();
  expect((await saved(page)).age).toBe(4);
  await expect(page.getByRole('dialog')).toContainText('Одна игрушка');
  await page.locator('.nr-auto-choice input').uncheck();
  await page.locator('.nr-choice').first().click();
  const at = await saved(page);
  await page.clock.runFor(15000);
  expect(await saved(page)).toEqual(at);
});
test('Angolan childhood has named people, real school progression and visible financial sources', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const { seededLife } = await import('/src/game/seeded-life.ts');
    const { advanceTime, resolveChoice } = await import('/src/game/simulation.ts');
    const { pendingDecision, canChoose } = await import('/src/game/event-rules.ts');
    const life = seededLife(981, { countryCode: 'AO' });
    for (let m = 0; m < 14 * 12; m++) {
      advanceTime(life);
      const e = pendingDecision(life);
      if (e)
        resolveChoice(
          life,
          e.id,
          e.choices!.findIndex((_, i) => canChoose(life, e, i)),
        );
    }
    life.playback = { mode: 'paused' };
    localStorage.setItem('no-rules-life-v1', JSON.stringify(life));
  });
  await page.reload();
  await page.getByTestId('button-load-life').click();
  const life = await saved(page);
  expect([life.character, ...life.family].every((p) => p.name && p.name !== 'Имя не указано')).toBe(
    true,
  );
  expect(life.simulation.school.grade).toBeGreaterThan(1);
  expect(life.simulation.finance.currency).toBe('AOA');
  await page.getByTestId('button-open-actions').click();
  await page.locator('[data-testid="life-overview"] > summary').click();
  await expect(page.getByTestId('school-overview')).toContainText('класс');
  await page.locator('[data-testid="financial-history"] summary').click();
  await expect(page.getByTestId('financial-history')).toContainText('Карманные деньги');
});
