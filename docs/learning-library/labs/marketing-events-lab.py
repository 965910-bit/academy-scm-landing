"""Герасимов Дмитрий Сергеевич, v0.34.0, 2026-11-19.
Fictional event reconciliation only; no accounting, network or advertising launch.
"""
import argparse
import csv
from datetime import date
import io
import json
from pathlib import Path
import re

COLUMNS=['event_id','kind','order_id','campaign_id','date','amount_rub']
START='2026-10-01'
END='2026-10-31'
CUTOFF='2026-11-07'


def reconcile(rows):
 if not 1<=len(rows)<=1000:raise ValueError('Expected 1..1000 event rows')
 seen={};unique=[];duplicates=[]
 for index,row in enumerate(rows,2):
  if set(row)!=set(COLUMNS):raise ValueError('Unexpected schema')
  for key in ['event_id','order_id','campaign_id']:
   if type(row[key]) is not str or not re.fullmatch(r'[A-Z][A-Z0-9]{0,19}',row[key]):raise ValueError('Invalid identifier')
  if row['kind'] not in ('sale','refund'):raise ValueError('Invalid kind')
  if type(row['date']) is not str or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['date']):raise ValueError('Invalid ISO date')
  date.fromisoformat(row['date'])
  amount=row['amount_rub']
  if type(amount) is not str or not re.fullmatch(r'[0-9]{1,9}',amount) or not 1<=int(amount)<=100000000:raise ValueError('Invalid positive integer rubles')
  eid=row['event_id']
  if eid in seen:
   if seen[eid]!=row:raise ValueError('Conflicting event ID')
   duplicates.append({'line':index,'event_id':eid,'reason':'exact_duplicate'});continue
  seen[eid]=dict(row);unique.append(dict(row))
 sales={}
 for row in unique:
  if row['kind']=='sale':
   oid=row['order_id']
   if oid in sales:raise ValueError('Multiple sale events for order')
   sales[oid]=row
 refunded={}
 for row in unique:
  if row['kind']=='refund':
   sale=sales.get(row['order_id'])
   if sale is None or row['campaign_id']!=sale['campaign_id'] or row['date']<sale['date']:raise ValueError('Unmatched or inconsistent refund')
   oid=row['order_id'];refunded[oid]=refunded.get(oid,0)+int(row['amount_rub'])
   if refunded[oid]>int(sale['amount_rub']):raise ValueError('Refund exceeds sale')
 campaigns={};excluded=[]
 for row in unique:
  sale=sales[row['order_id']]
  reason=None
  if not START<=sale['date']<=END:reason='outside_sale_cohort'
  elif row['kind']=='refund' and row['date']>CUTOFF:reason='after_refund_cutoff'
  if reason:
   excluded.append({'event_id':row['event_id'],'reason':reason});continue
  c=campaigns.setdefault(row['campaign_id'],dict(orders=0,gross_rub=0,refund_rub=0,net_rub=0))
  if row['kind']=='sale':c['orders']+=1;c['gross_rub']+=int(row['amount_rub'])
  else:c['refund_rub']+=int(row['amount_rub'])
 for c in campaigns.values():c['net_rub']=c['gross_rub']-c['refund_rub']
 total={key:sum(c[key] for c in campaigns.values()) for key in ['orders','gross_rub','refund_rub','net_rub']}
 return dict(window=dict(start=START,end=END,refund_cutoff=CUTOFF),campaigns=dict(sorted(campaigns.items())),total=total,duplicates=duplicates,excluded=excluded,input_rows=len(rows),unique_events=len(unique))


def read_case(directory):
 with (Path(directory)/'marketing-events-case.csv').open('rb') as stream:raw=stream.read(65537)
 if len(raw)>65536:raise ValueError('CSV too large')
 reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig'),newline=''),strict=True)
 if reader.fieldnames!=COLUMNS:raise ValueError('Unexpected CSV columns')
 rows=[]
 for row in reader:
  rows.append(row)
  if len(rows)>1000:raise ValueError('Too many event rows')
 return rows


def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent);args=parser.parse_args()
 try:result=reconcile(read_case(args.directory))
 except (OSError,ValueError,UnicodeError,csv.Error,TypeError) as error:
  import sys
  print('Input rejected: '+str(error),file=sys.stderr);return 2
 print(json.dumps(result,ensure_ascii=False,indent=2));return 0


if __name__=='__main__':raise SystemExit(main())
