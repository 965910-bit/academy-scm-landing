"""Герасимов Дмитрий Сергеевич. v0.30.0, 2026-11-19.
Read-only fictional planning calculations. Standard library; no network or actions.
Not accounting, investment advice, legal clearance or demand validation.
"""
import argparse
import csv
from fractions import Fraction
import json
from pathlib import Path
import re

SCHEMAS = {
 'startup-case.csv':['scenario_id','unit_price_rub','unit_variable_rub','monthly_fixed_rub','setup_cash_rub','opening_cash_rub','monthly_capacity','month1_units','month2_units','month3_units','collected_now_percent'],
 'department-case.csv':['product_id','units','unit_price_rub','unit_variable_rub','minutes_per_unit','direct_fixed_rub','allocated_common_rub'],
}
COMMON_FIXED_RUB=60000
CAPACITY_MINUTES=2400


def validate(data,columns):
 if not 1<=len(data)<=100:raise ValueError('Expected 1..100 rows')
 seen=set()
 for row in data:
  if set(row)!=set(columns) or any(type(v) is not str or not v.strip() for v in row.values()):raise ValueError('Unexpected/missing/empty fields')
  key=row[columns[0]]
  if key in seen:raise ValueError('Duplicate key')
  seen.add(key)


def read_rows(folder,name):
 with (Path(folder)/name).open(encoding='utf-8-sig',newline='') as f:
  reader=csv.DictReader(f)
  if reader.fieldnames!=SCHEMAS[name]:raise ValueError('Unexpected columns: '+name)
  data=list(reader)
 validate(data,SCHEMAS[name]);return data


def integer(text,positive=False):
 if type(text) is not str or not re.fullmatch(r'[0-9]{1,9}',text):raise ValueError('Expected bounded integer text')
 n=int(text)
 if n>10000000 or (positive and n==0):raise ValueError('Number outside domain')
 return n


def number(value):
 value=Fraction(value)
 return value.numerator if value.denominator==1 else float(value)


def startup(data):
 validate(data,SCHEMAS['startup-case.csv'])
 if len(data)!=1:raise ValueError('Exactly one scenario row required')
 row=data[0];n={key:integer(row[key]) for key in SCHEMAS['startup-case.csv'][1:]}
 if n['monthly_capacity']==0 or n['collected_now_percent']>100:raise ValueError('Invalid capacity or collection percentage')
 price=n['unit_price_rub'];variable=n['unit_variable_rub'];fixed=n['monthly_fixed_rub'];margin=price-variable
 if fixed==0:breakeven=0
 elif margin>0:breakeven=(fixed+margin-1)//margin
 else:breakeven=None
 cash=Fraction(n['opening_cash_rub']-n['setup_cash_rub']);minimum=cash;previous_receivable=Fraction(0);months=[]
 for month in range(1,4):
  q=n[f'month{month}_units'];revenue=q*price;variable_cash=q*variable
  receipts=Fraction(revenue*n['collected_now_percent'],100)+previous_receivable
  previous_receivable=Fraction(revenue*(100-n['collected_now_percent']),100)
  outflow=variable_cash+fixed;cash+=receipts-outflow;minimum=min(minimum,cash)
  months.append(dict(month=month,units=q,revenue_rub=revenue,variable_rub=variable_cash,operating_result_rub=revenue-variable_cash-fixed,
                     receipts_rub=number(receipts),operating_outflow_rub=outflow,closing_cash_rub=number(cash),receivable_rub=number(previous_receivable),
                     capacity_feasible=q<=n['monthly_capacity']))
 return dict(scenario_id=row['scenario_id'],unit_contribution_rub=margin,breakeven_units=breakeven,
             breakeven_within_capacity=breakeven<=n['monthly_capacity'] if breakeven is not None else False,
             cash_after_setup_rub=n['opening_cash_rub']-n['setup_cash_rub'],months=months,
             minimum_checkpoint_cash_rub=number(minimum),extra_opening_cash_to_nonnegative_checkpoints_rub=number(max(0,-minimum)),
             cumulative_operating_result_rub=sum(m['operating_result_rub'] for m in months),
             capacity_feasible=all(m['capacity_feasible'] for m in months),
             limits='No opening receivables/payables, all variable/fixed costs paid same month; unpaid sales collected next month without default. Checkpoints are not daily liquidity. Setup cash excluded from operating result; no tax/depreciation/interest. Demand unverified.')


def department(data):
 validate(data,SCHEMAS['department-case.csv'])
 products=[]
 for row in data:
  n={key:integer(row[key],key=='minutes_per_unit') for key in SCHEMAS['department-case.csv'][1:]}
  revenue=n['units']*n['unit_price_rub'];variable=n['units']*n['unit_variable_rub'];contribution=revenue-variable
  products.append(dict(product_id=row['product_id'],units=n['units'],revenue_rub=revenue,variable_rub=variable,contribution_rub=contribution,
                       minutes=n['units']*n['minutes_per_unit'],contribution_per_minute_rub=number(Fraction(n['unit_price_rub']-n['unit_variable_rub'],n['minutes_per_unit'])),
                       direct_fixed_rub=n['direct_fixed_rub'],allocated_common_rub=n['allocated_common_rub'],segment_result_rub=contribution-n['direct_fixed_rub'],
                       allocated_result_rub=contribution-n['direct_fixed_rub']-n['allocated_common_rub']))
 if sum(p['allocated_common_rub'] for p in products)!=COMMON_FIXED_RUB:raise ValueError('Allocation must reconcile to unchanged common fixed cost 60000')
 totals={key:sum(p[key] for p in products) for key in ['revenue_rub','variable_rub','contribution_rub','minutes','direct_fixed_rub','segment_result_rub','allocated_result_rub']}
 totals.update(common_fixed_rub=COMMON_FIXED_RUB,operating_result_rub=totals['segment_result_rub']-COMMON_FIXED_RUB,
               capacity_minutes=CAPACITY_MINUTES,spare_minutes=max(0,CAPACITY_MINUTES-totals['minutes']),
               deficit_minutes=max(0,totals['minutes']-CAPACITY_MINUTES),capacity_feasible=totals['minutes']<=CAPACITY_MINUTES)
 return dict(products=products,totals=totals,limits='Common fixed cost remains 60000. Direct fixed changes require an explicitly revised scenario, not automatic savings at zero volume. Contribution/minute is a local comparison, not a demand forecast or general optimizer. No accounting/legal/production authority.')


def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--case',choices=['startup','department','all'],default='all')
 parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent)
 args=parser.parse_args();report={}
 try:
  if args.case in {'startup','all'}:report['startup']=startup(read_rows(args.directory,'startup-case.csv'))
  if args.case in {'department','all'}:report['department']=department(read_rows(args.directory,'department-case.csv'))
 except (OSError,ValueError,csv.Error) as e:parser.exit(2,'Case rejected: '+str(e)+'\n')
 print(json.dumps(report,ensure_ascii=False,indent=2));return 0


if __name__=='__main__':raise SystemExit(main())
