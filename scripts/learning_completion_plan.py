"""Render the frozen 65-title backlog against today's catalog, without granting completion."""
import csv
import html
import io
import json


def render_completion_plan(plan, catalog, output, page):
    current = {c['id']: c for direction in catalog for c in direction['courses']}
    entries = plan['courses']
    ids = [row['id'] for row in entries]
    if len(ids) != 65 or len(set(ids)) != 65 or not set(ids) <= set(current):
        raise ValueError('Expected 65 unique baseline catalog IDs')
    rows = []
    for entry in entries:
        for key in ['content_to_develop', 'practice_evidence_to_obtain', 'blocking_limits']:
            if not entry.get(key):
                raise ValueError('Missing course-specific work: ' + entry['id'])
        course = current[entry['id']]
        # No expert decision is inferred from files, test passes, or catalog status.
        rows.append(dict(entry, current_catalog_status=course['status'],
                         introduction_url=course.get('url'), full_completion='not_demonstrated'))
    planned = sum(r['current_catalog_status'] == 'planned' for r in rows)
    introductions = sum(r['current_catalog_status'] == 'introductory_written_unreviewed' for r in rows)
    data = dict(plan, courses=rows, progress=dict(baseline_titles=65, still_planned=planned,
                introductions_written_unreviewed=introductions, full_completion_demonstrated=0))
    summary = f'Из исходных 65 названий: {planned} пока без вводного комплекта; {introductions} получили вводные комплекты. Полное завершение ни одного из этих 65 курсов не подтверждено.'
    lines = ['# План разработки исходных 65 курсов', '',
             plan['author'] + '. Версия ' + plan['version'] + ' от ' + plan['date'] + '.', '',
             plan['note'], '', summary, '', '## Общие условия завершения', '']
    lines += [f'{i}. {gate}' for i, gate in enumerate(plan['completion_gates'], 1)]
    e = html.escape
    body = '<p>' + e(plan['note']) + '</p><p><strong>' + e(summary) + '</strong></p>'
    body += '<p><a href="remaining-65-plan.json" download>План JSON</a> · <a href="remaining-65-plan.csv" download>Таблица CSV</a> · <a href="remaining-65-plan.md" download>Полный текст Markdown</a> · <a href="review-ledger.html">Этапы экспертиз</a></p>'
    body += '<h2>Общие условия завершения</h2><ol>' + ''.join('<li>' + e(t) + '</li>' for t in plan['completion_gates']) + '</ol>'
    labels = [('content_to_develop', 'Содержание'), ('practice_evidence_to_obtain', 'Практика и свидетельства'), ('blocking_limits', 'Блокирующие ограничения')]
    for row in rows:
        title = row['id'] + ' — ' + row['title']
        status = 'Запланирован; вводный комплект не написан' if row['current_catalog_status'] == 'planned' else 'Вводный комплект написан, не прошел экспертизы; полный курс не закрыт'
        lines += ['', '## ' + title, '', row['direction'], '', status + '. Полное завершение не подтверждено.']
        body += '<section id="' + e(row['id'], quote=True) + '"><h2>' + e(title) + '</h2><p>' + e(row['direction']) + '</p><p>' + e(status) + '. Полное завершение не подтверждено.</p>'
        for key, label in labels:
            lines += ['', '**' + label + ':** ' + row[key]]
            body += '<p><strong>' + label + '.</strong> ' + e(row[key]) + '</p>'
        if row['introduction_url']:
            lines += ['', 'Вводный материал: ' + row['introduction_url']]
            body += '<p><a href="' + e(row['introduction_url'], quote=True) + '">Вводный материал и открытые ответы</a></p>'
        body += '</section>'
    (output / 'remaining-65-plan.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    (output / 'remaining-65-plan.md').write_text('\n'.join(lines) + '\n')
    (output / 'remaining-65-plan.html').write_text(page('План разработки исходных 65 курсов', body))
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(rows[0]), lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
    (output / 'remaining-65-plan.csv').write_text('\ufeff' + buffer.getvalue())
    return data['progress']
