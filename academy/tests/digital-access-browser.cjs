'use strict';
// Real Chromium checks; not a screen-reader, human pilot or WCAG certification.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
(async () => {
  assert.ok(process.env.CHROMIUM_PATH, 'Set CHROMIUM_PATH to a trusted installed Chromium executable.');
  const file = path.resolve(__dirname, '../guides/learning-library/digital-access-practice.html');
  const url = pathToFileURL(file).href;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const checks = [];
  const errors = [], requests = [];
  const context = await browser.newContext({ offline: true, viewport: { width: 1280, height: 900 } });
  context.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  try {
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    assert.equal(await page.locator('h1').count(), 1);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), '#task');
    await page.keyboard.press('Enter');
    // Traverse with keyboard only until submit, then trigger missing-group feedback.
    for (let i = 0; i < 20; i++) {
      if (await page.evaluate(() => document.activeElement.type === 'submit')) break;
      await page.keyboard.press('Tab');
    }
    assert.equal(await page.evaluate(() => document.activeElement.type), 'submit');
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#result').textContent(), /Осталось: 4/);
    assert.equal(await page.evaluate(() => document.activeElement.name), 's1');
    const focus = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }; });
    assert.notEqual(focus.style, 'none'); assert.ok(focus.width >= 3);
    checks.push({ id: 'B1', result: 'pass', evidence: 'Tab/Enter traversal to submit; missing=4 focuses s1; computed outline at least3px.' });
    // Native arrow/space selection and Tab traversal, no DOM assignment or check().
    await page.keyboard.press('ArrowRight'); // first group b
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.name), 's2');
    await page.keyboard.press('Space'); // second group a
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.name), 's3');
    await page.keyboard.press('ArrowRight'); // third group b
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.name), 's4');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.type), 'submit');
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#result').textContent(), /4 из 4/);
    assert.equal(await page.locator('details[open]').count(), 4);
    checks.push({ id: 'B2', result: 'pass', evidence: 'Native Tab/ArrowRight/Space/Enter selects b,a,b,b, reports4/4, opens4 explanations.' });
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.type), 'reset');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('input:checked').count(), 0);
    assert.equal(await page.locator('details[open]').count(), 0);
    assert.match(await page.locator('#result').textContent(), /Выбор сброшен/);
    checks.push({ id: 'B3', result: 'pass', evidence: 'Keyboard reset clears selections, disclosures and previous result.' });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow at width ' + width);
      assert.ok(await page.locator('[type=submit]').isVisible());
    }
    checks.push({ id: 'B4', result: 'pass', evidence: 'No document horizontal overflow at320/390/768/1440CSSpx; submit visible. Not a visual audit.' });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => { document.body.style.fontSize = '36px'; });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    checks.push({ id: 'B5', result: 'pass', evidence: '36px body text (200% of18px) at320CSSpx: no horizontal overflow. Not browser zoom or OS magnifier testing.' });
    await page.reload();
    assert.equal(await page.locator('input:checked').count(), 0);
    assert.match(await page.locator('#result').textContent(), /еще не проверены/);
    checks.push({ id: 'B6', result: 'pass', evidence: 'Fresh reload resets transient choices; local file loaded with network offline.' });
    const nojs = await browser.newContext({ javaScriptEnabled: false, offline: true, viewport: { width: 320, height: 900 } });
    try {
      const p = await nojs.newPage();
      await p.goto(url);
      assert.equal(await p.locator('fieldset').count(), 4);
      assert.equal(await p.locator('[type=submit]').isDisabled(), true);
      assert.equal(await p.locator('[type=reset]').isDisabled(), true);
      await p.locator('details summary').first().click();
      assert.equal(await p.locator('details[open]').count(), 1);
      assert.ok(await p.locator('details[open] p').first().isVisible());
      assert.ok(await p.locator('noscript').isVisible());
      checks.push({ id: 'B7', result: 'pass', evidence: 'JavaScript-disabled offline context:4groups, buttons disabled, native disclosure opens readable answer, noscript visible.' });
    } finally { await nojs.close(); }
    const mutant = await context.newPage();
    try {
      await mutant.setViewportSize({ width: 320, height: 900 });
      await mutant.setContent(fs.readFileSync(file, 'utf8').replace('body{overflow-wrap:anywhere;', 'body{'));
      await mutant.evaluate(() => { document.body.style.fontSize = '36px'; });
      assert.ok(await mutant.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Regression oracle must detect removed heading wrapping.');
      checks.push({ id: 'B9', result: 'pass', evidence: 'Removing body overflow-wrap reproduces overflow at320CSSpx/36px text; unchanged file passesB5. Mutation is in-memory only.' });
    } finally { await mutant.close(); }
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    checks.push({ id: 'B8', result: 'pass', evidence: 'No pageerror in scripted context; no HTTP(S) requests in scripted context. No remote integration tested.' });
    process.stdout.write(JSON.stringify({ schema_version: 1, author: 'Герасимов Дмитрий Сергеевич', library_version: '0.36.0', date: '2026-11-19', status: 'automated_browser_checks_only', target: 'digital-access-practice.html', runner_sha256: createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'), target_sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex'), browser: { engine: 'Chromium', version: browser.version(), headless: true }, tool: { name: 'playwright-core', version: require('playwright-core/package.json').version }, checks, not_checked: ['Screen readers and assistive technology announcements', 'Human keyboard or usability session', 'Browser zoom/OS magnification', 'Firefox/WebKit and other browser/OS combinations', 'Independent subject/legal/answer review', 'Learner pilot or complete WCAG conformance', 'Server permissions and production browser behavior'] }, null, 2) + '\n');
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
