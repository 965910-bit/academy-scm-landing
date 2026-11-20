"""Public offline arithmetic check; not an Excel formula evaluator or secure exam.
Run: python3 check-excel-results.py [--answers your-results.csv]
Only the standard library. Reads local files, never modifies or uploads them.
"""
import argparse
import csv
import io
import json
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path


def decimal(text):
    try:
        value = Decimal(text.strip().replace(',', '.'))
    except (InvalidOperation, AttributeError):
        raise ValueError('Not a decimal number: ' + repr(text)) from None
    if not value.is_finite():
        raise ValueError('Non-finite number')
    return value


def analyze(rows):
    clean, issues, duplicates, seen = [], [], [], {}
    for source_row, row in enumerate(rows, 2):
        try:
            if not row['record_id'] or row['region'] not in {'north', 'south'} or row['status'] not in {'paid', 'pending', 'cancelled'}:
                raise ValueError('key/region/status')
            date.fromisoformat(row['date'])
            units, price, defects = (decimal(row[k]) for k in ['units', 'unit_price_rub', 'defective_units'])
            if units < 0 or units != int(units) or price < 0 or defects < 0 or defects != int(defects) or defects > units:
                raise ValueError('quantity/price/defects')
        except (ValueError, KeyError, TypeError) as error:
            issues.append(dict(source_row=source_row, record_id=row.get('record_id', ''), issue=str(error)))
            continue
        key = row['record_id']
        if key in seen:
            if row != seen[key]:
                raise ValueError('Conflicting duplicate requires human resolution: ' + key)
            duplicates.append(dict(source_row=source_row, record_id=key))
            continue
        seen[key] = dict(row)
        clean.append(dict(**row, source_row=source_row, units_n=units, price_n=price, defects_n=defects, amount=units*price))
    paid = [r for r in clean if r['status'] == 'paid']
    units = sum((r['units_n'] for r in paid), Decimal(0))
    amount = sum((r['amount'] for r in paid), Decimal(0))
    metrics = dict(valid_records=len(clean), invalid_rows=len(issues), duplicate_rows=len(duplicates),
                   paid_records=len(paid), paid_units=units,
                   all_amount=sum((r['amount'] for r in clean), Decimal(0)), paid_amount=amount,
                   north_paid=sum((r['amount'] for r in paid if r['region']=='north'), Decimal(0)),
                   south_paid=sum((r['amount'] for r in paid if r['region']=='south'), Decimal(0)),
                   weighted_price=amount/units if units else None,
                   defect_units_percent=100*sum((r['defects_n'] for r in paid), Decimal(0))/units if units else None,
                   defect_rows_percent=Decimal(100)*sum(r['defects_n']>0 for r in paid)/len(paid) if paid else None,
                   reserve=amount*Decimal('.05'), total_with_reserve=amount*Decimal('1.05'),
                   report_delta=Decimal('2900')-amount)
    return clean, issues, duplicates, metrics


def read_answers(text):
    delimiter = ';' if text.splitlines() and ';' in text.splitlines()[0] else ','
    reader = csv.DictReader(io.StringIO(text.lstrip('\ufeff')), delimiter=delimiter)
    if reader.fieldnames != ['metric', 'value']:
        raise ValueError('Expected CSV header metric,value or metric;value')
    answers = {}
    for row in reader:
        if None in row or row['metric'] in answers:
            raise ValueError('Extra columns or duplicate metric')
        answers[row['metric']] = decimal(row['value'])
    return answers


def check_answers(answers, expected):
    if set(answers) != set(expected):
        raise ValueError('Missing/unknown metrics: ' + str(sorted(set(answers)^set(expected))))
    integers = {'valid_records','invalid_rows','duplicate_rows','paid_records','paid_units'}
    errors = []
    for name, target in expected.items():
        tolerance = Decimal(0) if name in integers else Decimal('.01')
        if target is None or abs(answers[name]-Decimal(target)) > tolerance:
            errors.append(name)
    if errors:
        raise ValueError('Values differ: ' + ', '.join(errors))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--answers', type=Path)
    args = parser.parse_args()
    try:
        with Path(__file__).with_name('excel-orders.csv').open(encoding='utf-8-sig', newline='') as stream:
            clean, issues, duplicates, metrics = analyze(list(csv.DictReader(stream)))
        print(json.dumps(dict(metrics=metrics, issues=issues, duplicates=duplicates), ensure_ascii=False, indent=2, default=str))
        if args.answers:
            check_answers(read_answers(args.answers.read_text(encoding='utf-8-sig')), metrics)
            print('PASS: numerical outputs only; formulas, charts and explanation need human review.')
        else:
            print('Reference calculation only. To check your CSV, use --answers your-results.csv')
    except (ValueError, OSError) as error:
        parser.exit(1, str(error)+'\n')
