"""Offline arithmetic self-check, Python 3 stdlib only. Not a safety/admission tool.

Keep this file beside organization-cases.json; run python3 run-organization-labs.py.
No network, no uploads, no modification of source data. Print calculated results,
then compare the published fictional fixture against its expected answers.
"""
import json
from pathlib import Path
from fractions import Fraction


def number(data, key, positive=False):
    value = data[key]
    if type(value) is not int or value < (1 if positive else 0):
        raise ValueError('Expected ' + ('positive' if positive else 'nonnegative') + ' integer: ' + key)
    return value


def partition(data, total_key, keys):
    total = number(data, total_key, True)
    if sum(number(data, key) for key in keys) != total:
        raise ValueError('Statuses do not reconcile: ' + total_key)
    return total


def calculate(data):
    t = data['transport']
    pallets = number(t, 'pallets', True)
    places = number(t, 'places_per_vehicle', True)
    trips = (pallets + places - 1) // places
    first = number(t, 'start_minute') + sum(number(t, k) for k in ['load_minutes', 'outbound_minutes', 'unload_minutes'])
    cycle = sum(number(t, k) for k in ['return_minutes', 'load_minutes', 'outbound_minutes', 'unload_minutes'])
    last = first + (trips - 1) * cycle
    total = partition(t, 'planned', ['full_timely', 'full_late', 'open'])
    transport = dict(minimum_trips_by_places=trips, first_unload_end_minute=first,
                     last_unload_end_minute=last, lateness_minutes=max(0, last-number(t, 'deadline_minute')),
                     full_timely_percent=100*Fraction(t['full_timely'], total),
                     confirmed_full_percent=100*Fraction(t['full_timely']+t['full_late'], total))
    h = data['healthcare']
    capacity = number(h, 'available_minutes') // number(h, 'slot_minutes', True)
    deficit = max(0, number(h, 'requests')-capacity)
    total = partition(h, 'total_cases', ['closed', 'transferred_open', 'clarification_open'])
    healthcare = dict(teaching_slots=capacity, deficit_slots=deficit, deficit_minutes=deficit*h['slot_minutes'],
                      closed_percent=100*Fraction(h['closed'], total), open_cases=total-h['closed'])
    p = data['psychology']
    invited = number(p, 'invited', True)
    responded = number(p, 'responded', True)
    reported = number(p, 'reported_role_issue')
    if not reported <= responded <= invited:
        raise ValueError('Invalid survey counts')
    before_n = number(p, 'baseline_tasks', True)
    after_n = number(p, 'pilot_tasks', True)
    before_count = number(p, 'baseline_returns')
    after_count = number(p, 'pilot_returns')
    if before_count > before_n or after_count > after_n:
        raise ValueError('Returns exceed task count')
    before, after = Fraction(before_count, before_n), Fraction(after_count, after_n)
    psychology = dict(response_percent=100*Fraction(responded, invited),
                      role_issue_respondents_percent=100*Fraction(reported, responded),
                      before_percent=100*before, after_percent=100*after,
                      change_percentage_points=100*(after-before),
                      relative_reduction_percent=100*(before-after)/before if before else None)
    m = data['maintenance']
    required, confirmed = number(m, 'required_confirmations', True), number(m, 'confirmed')
    if confirmed > required:
        raise ValueError('Confirmed exceeds required')
    operation = number(m, 'operation_hours', True)
    elapsed = operation + number(m, 'preparation_hours') + number(m, 'acceptance_hours')
    total = partition(m, 'total_cases', ['closed', 'awaiting_acceptance', 'awaiting_documents'])
    maintenance = dict(record_completeness_percent=100*Fraction(confirmed, required),
                       labor_person_hours=number(m, 'workers', True)*operation,
                       sequential_window_hours=elapsed,
                       window_deficit_hours=max(0, elapsed-number(m, 'window_hours')),
                       administrative_closed_percent=100*Fraction(m['closed'], total), open_cases=total-m['closed'])
    return dict(transport=transport, healthcare=healthcare, psychology=psychology, maintenance=maintenance)


def check_fixture(result):
    expected = dict(
        transport=dict(minimum_trips_by_places=2, first_unload_end_minute=585, last_unload_end_minute=735,
                       lateness_minutes=135, full_timely_percent=80, confirmed_full_percent=90),
        healthcare=dict(teaching_slots=12, deficit_slots=3, deficit_minutes=60, closed_percent=80, open_cases=4),
        psychology=dict(response_percent=60, role_issue_respondents_percent=Fraction(125, 2), before_percent=20,
                        after_percent=10, change_percentage_points=-10, relative_reduction_percent=50),
        maintenance=dict(record_completeness_percent=80, labor_person_hours=8, sequential_window_hours=6,
                         window_deficit_hours=3, administrative_closed_percent=75, open_cases=3))
    if result != expected:
        raise ValueError('Fixture or calculation differs from published conditions; review the differences, do not overwrite evidence.')


if __name__ == '__main__':
    fixture = json.loads(Path(__file__).with_name('organization-cases.json').read_text(encoding='utf-8'))
    result = calculate(fixture)
    print(fixture['notice'])
    print(json.dumps(result, ensure_ascii=False, indent=2, default=lambda value: float(value)))
    check_fixture(result)
    print('PASS: four fictional arithmetic cases; no real-world permissions or safety conclusions.')
