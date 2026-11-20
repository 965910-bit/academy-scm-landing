'use strict';
// Local filtering only: no API, tracking, storage or transmission of answers.
(() => {
  const form = document.getElementById('answer-search');
  if (!form) return;
  const query = document.getElementById('answer-query');
  const kind = document.getElementById('answer-kind');
  const counter = document.getElementById('answer-count');
  const empty = document.getElementById('answer-empty');
  const normalize = text => text.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();
  const records = Array.from(document.querySelectorAll('#answer-records article')).map(element => ({
    element, kind: element.dataset.kind, text: normalize(element.textContent)
  }));
  function filter() {
    const words = normalize(query.value).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const record of records) {
      const visible = (kind.value === 'all' || record.kind === kind.value) && words.every(word => record.text.includes(word));
      record.element.hidden = !visible;
      if (visible) count++;
    }
    counter.textContent = `Показано: ${count} из ${records.length}`;
    empty.hidden = count > 0;
  }
  form.addEventListener('submit', event => { event.preventDefault(); filter(); });
  query.addEventListener('input', filter);
  kind.addEventListener('change', filter);
  form.addEventListener('reset', () => {
    query.value = '';
    kind.value = 'all';
    filter();
  });
  filter();
})();
