"""Build the public, explicitly draft dossier. No customer records or secrets."""
from pathlib import Path
import csv, html, io, json, math, re, shutil, zipfile
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'docs/project-dossier-2026'
OUT=ROOT/'academy/guides/project-dossier'
AUTHOR='Герасимов Дмитрий Сергеевич'

def calculate(x):
    rows=[]
    for name,s in x['scenarios'].items():
        n=s['sales_month']; price=s['price']; billed=n*price
        refunds=billed*s['refund_rate']; revenue=billed-refunds
        delivery=n*s['delivery_cost']; acquiring=billed*x['acquiring_rate']
        ai=n*x['ai_cost_per_sale']; variable=delivery+acquiring+ai
        gross=revenue-variable; marketing=n*s['cac']; contribution=gross-marketing
        fixed=sum(x['fixed_monthly'].values()); operating=contribution-fixed
        tax=max(0,revenue*x['tax_reserve_rate']); net=operating-tax
        unit=contribution/n; posttax_unit=(contribution-tax)/n
        be=math.ceil(fixed/posttax_unit) if posttax_unit>0 else None
        rows.append(dict(scenario=name,sales=n,price=price,billed=billed,refunds=refunds,revenue=revenue,delivery=delivery,acquiring=acquiring,ai=ai,gross_profit=gross,gross_margin_pct=100*gross/revenue,marketing=marketing,contribution=contribution,contribution_margin_pct=100*contribution/revenue,fixed=fixed,operating_profit=operating,tax_reserve=tax,model_net_profit=net,net_margin_pct=100*net/revenue,markup_on_variable_pct=100*gross/variable,break_even_sales=be,unit_contribution=unit,posttax_unit_contribution=posttax_unit))
    return rows

def render(text):
    def inline(s):
        s=html.escape(s)
        s=re.sub(r'\[([^\]]+)\]\(([^ )]+)\)',r'<a href="\2">\1</a>',s)
        s=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
        return re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
    out=[];table=[]
    def flush():
        if table:
            out.append('<div class="table-scroll" tabindex="0" role="region" aria-label="Таблица документа"><table>')
            for i,row in enumerate(table):
                tag='th' if i==0 else 'td'
                out.append('<tr>'+''.join(f'<{tag}>'+inline(c)+f'</{tag}>' for c in row)+'</tr>')
            out.append('</table></div>');table.clear()
    for line in text.splitlines():
        if line.startswith('|'):
            cells=[c.strip() for c in line.strip('|').split('|')]
            if not all(re.fullmatch(r'[-: ]+',c) for c in cells): table.append(cells)
            continue
        flush()
        if line.startswith('#'):
            n=min(len(line)-len(line.lstrip('#'))+1,6)
            out.append(f'<h{n}>'+inline(line.lstrip('# '))+f'</h{n}>')
        elif line.startswith('- '):out.append('<p>• '+inline(line[2:])+'</p>')
        elif line.strip():out.append('<p>'+inline(line)+'</p>')
    flush();return '\n'.join(out)

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    x=json.loads((SRC/'economics/inputs.json').read_text());rows=calculate(x)
    stream=io.StringIO();w=csv.DictWriter(stream,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
    (SRC/'economics/scenarios.csv').write_text(stream.getvalue())
    base=next(r for r in rows if r['scenario']=='base')
    balance=-sum(x['launch_costs'].values());cash=[]
    for month,n in enumerate(x['ramp_sales'],1):
        contribution=n*base['posttax_unit_contribution'];flow=contribution-base['fixed'];balance+=flow
        cash.append(dict(month=month,sales=n,net_cash_flow=round(flow,2),closing_cash_without_funding=round(balance,2)))
    s=io.StringIO();w=csv.DictWriter(s,fieldnames=cash[0].keys());w.writeheader();w.writerows(cash)
    (SRC/'economics/cashflow.csv').write_text(s.getvalue())
    sensitivity=[]
    for price in [12000,15000,18000]:
        for cac in [2500,4000,6500]:
            v=json.loads(json.dumps(x));v['scenarios']={'sensitivity':dict(x['scenarios']['base'],price=price,cac=cac)}
            r=calculate(v)[0];sensitivity.append({k:r[k] for k in ['price','marketing','model_net_profit','net_margin_pct','break_even_sales']}|{'cac':cac})
    s=io.StringIO();w=csv.DictWriter(s,fieldnames=sensitivity[0].keys());w.writeheader();w.writerows(sensitivity)
    (SRC/'economics/sensitivity.csv').write_text(s.getvalue())
    report='# Пересчитываемые результаты модели\n\nСценарные гипотезы, рубли в месяц. Не фактическая отчётность.\n\n'
    report+='| Сценарий | Продаж | Выручка после возвратов | Валовая прибыль | Валовая маржа, % | Маржинальная прибыль после CAC | Операционная прибыль | Условная чистая прибыль | Чистая маржа, % | Безубыточность, продаж |\n|---|---|---|---|---|---|---|---|---|---|\n'
    for r in rows:
        vals=[r[k] for k in ['scenario','sales','revenue','gross_profit','gross_margin_pct','contribution','operating_profit','model_net_profit','net_margin_pct','break_even_sales']]
        report+='| '+' | '.join(f'{v:,.2f}'.replace(',',' ') if isinstance(v,float) else ('Нет при этих параметрах' if v is None else str(v)) for v in vals)+' |\n'
    need=-min(c['closing_cash_without_funding'] for c in cash)
    report+=f'\nЗапуск: {sum(x["launch_costs"].values()):,.0f} ₽. Пиковый накопленный дефицит при заданном разгоне: {need:,.0f} ₽. С резервом 20%: {need*1.2:,.0f} ₽.\n'
    payback=next((c['month'] for c in cash if c['closing_cash_without_funding']>=0),None)
    report+=f'\nРасчётный выход накопленного потока в плюс: месяц {payback}, только при заданном разгоне и неизменных удельных затратах. Это не обещание окупаемости.\n'
    report+='\nПервый положительный месячный поток не означает окупаемости: последняя требует выхода накопленного потока в плюс. В таблице cashflow стартовые вложения включены до первого месяца. Оборотный капитал, отсрочки B2B и рассрочки требуют отдельной модели.\n\n### Что здесь может пойти не так\n- Налоговый резерв не совпадёт с фактическим режимом.\n- CAC увеличится при масштабировании.\n- Оплаты и оказание услуг разойдутся по времени.\n'
    (SRC/'07-calculated-results.md').write_text(report)
    files=sorted(SRC.rglob('*'));links=[];sections=[]
    for p in files:
        if not p.is_file():continue
        rel=p.relative_to(SRC);target=OUT/'files'/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
        if p.suffix=='.md':
            text=p.read_text();title=text.splitlines()[0].lstrip('# ');anchor='doc-'+str(len(sections)+1)
            links.append(f'<li><a href="#{anchor}">{html.escape(title)}</a> · <a download href="files/{rel.as_posix()}">MD</a></li>')
            sections.append(f'<section id="{anchor}">'+render(text)+'</section>')
    css='body{font:17px/1.65 system-ui;background:#f4f6f8;color:#142538;margin:0}header,main,footer{max-width:1160px;margin:auto;padding:24px}header{border-bottom:1px solid #bdcbd5}a{color:#075db4}h1{font-size:clamp(30px,5vw,52px);line-height:1.15}h2{line-height:1.25}section{background:white;margin:26px 0;padding:clamp(16px,4vw,40px);border:1px solid #d7e0e7;border-radius:12px;scroll-margin-top:16px}aside{padding:20px;background:#fff1d6;border-left:4px solid #a56800}.table-scroll{overflow:auto}table{border-collapse:collapse;min-width:650px;width:100%;font-size:14px}td,th{padding:10px;border:1px solid #cdd6df;text-align:left;vertical-align:top}nav li{margin:8px 0}code{overflow-wrap:anywhere}a:focus-visible{outline:3px solid #c55c00} @media print{header,nav,.downloads{display:none}section{break-before:page;border:0;padding:0}.table-scroll{overflow:visible}table{min-width:0;font-size:9px}body{font-size:11px;background:white}h1{font-size:26px}}'
    page='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Паспорт проекта, документация и экономика — Академия SCM</title><meta name="description" content="Основатель и разработчик — Герасимов Дмитрий Сергеевич. Правовые проекты, техническая архитектура, исследования и пересчитываемая экономика."><style>'+css+'</style></head><body><header><a href="../../">Академия SCM</a> / <a href="../">База знаний</a> / Документация проекта</header><main id="content"><h1>Паспорт, документация и экономика проекта</h1><p><strong>Основатель и разработчик: '+AUTHOR+'</strong></p><p>Редакция 1.0 · 19.11.2026 · по поручению основателя</p><aside>Проекты для заполнения и утверждения, не заключение о соответствии. Экономика — открытая сценарная модель без реальных клиентских данных. Реквизиты оператора и лицензия не подтверждены. Серверная миграция и полноценный аудит не выполнены.</aside><p class="downloads"><a download href="project-dossier.zip">Скачать весь комплект ZIP</a> · <a href="files/economics/scenarios.csv">Сценарии CSV</a> · <a href="files/economics/cashflow.csv">Денежный поток CSV</a> · <a href="files/economics/sensitivity.csv">Чувствительность CSV</a> · <a href="files/economics/inputs.json">Допущения JSON</a></p><p>Печать всего комплекта / сохранение в PDF — через команду печати браузера. Документы в ZIP сохраняют вложенные папки.</p><nav aria-label="Документы комплекта"><ol>'+''.join(links)+'</ol></nav>'+''.join(sections)+'</main><footer><a href="../market-research/">Исследование платформ и конкурентов</a> · <a href="../completion-ledger/">108 требований: фактические статусы</a><p>Основатель и разработчик — '+AUTHOR+'. Указание роли основателя проекта не заменяет сведения об учредителях юридического лица и документы о правах на сторонний код.</p></footer></body></html>'
    (OUT/'index.html').write_text(page)
    with zipfile.ZipFile(OUT/'project-dossier.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in SRC.rglob('*'):
            if p.is_file():z.write(p,'project-dossier/'+p.relative_to(SRC).as_posix())
    print(f'Built {len(sections)} documents; scenarios={len(rows)}; peak funding={need:.2f}')

if __name__=='__main__':main()
