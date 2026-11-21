"""Герасимов Дмитрий Сергеевич. v0.31.0, 2026-11-19.
Fictional serial warehouse simulator. CSV/JSON reads only, no source writes/network.
Not a WMS product, scanner, GS1 implementation, concurrency or safety validation.
"""
import argparse
import copy
import csv
from datetime import date, timedelta
import json
from pathlib import Path
import re

CUTOFF=date(2026,11,19)
MIN_REMAINING_DAYS=3
SCHEMAS={
 'warehouse-stock.csv':['bin_id','sku','lot','expiry','units','status'],
 'warehouse-orders.csv':['line_id','order_id','sku','units'],
}


def integer(text):
 if type(text) is not str or not re.fullmatch(r'[0-9]{1,7}',text) or int(text)>1000000:raise ValueError('Expected bounded integer text')
 return int(text)


def validate(rows,columns):
 if not 1<=len(rows)<=1000:raise ValueError('Expected 1..1000 rows')
 seen=set()
 for row in rows:
  if set(row)!=set(columns) or any(type(v) is not str or not v.strip() for v in row.values()):raise ValueError('Unexpected/missing/empty fields')
  key=row[columns[0]]
  if key in seen:raise ValueError('Duplicate key')
  seen.add(key)


def read_csv(folder,name):
 with (Path(folder)/name).open(encoding='utf-8-sig',newline='') as f:
  reader=csv.DictReader(f)
  if reader.fieldnames!=SCHEMAS[name]:raise ValueError('Unexpected schema: '+name)
  rows=list(reader)
 validate(rows,SCHEMAS[name]);return rows


def load(stock_rows,order_rows):
 validate(stock_rows,SCHEMAS['warehouse-stock.csv']);validate(order_rows,SCHEMAS['warehouse-orders.csv'])
 stock={};orders={}
 for row in stock_rows:
  if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['expiry']):raise ValueError('Expected ISO expiry')
  expiry=date.fromisoformat(row['expiry'])
  if row['status'] not in {'available','quarantine'}:raise ValueError('Unknown stock status')
  stock[row['bin_id']]=dict(sku=row['sku'],lot=row['lot'],expiry=expiry.isoformat(),on_hand=integer(row['units']),status=row['status'])
 for row in order_rows:
  n=integer(row['units'])
  if n==0:raise ValueError('Positive order units required')
  order=orders.setdefault(row['order_id'],{})
  order[row['sku']]=order.get(row['sku'],0)+n
 return stock,orders


def eligible(item):
 return item['status']=='available' and date.fromisoformat(item['expiry'])>=CUTOFF+timedelta(days=MIN_REMAINING_DAYS)


def held_units(holds,bin_id):
 return sum(a['units'] for hold in holds.values() for a in hold['allocations'] if a['bin_id']==bin_id)


def plan(stock,orders,order_id,holds=None):
 holds=holds or {}
 if order_id not in orders:raise ValueError('Unknown order')
 allocations=[];shortages={}
 for sku,needed in sorted(orders[order_id].items()):
  candidates=sorted((b for b in stock if stock[b]['sku']==sku and eligible(stock[b])),key=lambda b:(stock[b]['expiry'],b))
  remaining=needed
  for b in candidates:
   free=stock[b]['on_hand']-held_units(holds,b)
   n=min(remaining,free)
   if n>0:allocations.append(dict(bin_id=b,sku=sku,lot=stock[b]['lot'],units=n,picked=0))
   remaining-=n
   if remaining==0:break
  if remaining:shortages[sku]=remaining
 return dict(order_id=order_id,complete=not shortages,shortages=shortages,
             allocations=allocations if not shortages else [],
             limits='Whole-order plan. FEFO by expiry then bin ID, not an optimal travel route. Quarantine and insufficient shelf life excluded.')


class Warehouse:
 def __init__(self,stock,orders):
  self.stock=copy.deepcopy(stock);self.orders=copy.deepcopy(orders);self.holds={};self.terminal={};self.seen=set()

 def snapshot(self):
  return copy.deepcopy(dict(stock=self.stock,holds=self.holds,terminal=self.terminal))

 def apply(self,event):
  before=self.snapshot()
  try:
   if type(event) is not dict or not all(type(event.get(k)) is str and event[k].strip() for k in ['event_id','action','order_id']):raise ValueError('Invalid event envelope')
   event_id=event['event_id']
   if event_id in self.seen:raise ValueError('Duplicate event ID; replay is rejected, not idempotent success')
   self.seen.add(event_id)
   action=event['action'];oid=event['order_id']
   required={'event_id','action','order_id'}|({'bin_id','sku','lot','units'} if action=='pick' else set())
   if set(event)!=required:raise ValueError('Unexpected action fields')
   if oid not in self.orders:raise ValueError('Unknown order')
   if oid in self.terminal:raise ValueError('Terminal order cannot change')
   if action=='reserve':
    if oid in self.holds:raise ValueError('Already reserved')
    proposed=plan(self.stock,self.orders,oid,self.holds)
    if not proposed['complete']:raise ValueError('Insufficient eligible free stock: '+json.dumps(proposed['shortages'],sort_keys=True))
    self.holds[oid]=dict(allocations=proposed['allocations'])
   elif action=='pick':
    if oid not in self.holds:raise ValueError('No reservation')
    for key in ['bin_id','sku','lot']:
     if type(event[key]) is not str:raise ValueError('Invalid scan fields')
    n=integer(event['units'])
    if n==0:raise ValueError('Positive pick required')
    matches=[a for a in self.holds[oid]['allocations'] if all(a[k]==event[k] for k in ['bin_id','sku','lot'])]
    if len(matches)!=1 or matches[0]['picked']+n>matches[0]['units']:raise ValueError('Scan mismatch or quantity above reserved remainder')
    if not eligible(self.stock[event['bin_id']]):raise ValueError('Stock no longer eligible')
    matches[0]['picked']+=n
   elif action=='ship':
    if oid not in self.holds or any(a['picked']!=a['units'] for a in self.holds[oid]['allocations']):raise ValueError('Order not fully picked')
    for a in self.holds[oid]['allocations']:
     if not eligible(self.stock[a['bin_id']]):raise ValueError('Stock no longer eligible')
     self.stock[a['bin_id']]['on_hand']-=a['units']
    del self.holds[oid];self.terminal[oid]='shipped'
   elif action=='cancel':
    if oid not in self.holds:raise ValueError('No reservation')
    if any(a['picked'] for a in self.holds[oid]['allocations']):raise ValueError('Picked goods require separate supervised put-back, not automatic cancellation')
    del self.holds[oid];self.terminal[oid]='cancelled'
   else:raise ValueError('Unknown action')
   self.check()
  except ValueError as error:
   self.stock=before['stock'];self.holds=before['holds'];self.terminal=before['terminal']
   return dict(event_id=event.get('event_id') if type(event) is dict else None,accepted=False,error=str(error),inventory_unchanged=self.snapshot()==before)
  return dict(event_id=event_id,accepted=True)

 def check(self):
  for b,item in self.stock.items():
   if not 0<=held_units(self.holds,b)<=item['on_hand']:raise ValueError('Stock conservation invariant failed')
  for hold in self.holds.values():
   for a in hold['allocations']:
    if not 0<=a['picked']<=a['units']:raise ValueError('Pick invariant failed')


def unique_object(pairs):
 result={}
 for key,value in pairs:
  if key in result:raise ValueError('Duplicate JSON key')
  result[key]=value
 return result


def run_wms(stock,orders,events):
 if type(events) is not list or not 1<=len(events)<=1000:raise ValueError('Expected 1..1000 event objects')
 w=Warehouse(stock,orders);results=[w.apply(e) for e in events]
 return dict(results=results,final=w.snapshot(),limits='Sequential in-memory demonstration, not persistent transactions/concurrency. Failed commands do not change inventory; their event IDs remain consumed in the audit set. No real scan, authorization, physical movement or production WMS.')


def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--case',choices=['picking','wms','all'],default='all')
 parser.add_argument('--order',default='O01',help='Order used only for picking plan')
 parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent)
 args=parser.parse_args()
 try:
  stock,orders=load(read_csv(args.directory,'warehouse-stock.csv'),read_csv(args.directory,'warehouse-orders.csv'));report={}
  if args.case in {'picking','all'}:report['picking']=plan(stock,orders,args.order)
  if args.case in {'wms','all'}:
   with (args.directory/'warehouse-events.json').open(encoding='utf-8') as f:events=json.load(f,object_pairs_hook=unique_object)
   report['wms']=run_wms(stock,orders,events)
 except (OSError,ValueError,csv.Error) as e:parser.exit(2,'Case rejected: '+str(e)+'\n')
 print(json.dumps(report,ensure_ascii=False,indent=2));return 0


if __name__=='__main__':raise SystemExit(main())
