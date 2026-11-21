"""Герасимов Дмитрий Сергеевич. v0.39.0, 2026-11-19.
Read-only fictional stock-count reconciliation, not an inventory adjustment.
"""
import argparse
from collections import Counter
import csv
import io
import json
from pathlib import Path
import re

COLUMNS=['position_id','sku','location','lot','unit','book_qty','count_qty','recount_qty','cost_kopecks']
STATUSES=('matched','not_counted','recount_required','recount_conflict','repeated_difference')


def number(value,optional=False):
 if optional and value=='':return None
 if type(value) is not str or not re.fullmatch(r'[0-9]{1,7}',value) or int(value)>1000000:raise ValueError('Expected bounded integer text0..1000000')
 return int(value)


def reconcile(rows):
 if type(rows) is not list or not 1<=len(rows)<=100:raise ValueError('Expected1..100 positions')
 seen=set();keys=set();results=[]
 for row in rows:
  if type(row) is not dict or set(row)!=set(COLUMNS):raise ValueError('Unexpected position schema')
  for key in ['position_id','sku','location','lot']:
   if type(row[key]) is not str or not re.fullmatch(r'[A-Z][A-Z0-9]{0,19}',row[key]):raise ValueError('Invalid identifier')
  pid=row['position_id'];identity=tuple(row[k] for k in ['sku','location','lot'])
  if pid in seen or identity in keys:raise ValueError('Duplicate position ID or identity')
  seen.add(pid);keys.add(identity)
  if row['unit']!='pcs':raise ValueError('Only fictional piece counts are supported')
  book=number(row['book_qty']);count=number(row['count_qty'],True);recount=number(row['recount_qty'],True);cost=number(row['cost_kopecks'])
  if count is None and recount is not None:raise ValueError('Recount without initial count')
  initial_delta=None if count is None else count-book
  delta=None
  if count is None:status='not_counted'
  elif recount is not None and recount!=count:status='recount_conflict'
  elif count==book:status='matched';delta=0
  elif recount is None:status='recount_required'
  else:status='repeated_difference';delta=count-book
  results.append(dict(position_id=pid,sku=row['sku'],location=row['location'],lot=row['lot'],unit='pcs',cost_kopecks=cost,book_qty=book,count_qty=count,recount_qty=recount,initial_delta_qty=initial_delta,status=status,repeated_delta_qty=delta,repeated_value_kopecks=None if delta is None else delta*cost))
 counts=Counter(r['status'] for r in results)
 values=[r['repeated_value_kopecks'] for r in results if r['status']=='repeated_difference']
 plus=sum(v for v in values if v>0);minus=sum(v for v in values if v<0)
 return dict(fictional=True,policy_version='0.39.0',snapshot='S01: fictional single cut-off, movements assumed paused; not independently verified',positions=results,summary=dict(status_counts={s:counts[s] for s in STATUSES},unresolved_positions=sum(counts[s] for s in ['not_counted','recount_required','recount_conflict']),repeated_surplus_value_kopecks=plus,repeated_shortage_value_kopecks=minus,repeated_net_value_kopecks=plus+minus,repeated_gross_value_kopecks=plus-minus),limits='Repeated observations only, not approved corrections, proof of cause, accounting entries, offset permission or employee liability. No stock/ledger writes.')


def read_case(directory):
 with (Path(directory)/'storekeeper-count-case.csv').open('rb') as stream:raw=stream.read(65537)
 if len(raw)>65536:raise ValueError('CSV too large')
 reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig'),newline=''),strict=True)
 if reader.fieldnames!=COLUMNS:raise ValueError('Unexpected CSV columns')
 rows=[]
 for row in reader:
  rows.append(row)
  if len(rows)>100:raise ValueError('Too many positions')
 return rows


def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent);args=parser.parse_args()
 try:report=reconcile(read_case(args.directory))
 except (OSError,ValueError,TypeError,UnicodeError,csv.Error) as error:
  import sys
  print('Input rejected: '+str(error),file=sys.stderr);return 2
 print(json.dumps(report,ensure_ascii=False,indent=2));return 0


if __name__=='__main__':raise SystemExit(main())
