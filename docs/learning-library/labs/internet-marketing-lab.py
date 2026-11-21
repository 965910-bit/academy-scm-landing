"""Герасимов Дмитрий Сергеевич. v0.33.0, 2026-11-19.
Read-only fictional campaign cohort calculation, no ad/analytics account or network.
Attributed totals are not incremental effects, customer acquisition or net profit.
"""
import argparse
import csv
from fractions import Fraction
import io
import json
from pathlib import Path
import re

COLUMNS=['campaign_id','impressions','clicks','leads','orders','ad_spend_rub','net_revenue_rub','variable_cost_rub']
MAX_BYTES=65536


def integer(text):
 if type(text) is not str or not re.fullmatch(r'[0-9]{1,9}',text) or int(text)>100000000:raise ValueError('Expected bounded nonnegative integer text')
 return int(text)


def ratio(numerator,denominator,multiplier=1):
 return float(Fraction(numerator,denominator)*multiplier) if denominator else None


def measures(n):
 result=dict(n)
 result.update(ctr_percent=ratio(n['clicks'],n['impressions'],100),click_to_lead_percent=ratio(n['leads'],n['clicks'],100),
               lead_to_order_percent=ratio(n['orders'],n['leads'],100),click_to_order_percent=ratio(n['orders'],n['clicks'],100),
               cpc_rub=ratio(n['ad_spend_rub'],n['clicks']),cpl_rub=ratio(n['ad_spend_rub'],n['leads']),
               cost_per_attributed_order_rub=ratio(n['ad_spend_rub'],n['orders']),
               net_revenue_per_ad_ruble=ratio(n['net_revenue_rub'],n['ad_spend_rub']),
               contribution_before_ad_rub=n['net_revenue_rub']-n['variable_cost_rub'],
               contribution_after_ad_rub=n['net_revenue_rub']-n['variable_cost_rub']-n['ad_spend_rub'])
 return result


def calculate(rows):
 if not 1<=len(rows)<=100:raise ValueError('Expected 1..100 campaigns')
 campaigns=[];seen=set();totals={k:0 for k in COLUMNS[1:]}
 for row in rows:
  if set(row)!=set(COLUMNS) or any(type(v) is not str or not v.strip() for v in row.values()):raise ValueError('Missing/extra/empty fields')
  cid=row['campaign_id']
  if not re.fullmatch(r'[A-Z][A-Z0-9-]{0,19}',cid) or cid in seen:raise ValueError('Invalid or duplicate campaign ID')
  seen.add(cid);n={k:integer(row[k]) for k in COLUMNS[1:]}
  if not n['orders']<=n['leads']<=n['clicks']<=n['impressions']:raise ValueError('Outside fictional single-cohort funnel contract')
  if n['orders']==0 and (n['net_revenue_rub'] or n['variable_cost_rub']):raise ValueError('Zero orders require zero attributed revenue/variable cost in this case')
  campaigns.append(dict(campaign_id=cid,**measures(n)))
  for key in totals:totals[key]+=n[key]
 return dict(campaigns=campaigns,total=measures(totals),
             limits='Same fictional observation/return window; disjoint campaigns, one lead/order per click chain. No customer uniqueness, incrementality, forecasting, tax/net profit or authority to spend. Ratios use totals, not an unweighted mean.')


def read_case(directory):
 with (Path(directory)/'internet-marketing-case.csv').open('rb') as f:raw=f.read(MAX_BYTES+1)
 if len(raw)>MAX_BYTES:raise ValueError('CSV exceeds byte limit')
 reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig'),newline=''))
 if reader.fieldnames!=COLUMNS:raise ValueError('Unexpected CSV columns')
 return list(reader)


def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent)
 args=parser.parse_args()
 try:report=calculate(read_case(args.directory))
 except (OSError,ValueError,csv.Error) as error:parser.exit(2,'Case rejected: '+str(error)+'\n')
 print(json.dumps(report,ensure_ascii=False,indent=2));return 0


if __name__=='__main__':raise SystemExit(main())
