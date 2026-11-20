"""Offline educational checks. Author: Герасимов Дмитрий Сергеевич.
Version 0.3.0, 2026-11-19. Download this file, python-lab.py and sql-lab.json
into ONE folder. Run python3 run-digital-labs.py. No third-party packages.
Only these exercise files are loaded; SQLite database lives in memory.
"""
from pathlib import Path
import copy
import importlib.util
import json
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('python_lab', ROOT / 'python-lab.py')
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)

class DigitalLabs(unittest.TestCase):
    def test_sql(self):
        exercise = json.loads((ROOT/'sql-lab.json').read_text(encoding='utf-8'))
        with sqlite3.connect(':memory:') as db:
            db.executescript(exercise['setup'])
            for query in exercise['queries']:
                with self.subTest(query=query['id']):
                    result = [list(row) for row in db.execute(query['sql'])]
                    self.assertEqual(result, query['expected'])

    def test_valid_units(self):
        for value, expected in [('12',12),(' 12 ',12),('0',0),('000',0),('999999999',999999999)]:
            with self.subTest(value=value):self.assertEqual(lab.parse_units(value),expected)

    def test_invalid_units(self):
        for value in [None,'',' ','-1','+1','1.5','1e3',True,12,'１２','²','1234567890']:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):lab.parse_units(value)

    def test_summary_and_immutability(self):
        original=copy.deepcopy(lab.SAMPLE)
        result=lab.summarize(lab.SAMPLE)
        self.assertEqual(result['total'],30)
        self.assertEqual(result['valid_count'],3)
        self.assertEqual([x['position'] for x in result['issues']],[3,4])
        self.assertEqual(lab.SAMPLE,original)

    def test_empty_and_invalid_only(self):
        self.assertEqual(lab.summarize([]),{'total':0,'valid_count':0,'issues':[]})
        result=lab.summarize([{'units':None},'not a dict',{}])
        self.assertEqual(result['total'],0)
        self.assertEqual(result['valid_count'],0)
        self.assertEqual([x['position'] for x in result['issues']],[1,2,3])

if __name__=='__main__':
    print('Python/SQLite educational tests; SQLite version:',sqlite3.sqlite_version)
    unittest.main(verbosity=2)
