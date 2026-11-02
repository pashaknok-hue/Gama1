import { test, expect } from '@playwright/test';
test('Isolated Pixelbolt prototype: all animations, integer scaling, real support and untouched save', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('no-rules-life-v1', 'prototype-must-not-touch'));
  await page.goto('/prototype');
  for (const mode of ['idle', 'walk', 'sit', 'sleep']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    const img = page.getByTestId('prototype-avatar');
    await expect(img).toHaveAttribute('data-mode', mode);
    await expect
      .poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth === 24))
      .toBe(true);
    const start = await img.getAttribute('data-frame');
    await expect.poll(() => img.getAttribute('data-frame'), { timeout: 2500 }).not.toBe(start);
  }
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 664 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(size);
    for (const scale of [2, 4, 6, 8]) {
      await page.getByRole('combobox').selectOption(String(scale));
      const img = await page.getByTestId('prototype-avatar').boundingBox(),
        floor = await page.getByTestId('prototype-floor').boundingBox();
      expect(Math.abs(img!.y + img!.height - 2 * scale - floor!.y)).toBeLessThan(1);
      expect(img!.width).toBe(24 * scale);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(size.width);
    }
  }
  expect(await page.evaluate(() => localStorage.getItem('no-rules-life-v1'))).toBe(
    'prototype-must-not-touch',
  );
  await page.screenshot({ path: test.info().outputPath('prototype.png') });
});
test('Main avatar remains supported on mobile and desktop and scenes respond to saved work', async ({
  page,
}) => {
  await page.goto('/');
  for (const age of [0, 7, 18, 75]) {
    await page.evaluate(async (age) => {
      const { seededLife } = await import('/src/game/seeded-life.ts');
      const life = seededLife(119);
      life.age = age;
      life.currentDate = String(Number(life.birthDate.slice(0, 4)) + age) + life.birthDate.slice(4);
      life.playback = { mode: 'paused' };
      if (age >= 18)
        life.simulation!.person.job = {
          status: age >= 65 ? 'retired' : 'employed',
          title: 'Техник',
          employer: 'Мастерская района',
          income: 100,
        };
      localStorage.setItem('no-rules-life-v1', JSON.stringify(life));
    }, age);
    await page.reload();
    await page.getByTestId('button-load-life').click();
    for (const size of [
      { width: 390, height: 664 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(size);
      const avatar = await page.getByTestId('scene-support').boundingBox(),
        floor = await page.getByTestId('scene-floor').boundingBox();
      expect(Math.abs(avatar!.y + avatar!.height - floor!.y)).toBeLessThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(size.width);
    }
    if (age === 18)
      await expect(page.locator('.nr-life-scene')).toHaveAttribute('data-scene', 'workshop');
  }
});
