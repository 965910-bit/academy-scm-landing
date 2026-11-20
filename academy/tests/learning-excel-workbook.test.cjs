const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const read = require('read-excel-file/node');
const filename = path.resolve(__dirname, '../guides/learning-library/excel-practice.xlsx');

test('Excel workbook is readable by an independent XLSX reader; source remains text', async () => {
  const sheets = await read(filename);
  assert.deepEqual(sheets.map(s => s.sheet), ['Readme', 'Raw', 'Work', 'Clean', 'Settings', 'Learner', 'Answer', 'Summary', 'Issues']);
  const raw = sheets.find(s => s.sheet === 'Raw').data;
  const work = sheets.find(s => s.sheet === 'Work').data;
  assert.equal(raw.length, 11);
  assert.deepEqual(raw, work);
  assert.equal(raw[1][4], '10');
  assert.equal(raw[7][5], null); // O006 unknown price, not zero.
  assert.equal(raw[10][4], '0'); // O009 preserved.
  const clean = sheets.find(s => s.sheet === 'Clean').data;
  assert.equal(clean.length, 8);
  assert.equal(clean[1][4], 10);
  assert.equal(clean[1][8], 1000);
  assert.equal(clean[3][9], 0); // pending does not contribute to paid amount.
});

test('Workbook caches agree with the published fictional case, not proof of native recalculation', async () => {
  const sheets = await read(filename);
  const answer = Object.fromEntries(sheets.find(s => s.sheet === 'Answer').data.slice(1));
  assert.equal(answer.valid_records, 7);
  assert.equal(answer.invalid_rows, 2);
  assert.equal(answer.duplicate_rows, 1);
  assert.equal(answer.paid_records, 5);
  assert.equal(answer.paid_units, 24);
  assert.equal(answer.all_amount, 5700);
  assert.equal(answer.paid_amount, 3500);
  assert.equal(answer.north_paid + answer.south_paid, answer.paid_amount);
  assert.ok(Math.abs(answer.weighted_price - 3500 / 24) < 1e-10);
  assert.ok(Math.abs(answer.defect_units_percent - 100 * 2 / 24) < 1e-10);
  assert.equal(answer.defect_rows_percent, 40);
  assert.equal(answer.reserve, 175);
  assert.equal(answer.total_with_reserve, 3675);
  assert.equal(answer.report_delta, -600);
  const learner = sheets.find(s => s.sheet === 'Learner').data;
  assert.deepEqual(learner[0], ['metric', 'value']);
  assert.equal(learner.length, 16);
  assert.ok(learner.slice(1).every(row => row[1] == null));
});
