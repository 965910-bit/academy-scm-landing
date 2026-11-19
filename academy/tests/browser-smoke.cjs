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
    await tab('knowledge');
    assert.equal(await p.locator('[data-knowledge-bookmark]').count(),10);
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
    await role('admin'); await tab('library');
    assert.equal(await p.locator('[data-curriculum-module]').count(), 12);
    await screenshot('admin-content-library');
    await p.locator('[data-curriculum-module="procurement"]').click();
    await p.getByRole('heading', {name:'Практическое задание', exact:true}).waitFor();
    await tab('students');
    await p.locator('[name="name"]').fill('Участник 01');
    await p.locator('[name="cohort"]').fill('SCM-01');
    await p.locator('#curriculum-student button').click();
    await tab('allocations');
    await p.locator('[name="target"]').selectOption('group:SCM-01');
    await p.locator('[name="module"]').selectOption('track:intensive');
    await p.locator('[name="due"]').fill('2027-03-01');
    await p.locator('#curriculum-allocate button').click();
    await role('learner'); await tab('studyplan');
    assert.equal(await p.locator('[data-curriculum-allocation]').count(),3);
    await p.locator('[data-curriculum-allocation]').first().click();
    await p.locator('[name="answer"]').fill('Объясняю решение: учитываю ожидаемый спрос за поставку, страховой запас, независимость спроса и постоянный срок.');
    await p.locator('[data-save-draft]').click();
    await p.reload(); await role('learner'); await tab('planner');
    const calendarDownload=p.waitForEvent('download');
    await p.locator('[data-study-calendar]').click();
    const download=await calendarDownload;
    assert.equal(download.suggestedFilename(), 'scm-study-deadlines.ics');
    assert.match(fs.readFileSync(await download.path(), 'utf8'), /BEGIN:VCALENDAR/);
    await p.locator('[data-study-open]').first().click();
    assert.match(await p.locator('[name="answer"]').inputValue(), /Объясняю решение/);
    await p.locator('#curriculum-answer button:not([data-save-draft])').click();
    await role('teacher'); await tab('responses');
    await p.locator('[name="decision"]').selectOption('approved');
    await p.locator('[name="feedback"]').fill('Учебное решение рассмотрено по критериям. Допущения явно перечислены, требуется проверка перед применением.');
    await p.locator('[name="reviewed"]').check();
    await p.locator('.curriculum-review button').click();
    await p.getByText(/Проверено локально/).first().waitFor();
    await p.reload(); await role('learner'); await tab('studyplan');
    await p.getByText('Проверено локально',{exact:true}).waitFor();
    await role('learner'); await tab('decisionlab');
    await p.locator('#decision-calculate button').click();
    await p.locator('#decision-save [name="reason"]').fill('Выбор поставщика зависит не только от цены: проверяю пригодный выход, чувствительность к браку и условия компенсации.');
    await p.locator('#decision-save button').click();
    const reportDownload=p.waitForEvent('download');
    await p.locator('[data-decision-report]').first().click();
    const report=await reportDownload;
    assert.match(fs.readFileSync(await report.path(),'utf8'),/Без проверки преподавателем/);
    const templateDownload=p.waitForEvent('download');
    await p.locator('[data-decision-template="project"]').click();
    const template=await templateDownload;
    assert.match(fs.readFileSync(await template.path(),'utf8'),/Паспорт учебного SCM-проекта/);
    await p.locator('[data-decision-model="transport"]').click();
    await p.locator('#decision-calculate button').click();
    await p.getByRole('rowheader',{name:'Непокрытый спрос, ед.'}).waitFor();
    await screenshot('decision-lab-transport');
    await role('admin'); await tab('knowledge');
    await p.locator('#knowledge-search [name="query"]').fill('EPCIS');
    await p.locator('#knowledge-search button').click();
    assert.equal(await p.locator('[data-knowledge-bookmark]').count(),1);
    await p.locator('[data-knowledge-bookmark="epcis"]').click();
    await p.locator('#knowledge-assign [name="source"]').selectOption('epcis');
    await p.locator('#knowledge-assign [name="target"]').selectOption('group:SCM-01');
    await p.locator('#knowledge-assign [name="due"]').fill('2027-05-01');
    await p.locator('#knowledge-assign button').click();
    await role('learner'); await tab('studyplan');
    await p.locator('article.panel').filter({has:p.getByRole('heading',{name:'Работа с источником: GS1 · EPCIS и CBV',exact:true})}).locator('[data-curriculum-allocation]').click();
    assert.equal(await p.locator('.knowledge-related a').getAttribute('href'),'https://www.gs1.org/standards/epcis');
    await p.locator('[name="answer"]').fill('Для событий указываю объект, время с часовым поясом, место и операцию; документирую ключ для поиска дубликатов.');
    await p.locator('#curriculum-answer button:not([data-save-draft])').click();
    await role('teacher'); await tab('responses');
    assert.equal(await p.locator('.curriculum-review').count(),1);
    // Every role and cabinet screen remains usable on phone and tablet widths.
    for (const width of [320, 390, 768]) {
      await p.setViewportSize({ width, height: 844 });
      for (const r of ['applicant', 'learner', 'teacher', 'admin', 'employer']) {
        await role(r);
        const tabs = await p.locator('.sidebar [data-tab]').evaluateAll(items => items.map(e => e.dataset.tab));
        for (const t of tabs) {
          await tab(t);
          if (t === 'decisionlab') await p.locator('#decision-calculate button').click();
          if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
            console.log(await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => [e.tagName,e.className,e.getBoundingClientRect().width,e.getBoundingClientRect().right])));
            await screenshot(`overflow-${r}-${t}-${width}`);
          }
          assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${r}/${t} overflow at ${width}px`);
          assert.doesNotMatch(await p.locator('body').innerText(), /демо|demo/i, `${r}/${t} contains removed label`);
          if (width === 390 && ['knowledge', 'decisionlab', 'planner', 'monitoring', 'lab', 'directions', 'grading', 'library', 'allocations', 'studyplan', 'responses'].includes(t)) await screenshot(`mobile-${r}-${t}`);
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
