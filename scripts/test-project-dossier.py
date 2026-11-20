import importlib.util,json,unittest,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('dossier',ROOT/'scripts/build-project-dossier.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class DossierTests(unittest.TestCase):
    def setUp(self):
        self.x=json.loads((m.SRC/'economics/inputs.json').read_text());self.rows={r['scenario']:r for r in m.calculate(self.x)}
    def test_base_revenue(self):self.assertEqual(self.rows['base']['revenue'],1692000)
    def test_profit_bridge(self):
        for r in self.rows.values():self.assertAlmostEqual(r['model_net_profit'],r['revenue']-r['delivery']-r['acquiring']-r['ai']-r['marketing']-r['fixed']-r['tax_reserve'])
    def test_base(self):
        self.assertEqual(self.rows['base']['model_net_profit'],219480);self.assertEqual(self.rows['base']['break_even_sales'],81)
    def test_no_break_even_for_negative_unit(self):self.assertIsNone(self.rows['downside']['break_even_sales'])
    def test_break_even_is_minimum(self):
        r=self.rows['base'];self.assertGreaterEqual(r['break_even_sales']*r['posttax_unit_contribution'],r['fixed']);self.assertLess((r['break_even_sales']-1)*r['posttax_unit_contribution'],r['fixed'])
    def test_markup_not_margin(self):self.assertNotEqual(self.rows['base']['markup_on_variable_pct'],self.rows['base']['gross_margin_pct'])
    def test_public_package(self):
        with zipfile.ZipFile(m.OUT/'project-dossier.zip') as z:
            self.assertIsNone(z.testzip());self.assertIn('project-dossier/legal/privacy-policy.md',z.namelist());self.assertIn('project-dossier/technical/operations.md',z.namelist())
    def test_page_and_attribution(self):
        p=(m.OUT/'index.html').read_text();self.assertIn(m.AUTHOR,p);self.assertIn('не заключение о соответствии',p);self.assertIn('не обещание окупаемости',p)
        import re
        for link in re.findall(r'href="(files/[^"]+)"',p):self.assertTrue((m.OUT/link).is_file(),link)
    def test_escape(self):self.assertNotIn('<script>',m.render('<script>'))
if __name__=='__main__':unittest.main()
