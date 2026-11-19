/* Optional real-browser smoke test. Start the static server first.
 * CHROMIUM_PATH=/path/to/chromium npm run test:browser
 * Optional: ACADEMY_BASE_URL, SCREENSHOT_DIR (screenshots are not committed).
 */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  if (!process.env.CHROMIUM_PATH) throw new Error('Set CHROMIUM_PATH to an installed Chromium executable.');
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process', '--disable-gpu'],
    headless: true
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await context.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    const screenshot = async name => {
      if (!process.env.SCREENSHOT_DIR) return;
      fs.mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
      await p.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, name + '.png'), fullPage: true });
    };
    const role = async r => {
      await p.locator('#account-button').click();
      await p.locator('#login-form select').selectOption(r);
      await p.locator('#login-form button[type="submit"]').click();
    };
    const tab = t => p.locator(`.sidebar [data-tab="${t}"]`).click();
    await p.goto(process.env.ACADEMY_BASE_URL || 'http://localhost:4173/academy/');
    await screenshot('desktop-home');
    const base = p.url().split('#')[0];
    await p.goto(base + '#/catalog');
    await p.locator('#portal-search').waitFor();
    assert.equal(await p.locator('.portal-card').count(), 7);
    await screenshot('desktop-catalog');
    await p.locator('[data-compare="higher"]').click();
    await p.locator('[data-compare="mba"]').click();
    await p.goto(base + '#/compare');
    await p.locator('.portal-table').waitFor();
    assert.equal(await p.locator('.portal-table thead th').count(), 3);
    await p.goto(base + '#/program/retraining');
    await p.locator('#portal-curriculum').waitFor();
    assert.equal(await p.locator('[data-portal-apply]').isDisabled(), true);
    await screenshot('desktop-program');
    for (const width of [390, 320]) {
      await p.setViewportSize({ width, height: 844 });
      for (const route of ['catalog', 'compare', 'program/retraining', 'advisor', 'admission']) {
        await p.goto(base + '#/' + route);
        await p.locator('.portal-page').waitFor();
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Portal ${route} overflow at ${width}px`);
        assert.doesNotMatch(await p.locator('body').innerText(), /демо|demo/i);
        await screenshot(`portal-${route.replace('/', '-')}-${width}`);
      }
    }
    await p.setViewportSize({ width: 1440, height: 1000 });
    await role('learner'); await tab('lab');
    await p.locator('#inventory-form button').click();
    await p.locator('#inventory-result').getByText('626 ед.', { exact: true }).first().waitFor();
    await screenshot('desktop-lab');
    await tab('courses');
    await p.locator('[data-learn-module="inventory"]').click();
    await p.locator('[data-learning-action="start-test"]').click();
    await p.locator('[name="q0"][value="1"]').check();
    await p.locator('[name="q1"][value="2"]').check();
    await p.locator('[name="reason"]').fill('Позиция запаса учитывает ожидаемые поступления и спрос за время поставки.');
    await p.locator('[name="declaration"]').check();
    await p.locator('#learning-quiz button:not([type])').click();
    await role('teacher'); await tab('reviews');
    await p.locator('[name="feedback"]').fill('Аргументы корректны для учебной модели; постоянство срока и независимость спроса учтены.');
    await p.locator('[name="reviewed"]').check();
    await p.locator('.learning-review-form button').click();
    await role('learner'); await tab('skills');
    await p.getByText('Проверено локально', { exact: true }).waitFor();
    const code = await p.evaluate(() => JSON.parse(localStorage.getItem('scm-academy-demo-v1')).learning.attempts[0].recordCode);
    await role('employer');
    await p.locator('[name="code"]').fill(code);
    await p.locator('#learning-verify button').click();
    await p.getByText('ЛОКАЛЬНАЯ ЗАПИСЬ НАЙДЕНА').waitFor();
    await role('learner'); await tab('offline');
    await p.locator('[data-learning-action="prepare-offline"]').click();
    await p.locator('#offline-status').filter({ hasText: 'Пакет проверен и готов' }).waitFor({ timeout: 20000 });
    await p.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    // Reload a hash-addressed cabinet: the worker must normalize the fragment.
    await p.reload(); await p.locator('.hero').waitFor();
    await role('learner'); await tab('lab');
    await p.locator('#inventory-result').getByText('626 ед.', { exact: true }).first().waitFor();
    await tab('courses'); assert.equal(await p.locator('.learning-course').count(), 3);
    await p.goto(base + '#/catalog');
    await p.locator('#portal-search').waitFor();
    await p.reload();
    assert.equal(await p.locator('.portal-card').count(), 7);
    await p.goto(base + '#/program/mba');
    await p.locator('#portal-curriculum').waitFor();
    await role('learner');
    await context.setOffline(false);
    for (const width of [390, 320]) {
      await p.setViewportSize({ width, height: 844 });
      await p.locator('[data-action="logout"]').click(); await p.locator('.hero').waitFor();
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Home overflow at ${width}px`);
      await screenshot(`mobile-home-${width}`);
      await role('learner'); await tab('courses');
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Course overflow at ${width}px`);
      await screenshot(`mobile-courses-${width}`);
    }
    // Every role and cabinet screen remains usable on phone and tablet widths.
    for (const width of [320, 390, 768]) {
      await p.setViewportSize({ width, height: 844 });
      for (const r of ['applicant', 'learner', 'teacher', 'admin', 'employer']) {
        await role(r);
        const tabs = await p.locator('.sidebar [data-tab]').evaluateAll(items => items.map(e => e.dataset.tab));
        for (const t of tabs) {
          await tab(t);
          if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
            console.log(await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => [e.tagName,e.className,e.getBoundingClientRect().width,e.getBoundingClientRect().right])));
            await screenshot(`overflow-${r}-${t}-${width}`);
          }
          assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${r}/${t} overflow at ${width}px`);
          assert.doesNotMatch(await p.locator('body').innerText(), /демо|demo/i, `${r}/${t} contains removed label`);
          if (width === 390 && ['lab', 'directions', 'grading'].includes(t)) await screenshot(`mobile-${r}-${t}`);
        }
      }
      await p.locator('.mobile-menu-toggle').click();
      await p.locator('#primary-navigation a[href="#/catalog"]').click();
      await p.locator('#portal-search').waitFor();
      assert.equal(await p.locator('.mobile-menu-toggle').getAttribute('aria-expanded'), 'false');
      await p.locator('.mobile-menu-toggle').click();
      await p.keyboard.press('Escape');
      assert.equal(await p.locator('.mobile-menu-toggle').getAttribute('aria-expanded'), 'false');
      await screenshot(`mobile-navigation-${width}`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: desktop/mobile, calculator, learning/review/verification, offline hash reload, no page errors.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
