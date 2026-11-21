"""Герасимов Дмитрий Сергеевич. v0.28.0, 2026-11-19.
Original fictional calculations, not an AI/model integration or authority to act.
Reads selected CSVs, prints JSON; no network, external packages or source writes.
"""
import argparse
import csv
from fractions import Fraction
import json
from pathlib import Path
import re

FILES = {
    'finance': ('ai-finance-case.csv', ['record_id', 'kind', 'plan_rub', 'actual_rub']),
    'procurement': ('ai-procurement-case.csv', ['supplier_id', 'unit_rub', 'delivery_rub', 'inspection_rub', 'lead_days', 'evidence']),
    'manager': ('ai-manager-case.csv', ['task_id', 'minutes', 'allowed_owner', 'proposed_owner']),
}


def read_rows(folder, case):
    name, columns = FILES[case]
    with (Path(folder) / name).open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != columns:
            raise ValueError('Unexpected columns: ' + name)
        rows = list(reader)
    validate_rows(rows, columns)
    return rows


def validate_rows(rows, columns):
    if not 1 <= len(rows) <= 100:
        raise ValueError('Expected 1..100 fictional records')
    ids = set()
    for row in rows:
        if set(row) != set(columns) or any(type(v) is not str or not v.strip() for v in row.values()):
            raise ValueError('Missing/extra/empty fields')
        record_id = row[columns[0]]
        if record_id in ids:
            raise ValueError('Duplicate record ID')
        ids.add(record_id)


def integer(value):
    if type(value) is not str or not re.fullmatch(r'[0-9]+', value) or not 0 <= int(value) <= 10000000:
        raise ValueError('Expected bounded nonnegative integer text')
    return int(value)


def finance(rows):
    validate_rows(rows, FILES['finance'][1])
    totals = {'plan_revenue': 0, 'actual_revenue': 0, 'plan_cost': 0, 'actual_cost': 0}
    variances = []
    for row in rows:
        if row['kind'] not in {'revenue', 'cost'}:
            raise ValueError('Unknown financial kind')
        plan, actual = integer(row['plan_rub']), integer(row['actual_rub'])
        totals['plan_' + row['kind']] += plan
        totals['actual_' + row['kind']] += actual
        # Favorability convention belongs to this fictional contract only.
        variances.append(dict(record_id=row['record_id'], actual_minus_plan_rub=actual-plan,
                              favorable_effect_rub=(actual-plan) * (1 if row['kind']=='revenue' else -1)))
    planned_profit = totals['plan_revenue'] - totals['plan_cost']
    actual_profit = totals['actual_revenue'] - totals['actual_cost']
    growth = (Fraction(actual_profit-planned_profit, planned_profit)*100 if planned_profit>0 else None)
    plan_margin = (Fraction(planned_profit, totals['plan_revenue'])*100 if totals['plan_revenue'] else None)
    actual_margin = (Fraction(actual_profit, totals['actual_revenue'])*100 if totals['actual_revenue'] else None)
    return dict(totals, plan_profit_rub=planned_profit, actual_profit_rub=actual_profit,
                profit_delta_rub=actual_profit-planned_profit,
                profit_growth_percent=float(growth) if growth is not None else None,
                plan_margin_percent=float(plan_margin) if plan_margin is not None else None,
                actual_margin_percent=float(actual_margin) if actual_margin is not None else None,
                margin_delta_pp=float(actual_margin-plan_margin) if actual_margin is not None and plan_margin is not None else None,
                variances=variances, processing_cost_rub={'manual':900,'ai_with_review_30':875,'ai_with_review_40':1025},
                saving_with_review_30_rub=25, setup_rub=4500, setup_recovery_tasks_at_25_saving=180,
                limits='Fictional management result; no cash/tax/causal inference or model evaluation')


def procurement(rows, max_days=5):
    validate_rows(rows, FILES['procurement'][1])
    if type(max_days) is not int or max_days < 0:
        raise ValueError('Expected nonnegative deadline')
    offers = []
    for row in rows:
        if row['evidence'] not in {'verified', 'unknown'}:
            raise ValueError('Unknown evidence state')
        total = integer(row['unit_rub'])*100 + integer(row['delivery_rub']) + integer(row['inspection_rub'])
        lead = integer(row['lead_days'])
        offers.append(dict(supplier_id=row['supplier_id'], total_rub=total, lead_days=lead,
                           evidence=row['evidence'], eligible=row['evidence']=='verified' and lead<=max_days))
    eligible = [row for row in offers if row['eligible']]
    best = min((r['total_rub'] for r in eligible), default=None)
    minimum_ids = [r['supplier_id'] for r in eligible if r['total_rub']==best]
    normal_cost = Fraction(8+20+12,60)*800+40
    extended_review_cost = Fraction(8+30+12,60)*800+40
    return dict(quantity=100,max_days=max_days,offers=offers,minimum_eligible_ids=minimum_ids,
                minimum_eligible_total_rub=best,
                processing_cost_rub={'manual':600,'ai_with_review_20':round(float(normal_cost),2),'ai_with_review_30':round(float(extended_review_cost),2)},
                normal_saving_rub=round(float(600-normal_cost),2),
                limits='A comparison under fictional inputs, not a procurement award, contract, model output or legal clearance')


def manager(rows, reduction_approved=False):
    validate_rows(rows, FILES['manager'][1])
    if type(reduction_approved) is not bool:
        raise ValueError('Approval scenario must be an explicit boolean')
    capacities = {'A':240,'B':180}
    loads = {'A':0,'B':0}
    tasks = []
    analysis_found = False
    for row in rows:
        allowed = row['allowed_owner'].split('|')
        if any(owner not in capacities for owner in allowed) or row['proposed_owner'] not in allowed:
            raise ValueError('Assignment outside allowed role')
        minutes = integer(row['minutes'])
        if row['task_id']=='T02':
            analysis_found = True
            if reduction_approved:
                if minutes!=120:
                    raise ValueError('Conditional reduction applies only to the stated 120-minute task')
                minutes=90
        loads[row['proposed_owner']] += minutes
        tasks.append(dict(task_id=row['task_id'],minutes=minutes,owner=row['proposed_owner']))
    if reduction_approved and not analysis_found:
        raise ValueError('No T02 for the conditional reduction')
    before_review = dict(loads)
    loads['A'] += 30
    deficits = {owner:max(0,loads[owner]-capacity) for owner,capacity in capacities.items()}
    return dict(capacity_minutes=capacities,tasks=tasks,before_review_minutes=before_review,
                mandatory_review_minutes={'A':30,'B':0},loads_with_review_minutes=loads,deficit_minutes=deficits,
                feasible=all(value==0 for value in deficits.values()),conditional_reduction=reduction_approved,
                processing_cost_rub={'manual_planning':800,'ai_review_20':860,'ai_review_10':660},
                limits='Person-minutes, not elapsed time; scenario approval is not real authorization or proven productivity')


def main():
    parser = argparse.ArgumentParser(description='Fictional role calculations only; no AI calls, source writes or real decisions.')
    parser.add_argument('--case',choices=[*FILES,'all'],default='all')
    parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent)
    args=parser.parse_args()
    selected=list(FILES) if args.case=='all' else [args.case]
    functions={'finance':finance,'procurement':procurement,'manager':manager}
    try:
        report={case:functions[case](read_rows(args.directory,case)) for case in selected}
    except (OSError,ValueError,csv.Error) as error:
        parser.exit(2,'Case rejected: '+str(error)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0


if __name__=='__main__':
    raise SystemExit(main())
