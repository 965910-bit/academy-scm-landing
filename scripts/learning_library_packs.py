"""Render original course packs from versioned source JSON; no external fetching."""
import html
import csv
import io
import json
import zipfile

def validate_packs(data, catalog_ids):
    """Structural completeness only; never substitute this for expert review."""
    seen_ids, seen_slugs, seen_files = set(), set(), set()
    for course in data['courses']:
        cid = course['id']
        if cid not in catalog_ids or cid in seen_ids:
            raise ValueError('Unknown or duplicate course: ' + cid)
        seen_ids.add(cid)
        slug = course['slug']
        if slug in seen_slugs or any(ch not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for ch in slug) or not slug:
            raise ValueError('Unsafe or duplicate slug: ' + slug)
        seen_slugs.add(slug)
        for key in ['title','audience','prerequisites','duration','equipment','scope','legal_basis','teacher_notes','glossary']:
            if not course.get(key):raise ValueError(cid + ': missing ' + key)
        qids = [q['id'] for q in course['questions']]
        pids = [p['id'] for p in course['practice']['criteria']]
        if len(set(qids+pids)) != len(qids+pids):raise ValueError(cid + ': duplicate check ID')
        if len(qids)!=6 or sum(p['points'] for p in course['practice']['criteria'])!=12:
            raise ValueError(cid + ': scoring layout expects 6 questions and 12 practice points')
        for result in course['outcomes']:
            if not result['checks'] or not set(result['checks']) <= set(qids+pids):raise ValueError(cid + ': broken outcome coverage')
            if not 1 <= result['lesson'] <= len(course['lessons']):raise ValueError(cid + ': invalid lesson reference')
        for question in course['questions']:
            if not question.get('answer') or not question.get('reason'):raise ValueError(cid + ': missing answer explanation')
            if not 1 <= question['lesson'] <= len(course['lessons']):raise ValueError(cid + ': invalid answer reference')
        for lesson in course['lessons']:
            if not lesson.get('paragraphs') or not lesson.get('exercise') or not lesson.get('exercise_answer'):raise ValueError(cid + ': empty lesson')
        for key in ['scenario','deliverables','model','critical_errors']:
            if not course['practice'].get(key):raise ValueError(cid + ': missing practice ' + key)
        if not course.get('sources'):raise ValueError(cid + ': no source register')
        for source in course['sources']:
            for key in ['id','title','author','url','published','version','checked','access','license','use']:
                if not source.get(key):raise ValueError(cid + ': missing source ' + key)
            if not source['url'].startswith('https://'):raise ValueError(cid + ': unsafe source URL')
        template = course['template']
        filename = template['filename']
        if '/' in filename or '\\' in filename or not filename.endswith('.csv') or filename in seen_files:
            raise ValueError(cid + ': unsafe or duplicate template')
        seen_files.add(filename)
        if len(template['columns'])!=len(template['example']):raise ValueError(cid + ': template shape mismatch')


def markdown_pack(data, course):
    """Portable original text including OPEN answers; not a secure exam export."""
    lines = ['# '+course['title'], '', 'Автор: '+data['author'], 'Версия: '+data['version']+'; дата: '+data['date'],
             'Статус: вводный материал; экспертиза и апробация не пройдены. Ответы открыты для самопроверки.', '', data['rights'], '']
    for key, title in [('audience','Аудитория'),('prerequisites','Входные знания'),('duration','Маршрут'),('equipment','Оснащение'),('scope','Границы'),('legal_basis','Нормативная область')]:
        lines.extend(['## '+title, '', course[key], ''])
    lines.extend(['## Результаты обучения', ''])
    for result in course['outcomes']:lines.append('- '+result['id']+': '+result['text']+'; урок '+str(result['lesson'])+'; проверки '+', '.join(result['checks']))
    for n, lesson in enumerate(course['lessons'],1):
        lines.extend(['', '## '+str(n)+'. '+lesson['title'], ''])
        for paragraph in lesson['paragraphs']:lines.extend([paragraph,''])
        lines.extend(['### Задание', lesson['exercise'], '', '### Разбор задания', lesson['exercise_answer'], ''])
    lines.extend(['## Словарь',''])
    for term, definition in course['glossary'].items():lines.extend([term+': '+definition,''])
    p=course['practice'];lines.extend(['## Практика','',p['scenario'],'',p['deliverables'],''])
    for criterion in p['criteria']:lines.append('- '+criterion['id']+': '+criterion['text']+' — до '+str(criterion['points'])+' баллов')
    lines.extend(['','### Открытый эталон практики',p['model'],'','Критические ошибки:'])
    lines.extend('- '+x for x in p['critical_errors'])
    lines.extend(['','## Вопросы и открытые ответы',''])
    for q in course['questions']:
        lines.extend(['### '+q['id']+'. '+q['question'],'',q['answer'],'',q['reason'],
                      'Основание: урок '+str(q['lesson'])+' и вымышленный кейс данной версии.',''])
    lines.extend(['Шкала: до 2 баллов за вопрос (2 — верно с обоснованием, 1 — частично, 0 — неверно). Практика до 12 баллов (0–3 по каждому критерию). Всего 24; учебный ориентир 18 без критических ошибок, не квалификационная аттестация.','','## Преподавателю',''])
    lines.extend('- '+x for x in course['teacher_notes'])
    lines.extend(['','## Источники дополнительного чтения',''])
    for source in course['sources']:
        lines.extend([source['title']+' — '+source['url']])
        for key in ['author','published','version','checked','access','license','use']:lines.append(key+': '+source[key])
        lines.append('')
    lines.extend(['## Проверка и обновление','','Проверяющий специалист не назначен; апробация не выполнена. Проверить до организованного обучения и после изменений источников, правил, процессов или условий задания.'])
    return '\n'.join(lines)+'\n'


def render_packs(data, output, page):
    e = html.escape
    for course in data['courses']:
        cid = course['id']
        (output/(course['slug']+'.md')).write_text(markdown_pack(data,course))
        body = '<p>Вводный комплект написан. Профильная экспертиза, правовая проверка и апробация не пройдены. Версия ' + e(data['version']) + '.</p>'
        body += '<p><a href="' + course['id'] + '.json" download>Скачать исходный комплект JSON</a> · <a href="' + course['slug'] + '.md" download>Полный текст Markdown</a> · <a href="' + course['template']['filename'] + '" download>Рабочий шаблон CSV</a></p>'
        if course.get('downloads'):
            body += '<section><h2>Лабораторные файлы</h2><p>Скачайте все три файла в одну папку. Прочитайте исходники и запустите python3 run-digital-labs.py. Работа локальная, без сети и производственных данных.</p><ul>'
            for name, label in [('sql-lab.json','Вымышленная схема SQL, запросы и эталоны'),('python-lab.py','Открытая реализация Python'),('run-digital-labs.py','Проверка обеих лабораторий')]:
                body += '<li><a href="' + name + '" download>' + label + '</a></li>'
            body += '</ul></section>'
        body += '<nav aria-label="Разделы курса"><a href="#passport">Паспорт</a><a href="#lessons">Уроки</a><a href="#practice">Практика</a><a href="#answers">Ответы</a><a href="#sources">Источники</a></nav>'
        body += '<section id="passport"><h2>Паспорт и границы</h2>'
        for key, title in [('audience','Аудитория'),('prerequisites','Входные знания'),('duration','Маршрут'),('equipment','Оснащение'),('scope','Что не закрыто'),('legal_basis','Нормативная область')]:
            body += '<p><strong>' + title + '.</strong> ' + e(course[key]) + '</p>'
        body += '<p><strong>Автор.</strong> ' + e(data['author']) + '.</p><p>' + e(data['rights']) + '</p></section>'
        body += '<section><h2>Результаты обучения и программа</h2><ol>'
        for result in course['outcomes']:
            body += '<li>' + e(result['id'] + ': ' + result['text']) + '. Урок ' + str(result['lesson']) + '; проверка: ' + e(', '.join(result['checks'])) + '.</li>'
        body += '</ol><p>Для каждого урока: чтение, обсуждение примера, самостоятельное задание. Затем единая практика и самопроверка.</p></section><div id="lessons">'
        for n, lesson in enumerate(course['lessons'], 1):
            body += '<section id="lesson-' + str(n) + '"><h2>' + str(n) + '. ' + e(lesson['title']) + '</h2>'
            body += ''.join('<p>' + e(p) + '</p>' for p in lesson['paragraphs'])
            body += '<h3>Самостоятельное задание</h3><p>' + e(lesson['exercise']) + '</p><details><summary>Разбор задания урока</summary><p>' + e(lesson['exercise_answer']) + '</p><p>Допустимы эквивалентные обоснованные решения в пределах условий. Открытая самопроверка, не закрытый экзамен.</p></details></section>'
        body += '</div><section><h2>Словарь</h2><dl>'
        body += ''.join('<dt><strong>' + e(k) + '</strong></dt><dd>' + e(v) + '</dd>' for k, v in course['glossary'].items())
        p = course['practice']
        body += '</dl></section><section id="practice"><h2>Практическая работа</h2><p>' + e(p['scenario']) + '</p><h3>Что представить</h3><p>' + e(p['deliverables']) + '</p><h3>Критерии (до 12 баллов)</h3><ul>'
        body += ''.join('<li>' + e(x['id'] + ': ' + x['text']) + ' — до ' + str(x['points']) + ' баллов.</li>' for x in p['criteria'])
        body += '</ul><details><summary>Эталонный разбор</summary><p>' + e(p['model']) + '</p></details><h3>Критические ошибки</h3><ul>' + ''.join('<li>' + e(x) + '</li>' for x in p['critical_errors']) + '</ul></section>'
        body += '<section id="answers"><h2>Открытая база ответов для самопроверки</h2><p>Это не закрытый экзамен. Каждый ответ: 2 балла за верное решение с обоснованием; 1 — частично верное без существенного противоречия; 0 — неверное. Расчетный ответ допустим в эквивалентной форме, проценты округляются до 0,01 процентного пункта.</p>'
        for q in course['questions']:
            body += '<h3>' + e(q['id'] + '. ' + q['question']) + '</h3><details><summary>Ответ, основание и объяснение</summary><p>' + e(q['answer']) + '</p><p>' + e(q['reason']) + '</p><p>Основание: собственный учебный кейс и <a href="#lesson-' + str(q['lesson']) + '">урок ' + str(q['lesson']) + '</a>, версия ' + e(data['version']) + '.</p></details>'
        body += '<p>Максимум: 24 балла (12 вопросы + 12 практика). Учебный ориентир: от 18 баллов без критических ошибок. Это внутреннее правило самопроверки, не квалификационная аттестация. Исправления после обратной связи фиксируются отдельно.</p></section>'
        body += '<section><h2>Преподавателю</h2><ul>' + ''.join('<li>' + e(x) + '</li>' for x in course['teacher_notes']) + '</ul><p>Одна допустимая структура занятия: 5 минут — входной вопрос; 15 — объяснение; 10 — разбор примера; 10 — самостоятельное задание; 5 — обратная связь. При затруднениях повторить пример на меньшем объеме; не считать чтение доказательством освоения.</p></section>'
        body += '<section id="sources"><h2>Реестр источников</h2><p>Арифметика, примеры и ответы получены из вымышленных условий данного комплекта. Внешние ссылки — дополнительное чтение с указанным объемом проверки, не подтверждение всего содержания.</p>'
        for source in course['sources']:
            body += '<article><h3><a href="' + e(source['url'], quote=True) + '">' + e(source['id'] + ': ' + source['title']) + '</a></h3>'
            for key, title in [('author','Автор'),('published','Дата публикации'),('version','Версия'),('checked','Дата обращения'),('access','Что прочитано'),('license','Условия использования'),('use','Назначение')]:
                body += '<p><strong>' + title + ':</strong> ' + e(source[key]) + '</p>'
            body += '</article>'
        body += '</section><section><h2>Обновление и оставшиеся работы</h2><p>Дата выпуска: ' + e(data['date']) + '. Следующая проверка — до применения в организованном обучении, а также после изменения условий кейса, законодательства или процесса. Проверяющий специалист пока не назначен; апробация не выполнена. Для полноценного курса по профессии нужны дополнительные модули, предметные источники и необходимые практические компоненты.</p></section>'
        (output/(course['slug']+'.html')).write_text(page(course['title'], body))
        (output/(cid+'.json')).write_text(json.dumps({**{k: v for k,v in data.items() if k!='courses'}, 'course': course}, ensure_ascii=False, indent=2)+'\n')
        s=io.StringIO(); writer=csv.writer(s,lineterminator='\n'); writer.writerow(course['template']['columns']);writer.writerow(course['template']['example'])
        (output/course['template']['filename']).write_text('\ufeff'+s.getvalue())
    sources=[]
    for course in data['courses']:
        sources.extend({'course_id':course['id'],**source} for source in course['sources'])
    buffer=io.StringIO()
    writer=csv.DictWriter(buffer,fieldnames=list(sources[0]),lineterminator='\n')
    writer.writeheader();writer.writerows(sources)
    (output/'learning-sources.csv').write_text('\ufeff'+buffer.getvalue())
    # Portable package of the generated library. Exam secrecy is explicitly not promised.
    with zipfile.ZipFile(output/'learning-library.zip','w',zipfile.ZIP_DEFLATED) as z:
        for path in sorted(output.iterdir()):
            if path.is_file() and path.suffix in {'.html','.json','.csv','.py','.md','.js'}:z.write(path,path.name)


def render_review_ledger(ledger, expected_ids, output, page):
    """Publish editorial gaps without inventing reviewers or completed reviews."""
    materials=ledger['materials']
    if {m['id'] for m in materials}!=expected_ids or len(materials)!=len(expected_ids):
        raise ValueError('Review ledger IDs do not match material inventory')
    stages=['subject_review','legal_review','answer_review','pilot']
    labels=['Предметная проверка','Правовая применимость','Независимая проверка ответов','Апробация']
    rows=[]
    body='<p>'+html.escape(ledger['note'])+'</p><p><a href="review-ledger.json" download>Журнал JSON</a> · <a href="review-ledger.csv" download>Журнал CSV</a> · <a href="review-checklist.md" download>Чек-лист эксперта</a></p>'
    for material in materials:
        body+='<section><h2>'+html.escape(material['id'])+'</h2><ul>'
        for stage,label in zip(stages,labels):
            entry=material[stage]
            if entry['status'] not in {'pending','changes_requested','passed'}:raise ValueError('Invalid review status')
            if entry['status']=='passed' and not all(entry.get(k) for k in ['reviewer','date','evidence']):
                raise ValueError('Passed review lacks reviewer, date or evidence')
            status={'pending':'не выполнено','changes_requested':'нужны исправления','passed':'проверено по указанному основанию'}[entry['status']]
            body+='<li>'+label+': '+status+'. Проверяющий: '+html.escape(entry['reviewer'] or 'не назначен')+'.</li>'
            rows.append(dict(material_id=material['id'],stage=stage,**entry,open_issues=material['open_issues']))
        body+='</ul><p>'+html.escape(material['open_issues'])+'</p><p>Записей изменений: '+str(len(material['changes']))+'. Прохождение редакционных этапов не заменяет утверждение программы и применимые разрешения.</p>'
        for change in material['changes']:
            body+='<p>'+html.escape(change['date']+' · '+change['version']+' · '+change['author']+': '+change['change'])+'</p>'
        body+='</section>'
    (output/'review-ledger.html').write_text(page('Проверка материалов и незакрытые этапы',body))
    (output/'review-ledger.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
    buffer=io.StringIO();writer=csv.DictWriter(buffer,fieldnames=list(rows[0]),lineterminator='\n');writer.writeheader();writer.writerows(rows)
    (output/'review-ledger.csv').write_text('\ufeff'+buffer.getvalue())
