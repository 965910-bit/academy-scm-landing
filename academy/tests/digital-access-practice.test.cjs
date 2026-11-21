const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../guides/learning-library');
const file = fs.readFileSync(path.join(root, 'digital-access-practice.html'), 'utf8');
function setup(script = true) {
  const dom = new JSDOM(file, { runScripts: 'outside-only', url: 'file:///course/digital-access-practice.html' });
  if (script) dom.window.eval(dom.window.document.querySelector('script').textContent);
  return dom;
}
function choose(d, values) {
  Object.entries(values).forEach(([key, value]) => { d.querySelector(`input[name=${key}][value=${value}]`).checked = true; });
}
function submit(dom) {
  const event = new dom.window.Event('submit', { bubbles: true, cancelable: true });
  dom.window.document.getElementById('decisions').dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
}
test('offline practice exposes structured tasks, labels, status and visible focus rules', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    assert.equal(d.documentElement.lang, 'ru');
    assert.equal(d.querySelectorAll('h1').length, 1);
    assert.equal(d.querySelectorAll('fieldset').length, 4);
    for (const group of d.querySelectorAll('fieldset')) {
      assert.ok(group.querySelector('legend').textContent.trim());
      assert.equal(group.querySelectorAll('label > input[type=radio]').length, 2);
    }
    assert.equal(d.getElementById('result').getAttribute('role'), 'status');
    assert.equal(d.getElementById('result').getAttribute('aria-live'), 'polite');
    assert.match(d.querySelector('style').textContent, /focus-visible/);
    assert.equal(d.querySelector('[type=submit]').disabled, false);
  } finally { dom.window.close(); }
});
test('missing decisions focus first missing group and do not produce partial score', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    submit(dom);
    assert.match(d.getElementById('result').textContent, /Осталось: 4/);
    assert.equal(d.activeElement.name, 's1');
    choose(d, { s1: 'b', s2: 'a' });
    submit(dom);
    assert.match(d.getElementById('result').textContent, /Осталось: 2/);
    assert.equal(d.activeElement.name, 's3');
    assert.equal(d.querySelectorAll('details[open]').length, 0);
  } finally { dom.window.close(); }
});
test('independent answer oracle and corrections update feedback without navigation or persistence', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    choose(d, { s1: 'a', s2: 'b', s3: 'a', s4: 'a' });
    submit(dom);
    assert.match(d.getElementById('result').textContent, /0 из 4/);
    assert.equal(d.querySelectorAll('details[open]').length, 4);
    choose(d, { s1: 'b', s2: 'a', s3: 'b', s4: 'b' });
    submit(dom);
    assert.match(d.getElementById('result').textContent, /4 из 4/);
    assert.match(d.getElementById('result').textContent, /не аттестация/);
    assert.equal(dom.window.location.href, 'file:///course/digital-access-practice.html');
  } finally { dom.window.close(); }
});
test('reset clears decisions, disclosures and result; subsequent attempt is independent', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    choose(d, { s1: 'b', s2: 'a', s3: 'b', s4: 'b' }); submit(dom);
    d.getElementById('decisions').reset();
    assert.equal(d.querySelectorAll('input:checked').length, 0);
    assert.equal(d.querySelectorAll('details[open]').length, 0);
    assert.match(d.getElementById('result').textContent, /Выбор сброшен/);
    submit(dom);
    assert.match(d.getElementById('result').textContent, /Осталось: 4/);
  } finally { dom.window.close(); }
});
test('without scripts all tasks and full textual alternatives remain; automatic buttons disabled', () => {
  const dom = setup(false);
  try {
    const d = dom.window.document;
    assert.equal(d.querySelectorAll('fieldset').length, 4);
    assert.equal(d.querySelectorAll('details').length, 4);
    for (const detail of d.querySelectorAll('details')) assert.ok(detail.querySelector('p').textContent.length > 50);
    for (const button of d.querySelectorAll('button')) assert.equal(button.disabled, true);
    assert.match(d.querySelector('noscript').textContent, /все задания|Все задания/);
    assert.equal(d.querySelector('input[type=text],textarea'), null);
  } finally { dom.window.close(); }
});
test('public practice is byte-identical to source and self-contained with no storage or network code', () => {
  const source = path.resolve(__dirname, '../../docs/learning-library/labs/digital-access-practice.html');
  assert.equal(file, fs.readFileSync(source, 'utf8'));
  const dom = setup(false);
  try {
    const d = dom.window.document;
    assert.equal(d.querySelector('script[src],link[rel=stylesheet],iframe,img,video,audio'), null);
    assert.doesNotMatch(d.querySelector('script').textContent, /fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|\.cookie|innerHTML/);
    assert.equal(d.querySelectorAll('input').length, 8);
    for (const a of d.querySelectorAll('a')) assert.doesNotMatch(a.getAttribute('href'), /^(https?:)?\/\//);
  } finally { dom.window.close(); }
});
test('all sixteen answer combinations match independent expected counts and fresh loads retain nothing', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    for (let mask = 0; mask < 16; mask++) {
      const answers = ['s1', 's2', 's3', 's4'].map((key, index) => [key, (mask & (1 << index)) ? 'b' : 'a']);
      choose(d, Object.fromEntries(answers)); submit(dom);
      const expected = answers.reduce((sum, [key, value]) => sum + Number(value === (key === 's2' ? 'a' : 'b')), 0);
      assert.match(d.getElementById('result').textContent, new RegExp(`${expected} из 4`));
    }
  } finally { dom.window.close(); }
  const fresh = setup();
  try {
    assert.equal(fresh.window.document.querySelectorAll('input:checked').length, 0);
    assert.equal(fresh.window.document.querySelectorAll('details[open]').length, 0);
  } finally { fresh.window.close(); }
});
