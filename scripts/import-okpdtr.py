#!/usr/bin/env python3
"""Reproducible OK 016-2025 import. Never substitute OK 016-94 or a sample.
Run on an internet-connected machine: pip install beautifulsoup4; python scripts/import-okpdtr.py
Input is the public reproduction of the classifier, not its publisher's editorial content.
"""
import argparse, concurrent.futures, hashlib, json, re, time, urllib.request
from pathlib import Path
from bs4 import BeautifulSoup

def read_page(section, index):
    url=f'https://bizlog.ru/okpdtr/{section}_{index}.htm'
    raw=None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'SCM-Academy-classifier-import/1.0'}),timeout=45) as response:
                raw=response.read()
            break
        except Exception:
            if attempt==2: raise
            time.sleep(2+attempt)
    text=raw.decode('utf-8',errors='replace')
    if 'Наименование' not in text:
        text=raw.decode('cp1251')
    soup=BeautifulSoup(text,'html.parser'); records=[]
    for tr in soup.select('tr'):
        cells=tr.find_all(['td','th'],recursive=False)
        values=[' '.join(c.get_text(' ',strip=True).split()) for c in cells]
        if len(values)!=(5 if section==3 else 4) or not re.fullmatch(r'[12]\d{5}',values[0]): continue
        code,name=values[:2]
        records.append({'code':code,'name':name,'kind':'worker' if section==3 else 'employee','etks':values[2] if section==3 else '', 'category':values[2] if section==4 else '', 'okz':values[3], 'grades':values[4] if section==3 else '', 'source':url})
    if not records: raise ValueError('No records: '+url)
    return records,{'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'rows':len(records)}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',default='academy/classifiers/okpdtr.json');ap.add_argument('--as-of',default='2026-11-19');args=ap.parse_args()
    records={};pages=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures=[pool.submit(read_page,s,i) for s,count in [(3,26),(4,25)] for i in range(1,count+1)]
        for future in concurrent.futures.as_completed(futures):
            rows,page=future.result();pages.append(page)
            for row in rows:
                if row['code'] in records and records[row['code']]!=row: raise ValueError('Conflicting code '+row['code'])
                records[row['code']]=row
    for first,last in [(100001,105597),(200001,204338)]:
        missing=[str(code) for code in range(first,last+1) if str(code) not in records]
        if missing: raise ValueError('Incomplete classifier: '+','.join(missing[:20]))
    if len(records)!=9935: raise ValueError('Unexpected count '+str(len(records)))
    out={'edition':'ОК 016-2025','effectiveFrom':'2026-01-01','checkedAt':args.as_of,'count':len(records),'coverage':'Полный исходный перечень: 5597 профессий рабочих и 4338 должностей служащих. Актуальность последующих изменений проверяется отдельно.','authority':'Приказ Росстандарта от 16.05.2025 № 423-ст','source':'https://bizlog.ru/okpdtr/','referenceArticle':'https://www.tspor.ru/article/2784-okpdtr-klassifikator-dolzhnostej-i-professij','pages':sorted(pages,key=lambda x:x['url']),'records':sorted(records.values(),key=lambda r:r['code'])}
    path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
    print(f'Imported {len(records)} records from {len(pages)} pages into {path}')
if __name__=='__main__': main()
