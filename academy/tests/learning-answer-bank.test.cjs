const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../guides/learning-library');
function setup() {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'answer-bank.html'), 'utf8'), { runScripts: 'outside-only' });
  dom.window.eval(fs.readFileSync(path.join(root, 'answer-bank.js'), 'utf8'));
  return dom;
}
function visible(dom) { return [...dom.window.document.querySelectorAll('#answer-records article')].filter(el => !el.hidden); }
test('answer bank starts with every public answer and offline links', () => {
  const dom = setup();
  try {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'answer-bank.json'), 'utf8'));
    assert.equal(visible(dom).length, data.entries.length);
    assert.equal(data.entries.length, 758);
    assert.match(dom.window.document.getElementById('answer-count').textContent, /758 из 758/);
    assert.match(dom.window.document.querySelector('noscript').textContent, /все записи доступны/);
  } finally { dom.window.close(); }
});
test('kind filtering and multiple-word search include answer text', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    d.getElementById('answer-kind').value = 'question';
    d.getElementById('answer-kind').dispatchEvent(new dom.window.Event('change'));
    assert.equal(visible(dom).length, 416);
    d.getElementById('answer-query').value = 'поставки 24000';
    d.getElementById('answer-query').dispatchEvent(new dom.window.Event('input'));
    assert.ok(visible(dom).length > 0);
    assert.ok(visible(dom).every(el => el.dataset.kind === 'question' && el.textContent.includes('24000')));
  } finally { dom.window.close(); }
});
test('zero results and reset are accessible and restore defaults', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    d.getElementById('answer-query').value = 'невстречающийся_запрос_123456';
    d.getElementById('answer-query').dispatchEvent(new dom.window.Event('input'));
    assert.equal(visible(dom).length, 0);
    assert.equal(d.getElementById('answer-empty').hidden, false);
    d.getElementById('answer-search').reset();
    assert.equal(visible(dom).length, 758);
    assert.equal(d.getElementById('answer-empty').hidden, true);
    assert.equal(d.getElementById('answer-count').getAttribute('aria-live'), 'polite');
  } finally { dom.window.close(); }
});
test('query is treated as text, not HTML, and submit does not navigate', () => {
  const dom = setup();
  try {
    const d = dom.window.document;
    d.getElementById('answer-query').value = '<img src=x onerror="window.injected=true">';
    const event = new dom.window.Event('submit', { cancelable: true });
    d.getElementById('answer-search').dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(visible(dom).length, 0);
    assert.equal(dom.window.injected, undefined);
    assert.equal(d.querySelector('#answer-records img'), null);
  } finally { dom.window.close(); }
});
