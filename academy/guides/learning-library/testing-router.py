"""Герасимов Дмитрий Сергеевич. Version 0.26.0, 2026-11-19.
Original fictional contract and public tests. No network or writes to source files.
A route is not an approval, and passing these cases is not a quality/security audit.
"""
import argparse
import csv
import json
from pathlib import Path
import unittest


def route_reference(value):
    if type(value) is not int:
        raise TypeError('Integer rubles required; bool is not accepted')
    if not 0 <= value <= 1_000_000:
        raise ValueError('Outside fictional range')
    return 'manager' if value >= 100_000 else 'operator'


def route_buggy(value):
    """Intentionally wrong: accepts bool and uses an exclusive threshold."""
    if not isinstance(value, int):
        raise TypeError('Integer required')
    if not 0 <= value <= 1_000_000:
        raise ValueError('Outside fictional range')
    return 'manager' if value > 100_000 else 'operator'


def load_cases(path):
    with Path(path).open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != ['case_id', 'input_json', 'expected_value', 'expected_error']:
            raise ValueError('Unexpected case columns')
        rows = list(reader)
    seen = set()
    for row in rows:
        if set(row) != {'case_id', 'input_json', 'expected_value', 'expected_error'} or any(v is None for v in row.values()):
            raise ValueError('Invalid case fields')
        if not row['case_id'].isalnum() or row['case_id'] in seen:
            raise ValueError('Missing/duplicate/unsafe case ID')
        seen.add(row['case_id'])
        json.loads(row['input_json'])  # Data only; no eval, imports or execution.
        if row['expected_error']:
            if row['expected_error'] not in {'TypeError', 'ValueError'} or row['expected_value']:
                raise ValueError('Unexpected error contract')
        elif row['expected_value'] not in {'operator', 'manager'}:
            raise ValueError('Missing expected route')
    if not rows:
        raise ValueError('No cases; empty suite is not acceptance')
    return rows


def make_suite(implementation, cases):
    def make_method(row):
        def test(self):
            value = json.loads(row['input_json'])
            expected_error = row['expected_error']
            if expected_error:
                exception = {'TypeError': TypeError, 'ValueError': ValueError}[expected_error]
                with self.assertRaises(exception, msg=row['case_id']):
                    implementation(value)
            else:
                self.assertEqual(implementation(value), row['expected_value'], row['case_id'])
        return test
    methods = {'test_' + row['case_id']: make_method(row) for row in cases}
    case_type = type('RouterContractCases', (unittest.TestCase,), methods)
    return unittest.defaultTestLoader.loadTestsFromTestCase(case_type)


def main():
    parser = argparse.ArgumentParser(description='Fictional router contract; buggy is expected to fail. No network/source writes.')
    parser.add_argument('--implementation', choices=['reference', 'buggy'], default='reference')
    parser.add_argument('--cases', type=Path, default=Path(__file__).resolve().with_name('testing-cases.csv'))
    args = parser.parse_args()
    try:
        cases = load_cases(args.cases)
    except (OSError, ValueError, csv.Error) as error:
        parser.exit(2, 'Case validation failed: ' + str(error) + '\n')
    implementation = {'reference': route_reference, 'buggy': route_buggy}[args.implementation]
    result = unittest.TextTestRunner(verbosity=2).run(make_suite(implementation, cases))
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    raise SystemExit(main())
