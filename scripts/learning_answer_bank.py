"""Consolidated PUBLIC self-check answers; never a protected examination bank."""
import csv
import html
import io
import json
from pathlib import Path


def build_answer_bank(packs, foundation, output, page):
    (output/'answer-bank.js').write_bytes((Path(__file__).parent/'learning-answer-bank.js').read_bytes())
    entries = []
    def add(cid, title, kind, local_id, prompt, answer, explanation, url):
        entries.append(dict(id=cid+'-'+local_id, course_id=cid, course_title=title,
                            kind=kind, prompt=prompt, answer=answer,
                            explanation=explanation, material_url=url,
                            author=packs['author'], library_version=packs['version']))
    for c in packs['courses']:
        url=c['slug']+'.html'
        for q in c['questions']:
            add(c['id'],c['title'],'question',q['id'],q['question'],q['answer'],
                q['reason']+' Основание: урок '+str(q['lesson'])+' и собственный вымышленный кейс.',url+'#lesson-'+str(q['lesson']))
        for n,l in enumerate(c['lessons'],1):
            add(c['id'],c['title'],'exercise',f'L{n:02}',l['exercise'],l['exercise_answer'],
                'Самопроверка по условиям урока; допустимы эквивалентные обоснованные решения.',url+'#lesson-'+str(n))
        p=c['practice']
        add(c['id'],c['title'],'practice','PRACTICE',p['scenario']+' '+p['deliverables'],p['model'],
            'Критерии: '+'; '.join(x['text']+f" ({x['points']} балла)" for x in p['criteria'])+
            '. Критические ошибки: '+'; '.join(p['critical_errors']),url+'#practice')
    cid=foundation['id']; title=foundation['title']; url='foundation-data.html'
    for q in foundation['assessment']:
        add(cid,title,'question',q['id'],q['question'],q['answer'],q['rationale']+' Основание: учебный набор и уроки версии 0.1.0.',url)
    for n,l in enumerate(foundation['lessons'],1):
        add(cid,title,'exercise',f'L{n:02}',l['exercise'],l['exercise_answer'],'Основание: вымышленный набор A001–A005 и условия урока.',url)
    add(cid,title,'practice','PRACTICE',foundation['practice']['task'],
        'Сохранить исходник. A003 дедуплицировать по условию; A004/A005 уточнить. На допустимых A001–A003: 35 единиц, 4000 ₽, 114,29 ₽/ед.; 5,71% дефектных единиц и 66,67% строк с дефектом. Раскрыть исключения.',
        '; '.join(x['criterion']+f" ({x['points']} балла)" for x in foundation['practice']['rubric']),url)
    if len({e['id'] for e in entries})!=len(entries):raise ValueError('Duplicate answer IDs')
    payload={'version':packs['version'],'date':packs['date'],
             'notice':'Публичная база самопроверки; не использовать как секретный экзамен. Материалы не прошли профильную экспертизу.',
             'counts':{kind:sum(e['kind']==kind for e in entries) for kind in ['question','exercise','practice']},
             'entries':entries}
    (output/'answer-bank.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    buffer=io.StringIO();writer=csv.DictWriter(buffer,fieldnames=list(entries[0]),lineterminator='\n');writer.writeheader();writer.writerows(entries)
    (output/'answer-bank.csv').write_text('\ufeff'+buffer.getvalue())
    e=html.escape
    body='<p>'+e(payload['notice'])+'</p><p>Ответы, разборы уроков и практики собраны вместе. Автор собственного изложения: '+e(packs['author'])+'.</p><p><a href="answer-bank.json" download>JSON</a> · <a href="answer-bank.csv" download>CSV</a></p>'
    body+='<noscript><p>Поиск требует JavaScript; без него все записи доступны ниже, используйте поиск браузера.</p></noscript><form id="answer-search" role="search"><label for="answer-query">Поиск по курсу, вопросу и ответу</label><input id="answer-query" name="q" type="search" autocomplete="off"><label for="answer-kind">Тип задания</label><select id="answer-kind"><option value="all">Все</option><option value="question">Контрольные вопросы</option><option value="exercise">Задания уроков</option><option value="practice">Практические работы</option></select><button type="reset">Сбросить</button></form><p id="answer-count" role="status" aria-live="polite">Всего записей: '+str(len(entries))+'</p><p id="answer-empty" hidden>Ничего не найдено. Измените запрос или сбросьте фильтр.</p><div id="answer-records">'
    labels={'question':'Контрольный вопрос','exercise':'Задание урока','practice':'Практическая работа'}
    for entry in entries:
        body+='<article data-kind="'+entry['kind']+'" id="'+e(entry['id'])+'"><p>'+e(entry['id']+' · '+labels[entry['kind']])+'</p><h2>'+e(entry['course_title'])+'</h2><h3>'+e(entry['prompt'])+'</h3><details><summary>Ответ и основание</summary><p>'+e(entry['answer'])+'</p><p>'+e(entry['explanation'])+'</p></details><a href="'+e(entry['material_url'],quote=True)+'">Открыть материал и условия</a></article>'
    body+='</div><script src="answer-bank.js" defer></script>'
    (output/'answer-bank.html').write_text(page('Открытая база ответов и разборов',body))
    return payload['counts']
