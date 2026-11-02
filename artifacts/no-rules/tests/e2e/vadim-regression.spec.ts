import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const vadimKyiv = () =>
  JSON.parse(readFileSync(new URL('../fixtures/vadim-kyiv.json', import.meta.url), 'utf8'));

test('Reported Kyiv birth: automatic January–March 2001 events do not repeat cuddling', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.evaluate(
    (life) => localStorage.setItem('no-rules-life-v1', JSON.stringify(life)),
    vadimKyiv(),
  );
  await page.reload();
  await page.getByTestId('button-load-life').click();
  const observed = [];
  for (const expectedDate of ['2001-01-03', '2001-02-03', '2001-03-03']) {
    await page.clock.runFor(417);
    const life = await page.evaluate(() => JSON.parse(localStorage.getItem('no-rules-life-v1')!));
    expect(life.currentDate).toBe(expectedDate);
    expect(life.age).toBe(0);
    expect(life.character.name).toBe('Вадим Янюк');
    observed.push(life.events.filter((e: any) => e.date === expectedDate));
    // Check actual rendered text and reload between ticks, as the user would.
    for (const e of observed.at(-1)!)
      await expect(page.getByTestId(`event-${e.id}`)).toContainText(e.title);
    await page.reload();
    await page.getByTestId('button-load-life').click();
  }
  const events = observed.flat();
  console.log(
    'January–March events:',
    JSON.stringify(events.map((e) => ({ date: e.date, title: e.title, templateId: e.templateId }))),
  );
  expect(events.filter((e) => e.title === 'Обнять ребёнка')).toHaveLength(0);
  expect(events.filter((e) => e.templateId === 'care-embrace').length).toBeLessThanOrEqual(1);
  expect(new Set(events.map((e) => e.templateId)).size).toBe(1);
  expect(events.every((e) => e.kind === 'life' && !e.choices)).toBe(true);
  expect(errors).toEqual([]);
});
