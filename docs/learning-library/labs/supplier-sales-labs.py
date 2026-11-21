"""Герасимов Дмитрий Сергеевич, v0.29.0, 2026-11-19.
Fictional snapshots only. Read-only CSV -> JSON, standard library, no network.
Not procurement approval, accounting, causal inference or an industrial validator.
"""
import argparse
import csv
from datetime import date
from fractions import Fraction
import json
from pathlib import Path
import re

SCHEMAS = {
 'supplier-deliveries.csv': ['obligation_id','supplier_id','due_date','received_date','ordered_units','received_units','accepted_units','unit_rub'],
 'sales-lines.csv': ['line_id','order_id','channel','units','unit_price_rub','unit_discount_rub','unit_cost_rub'],
 'sales-returns.csv': ['return_id','line_id','units','refund_rub'],
 'sales-channel-costs.csv': ['channel','advertising_rub','fees_rub','fulfillment_rub'],
}
CUTOFF = date(2026,11,10)


def rows(folder, name, allow_empty=False):
 with (Path(folder)/name).open(encoding='utf-8-sig',newline='') as f:
  reader=csv.DictReader(f)
  if reader.fieldnames!=SCHEMAS[name]:raise ValueError('Unexpected CSV schema: '+name)
  data=list(reader)
 validate(data,SCHEMAS[name],allow_empty)
 return data


def validate(data, columns, allow_empty=False):
 if not (0 if allow_empty else 1)<=len(data)<=1000:raise ValueError('Unexpected row count')
 seen=set()
 for row in data:
  if set(row)!=set(columns) or any(type(x) is not str or not x.strip() for x in row.values()):raise ValueError('Missing/extra/empty fields')
  key=row[columns[0]]
  if key in seen:raise ValueError('Duplicate key: '+key)
  seen.add(key)


def integer(text, positive=False):
 if type(text) is not str or not re.fullmatch(r'[0-9]{1,9}',text):raise ValueError('Expected bounded integer text')
 n=int(text)
 if n>10000000 or (positive and n==0):raise ValueError('Number outside domain')
 return n


def day(text):
 if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',text):raise ValueError('Expected ISO date')
 return date.fromisoformat(text)


def percent(n,d):
 return float(Fraction(n,d)*100) if d else None


def suppliers(data):
 validate(data,SCHEMAS['supplier-deliveries.csv'])
 groups={}
 for row in data:
  due=day(row['due_date'])
  if due>CUTOFF:raise ValueError('Only obligations due by snapshot cutoff')
  ordered=integer(row['ordered_units'],True);received=integer(row['received_units']);accepted=integer(row['accepted_units']);price=integer(row['unit_rub'])
  if not accepted<=received<=ordered:raise ValueError('Expected accepted <= received <= ordered')
  known=row['received_date']!='unknown'
  if known:
   actual=day(row['received_date'])
   if actual>CUTOFF or received==0:raise ValueError('Invalid recorded receipt date')
  elif received!=0 or accepted!=0:raise ValueError('Unknown receipt requires zero recorded quantities')
  g=groups.setdefault(row['supplier_id'],dict(obligations=0,known=0,unknown=0,on_time=0,otif=0,ordered=0,received=0,accepted=0,ordered_value_rub=0))
  g['obligations']+=1;g['known']+=int(known);g['unknown']+=int(not known)
  g['on_time']+=int(known and actual<=due)
  g['otif']+=int(known and actual<=due and accepted==ordered)
  g['ordered']+=ordered;g['received']+=received;g['accepted']+=accepted;g['ordered_value_rub']+=ordered*price
 total_value=sum(g['ordered_value_rub'] for g in groups.values())
 for g in groups.values():
  g.update(on_time_lower_percent=percent(g['on_time'],g['obligations']),on_time_upper_percent=percent(g['on_time']+g['unknown'],g['obligations']),
           otif_lower_percent=percent(g['otif'],g['obligations']),otif_upper_percent=percent(g['otif']+g['unknown'],g['obligations']),
           accepted_of_recorded_receipts_percent=percent(g['accepted'],g['received']),recorded_fill_percent=percent(g['received'],g['ordered']),
           ordered_value_share_percent=percent(g['ordered_value_rub'],total_value))
 return dict(cutoff=CUTOFF.isoformat(),suppliers=groups,limits='Unknown receipt is not proven non-delivery; intervals are logical bounds, not confidence intervals. No sanction or supplier award.')


def sales(lines,returns,costs):
 validate(lines,SCHEMAS['sales-lines.csv']);validate(returns,SCHEMAS['sales-returns.csv'],True);validate(costs,SCHEMAS['sales-channel-costs.csv'])
 channels={};by_line={};order_channels={};order_sets={}
 for row in lines:
  q=integer(row['units'],True);price=integer(row['unit_price_rub']);discount=integer(row['unit_discount_rub']);cost=integer(row['unit_cost_rub'])
  if discount>price:raise ValueError('Discount exceeds price')
  channel=row['channel'];oid=row['order_id']
  if oid in order_channels and order_channels[oid]!=channel:raise ValueError('Order has multiple channels')
  order_channels[oid]=channel;order_sets.setdefault(channel,set()).add(oid)
  g=channels.setdefault(channel,dict(gross_rub=0,discount_rub=0,billed_rub=0,refund_rub=0,sold_units=0,returned_units=0,sold_cost_rub=0,restored_cost_rub=0))
  g['gross_rub']+=q*price;g['discount_rub']+=q*discount;g['billed_rub']+=q*(price-discount);g['sold_cost_rub']+=q*cost;g['sold_units']+=q
  by_line[row['line_id']]=dict(channel=channel,units=q,returned=0,net_unit=price-discount,cost=cost)
 for row in returns:
  if row['line_id'] not in by_line:raise ValueError('Orphan return')
  line=by_line[row['line_id']];q=integer(row['units'],True);refund=integer(row['refund_rub']);line['returned']+=q
  if line['returned']>line['units'] or refund!=q*line['net_unit']:raise ValueError('Return outside fictional refund rules')
  g=channels[line['channel']];g['returned_units']+=q;g['refund_rub']+=refund;g['restored_cost_rub']+=q*line['cost']
 if {r['channel'] for r in costs}!=set(channels):raise ValueError('Exactly one cost row per active channel required')
 for row in costs:
  channel=row['channel'];g=channels[channel]
  for key in SCHEMAS['sales-channel-costs.csv'][1:]:g[key]=integer(row[key])
  g['orders']=len(order_sets[channel]);g['net_rub']=g['billed_rub']-g['refund_rub'];g['net_cost_rub']=g['sold_cost_rub']-g['restored_cost_rub']
  g['contribution_before_channel_rub']=g['net_rub']-g['net_cost_rub']
  g['contribution_after_channel_rub']=g['contribution_before_channel_rub']-sum(g[k] for k in SCHEMAS['sales-channel-costs.csv'][1:])
  g['average_order_rub']=float(Fraction(g['net_rub'],g['orders']))
  g['refund_of_billed_percent']=percent(g['refund_rub'],g['billed_rub'])
  g['net_revenue_per_ad_ruble']=float(Fraction(g['net_rub'],g['advertising_rub'])) if g['advertising_rub'] else None
 total={k:sum(g[k] for g in channels.values()) for k in ['gross_rub','discount_rub','billed_rub','refund_rub','net_rub','net_cost_rub','contribution_before_channel_rub','contribution_after_channel_rub','orders']}
 total['average_order_rub']=float(Fraction(total['net_rub'],total['orders']))
 total['refund_of_billed_percent']=percent(total['refund_rub'],total['billed_rub'])
 return dict(channels=channels,total=total,limits='Fictional fixed sales cohort and return window. Restored cost assumes reusable goods. Not net profit, accounting, attribution or causal advertising effect.')


def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--case',choices=['suppliers','sales','all'],default='all')
 parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent)
 args=parser.parse_args();report={}
 try:
  if args.case in {'suppliers','all'}:report['suppliers']=suppliers(rows(args.directory,'supplier-deliveries.csv'))
  if args.case in {'sales','all'}:report['sales']=sales(rows(args.directory,'sales-lines.csv'),rows(args.directory,'sales-returns.csv',True),rows(args.directory,'sales-channel-costs.csv'))
 except (OSError,ValueError,csv.Error) as e:parser.exit(2,'Case rejected: '+str(e)+'\n')
 print(json.dumps(report,ensure_ascii=False,indent=2))
 return 0


if __name__=='__main__':raise SystemExit(main())
