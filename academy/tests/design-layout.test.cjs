'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../guides/learning-library');
const file = fs.readFileSync(path.join(root, 'design-layout-example.html'), 'utf8');
function setup() { return new JSDOM(file, { runScripts: 'outside-only' }); }
test('design project uses semantic hierarchy and labelled sections, not text baked into images', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    assert.equal(d.documentElement.lang, 'ru');
    assert.equal(d.querySelectorAll('h1').length, 1);
    assert.equal(d.querySelectorAll('main').length, 1);
    assert.equal(d.querySelector('img,canvas,iframe,svg'), null);
    for (const region of d.querySelectorAll('[aria-labelledby]')) {
      const label = d.getElementById(region.getAttribute('aria-labelledby'));
      assert.ok(label && label.textContent.trim());
    }
    assert.equal(new Set([...d.querySelectorAll('[id]')].map(n => n.id)).size, d.querySelectorAll('[id]').length);
  } finally { dom.window.close(); }
});
test('design primary action has a real local target; disclosure content exists without script', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    assert.equal(d.querySelector('.action').getAttribute('href'), '#practice');
    assert.ok(d.getElementById('practice'));
    for (const a of d.querySelectorAll('a[href^="#"]')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)));
    const details = d.querySelector('details');
    assert.match(details.querySelector('summary').textContent, /разбор/);
    assert.match(details.querySelector('p').textContent, /Имя файла не подтверждает/);
    assert.equal(details.open, false); details.open = true;
    assert.equal(details.open, true); // DOM property only, not a claim about keyboard/browser use.
    assert.equal(d.querySelector('script,form,input,button'), null);
  } finally { dom.window.close(); }
});
test('design tokens correspond to declared numerical pairs while focus/reflow rules remain separate', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    const css = d.querySelector('style').textContent;
    const data = JSON.parse(fs.readFileSync(path.join(root, 'design-contrast-case.json'), 'utf8'));
    const pairs = Object.fromEntries(data.pairs.map(p => [p.pair_id, p]));
    assert.match(css, /--ink:#17283A/); assert.match(css, /--accent:#123F65/); assert.match(css, /--paper:#FFFFFF/);
    assert.equal(pairs.C08.foreground, '#123F65'); assert.equal(pairs.C08.background, '#FFFFFF');
    assert.equal(pairs.C09.foreground, '#17283A'); assert.equal(pairs.C10.background, '#123F65');
    assert.match(css, /focus-visible/); assert.match(css, /overflow-wrap:anywhere/); assert.match(css, /@media/);
    assert.match(d.querySelector('#handover').parentElement.textContent, /не объявлен полностью доступным/);
    // These checks do not render CSS or establish visual/assistive-technology conformance.
  } finally { dom.window.close(); }
});
test('design artifact is original-source identical, has no external resources and makes no working-registration promise', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    const source = path.resolve(__dirname, '../../docs/learning-library/labs/design-layout-example.html');
    assert.equal(file, fs.readFileSync(source, 'utf8'));
    assert.equal(d.querySelector('script[src],link[rel=stylesheet],img,video,audio,iframe'), null);
    for (const a of d.querySelectorAll('a')) assert.doesNotMatch(a.getAttribute('href'), /^(?:https?:)?\/\//);
    assert.match(d.querySelector('.notice').textContent, /Запись на обучение, оплата, лицензия, аккредитация и проведение занятия здесь не оформлены/);
    assert.match(d.querySelector('footer').textContent, /Герасимов|правообладателем/);
    assert.doesNotMatch(file, /<form|fetch\s*\(|localStorage|sessionStorage/);
  } finally { dom.window.close(); }
});
