"""Build a small macro-free XLSX using stdlib; no claim of native Excel execution."""
import csv
import io
import runpy
import zipfile
from decimal import Decimal
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr


def build_excel_lab(source, output):
    lab = runpy.run_path(str(source/'labs/check-excel-results.py'))
    raw_text = (source/'labs/excel-orders.csv').read_text()
    raw = list(csv.DictReader(io.StringIO(raw_text)))
    clean, issues, duplicates, metrics = lab['analyze'](raw)
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator='\n')
    writer.writerow(['metric','value'])
    for name in metrics: writer.writerow([name,''])
    (output/'excel-answers-template.csv').write_text(buffer.getvalue())
    headers = list(raw[0])
    sheets = []
    sheets.append(('Readme', [
        ['Excel: вымышленные заказы; автор Герасимов Дмитрий Сергеевич'],
        ['Raw — исходник; Work — рабочая копия; Learner — ваши численные ответы.'],
        ['Clean и Answer — открытые эталоны. Сначала выполните задания самостоятельно.'],
        ['Макросов и внешних ссылок нет. Кеши вычислены Python, не нативным Excel.'],
        ['Проверьте пересчет при открытии. Совместимость интерфейса и локали не подтверждена.'],
        ['Журнал: O005 отрицательное количество; O006 пустая цена; один избыточный O003.'],
        ['Запуск: python3 check-excel-results.py --answers your-results.csv'],
        ['PASS проверяет числа, не формулы, диаграмму или профессиональную квалификацию.']]))
    raw_rows = [headers]+[[r[k] for k in headers] for r in raw]
    sheets += [('Raw',raw_rows),('Work',raw_rows)]
    clean_rows = [headers+['source_row','amount_rub','paid_amount_rub']]
    for n,r in enumerate(clean,2):
        values = [r[k] for k in headers]
        for index in [4,5,6]: values[index] = Decimal(values[index])
        values += [r['source_row'],(f'E{n}*F{n}',r['amount']),
                   (f'IF(D{n}="paid",I{n},0)',r['amount'] if r['status']=='paid' else 0)]
        clean_rows.append(values)
    sheets.append(('Clean',clean_rows))
    sheets.append(('Settings',[['parameter','value'],['reserve_rate',Decimal('.05')]]))
    sheets.append(('Learner',[['metric','value']]+[[k,''] for k in metrics]))
    formulas = {
        'valid_records':'COUNTA(Clean!A2:A8)', 'paid_records':'COUNTIFS(Clean!D2:D8,"paid")',
        'paid_units':'SUMIFS(Clean!E2:E8,Clean!D2:D8,"paid")', 'all_amount':'SUM(Clean!I2:I8)',
        'paid_amount':'SUM(Clean!J2:J8)',
        'north_paid':'SUMIFS(Clean!I2:I8,Clean!C2:C8,"north",Clean!D2:D8,"paid")',
        'south_paid':'SUMIFS(Clean!I2:I8,Clean!C2:C8,"south",Clean!D2:D8,"paid")',
        'weighted_price':'SUM(Clean!J2:J8)/SUMIFS(Clean!E2:E8,Clean!D2:D8,"paid")',
        'defect_units_percent':'100*SUMIFS(Clean!G2:G8,Clean!D2:D8,"paid")/SUMIFS(Clean!E2:E8,Clean!D2:D8,"paid")',
        'defect_rows_percent':'100*COUNTIFS(Clean!D2:D8,"paid",Clean!G2:G8,">0")/COUNTIFS(Clean!D2:D8,"paid")',
        'reserve':'SUM(Clean!J2:J8)*Settings!$B$2', 'total_with_reserve':'SUM(Clean!J2:J8)*(1+Settings!$B$2)',
        'report_delta':'2900-SUM(Clean!J2:J8)'}
    sheets.append(('Answer',[['metric','value']]+[[k,(formulas[k],v) if k in formulas else v] for k,v in metrics.items()]))
    sheets.append(('Summary',[['region','paid_amount_rub','paid_units'],['north','',''],['south','','']]))
    sheets.append(('Issues',[['source_row','record_id','rule','decision','reason']]))
    ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    def column(n):
        result=''
        while n: n,r=divmod(n-1,26);result=chr(65+r)+result
        return result
    def sheet_xml(rows):
        body=''
        for row_n,values in enumerate(rows,1):
            cells=''
            for col_n,value in enumerate(values,1):
                ref=column(col_n)+str(row_n)
                if isinstance(value,tuple):
                    formula,cached=value
                    cells+=f'<c r="{ref}"><f>{escape(formula)}</f><v>{cached}</v></c>'
                elif isinstance(value,(int,Decimal)):
                    cells+=f'<c r="{ref}"><v>{value}</v></c>'
                else:
                    cells+=f'<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{escape(str(value))}</t></is></c>'
            body+=f'<row r="{row_n}">{cells}</row>'
        return f'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="{ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>{body}</sheetData></worksheet>'
    content_types='<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1,len(sheets)+1))+'</Types>'
    files={'[Content_Types].xml':content_types,
           '_rels/.rels':f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>',
           'xl/workbook.xml':f'<workbook xmlns="{ns}" xmlns:r="{rel}"><sheets>'+''.join(f'<sheet name={quoteattr(name)} sheetId="{i}" r:id="rId{i}"/>' for i,(name,_) in enumerate(sheets,1))+'</sheets><calcPr calcId="0" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>',
           'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join(f'<Relationship Id="rId{i}" Type="{rel}/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,len(sheets)+1))+'</Relationships>'}
    files.update({f'xl/worksheets/sheet{i}.xml':sheet_xml(rows) for i,(_,rows) in enumerate(sheets,1)})
    with zipfile.ZipFile(output/'excel-practice.xlsx','w',zipfile.ZIP_DEFLATED) as archive:
        for name,text in files.items():
            info=zipfile.ZipInfo(name,date_time=(2026,11,19,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            archive.writestr(info,text.encode('utf-8'))
    return metrics
