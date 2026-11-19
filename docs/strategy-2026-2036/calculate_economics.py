"""Reproduce illustrative economics. No external libraries or actual customer data.

Run from any working directory; output is written beside this script.
Assumptions are hypotheses, not market observations. LTV is undiscounted.
"""
import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def b2c_case(p, ai_multiplier=1.0, churn=None, conversion=None):
    ai = p["queries_per_month"] * (
        p["input_tokens_per_query"] * p["input_price_per_million"]
        + p["output_tokens_per_query"] * p["output_price_per_million"]
    ) / 1_000_000 * p["retry_factor"] * ai_multiplier
    free = 0 if conversion is None else (
        (1 - conversion) / conversion * p["free_active_cost_per_month"]
    )
    cm = p["price_per_month"] - p["non_ai_variable_cost_per_month"] - ai - free
    rate = p["monthly_churn"] if churn is None else churn
    return {
        "ai_cost_rub_month": round(ai, 4),
        "free_cost_allocated_rub_month": round(free, 4),
        "cm_rub_month": round(cm, 4),
        "cm_percent": round(100 * cm / p["price_per_month"], 4),
        "ltv_rub": round(cm / rate, 4),
        "ltv_cac": round(cm / rate / p["cac"], 4),
        "payback_months": round(p["cac"] / cm, 4) if cm > 0 else "not_recoverable",
    }


def calculate():
    inputs = json.loads((ROOT / "economics-inputs.json").read_text())
    p = inputs["b2c"]
    cases = [
        ("base", {}),
        ("ai_x3", {"ai_multiplier": 3}),
        ("churn_15pct", {"churn": .15}),
        ("ai_x3_churn_15pct", {"ai_multiplier": 3, "churn": .15}),
        *[(f"freemium_{int(f * 100)}pct", {"conversion": f}) for f in [.02, .05, .08]],
    ]
    rows = [{"scenario": name, **b2c_case(p, **kw)} for name, kw in cases]
    assert math.isclose(rows[0]["ai_cost_rub_month"], 208.8)
    assert math.isclose(rows[0]["cm_rub_month"], 991.2)
    assert math.isclose(rows[0]["ltv_cac"], 2.7533, abs_tol=.0001)
    assert rows[3]["ltv_cac"] < 1
    assert math.isclose(rows[4]["cm_rub_month"], 11.2)
    with (ROOT / "economics-sensitivity.csv").open("w", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    b = inputs["b2b"]
    costs = sum(b[k] for k in [
        "annual_infra_ai", "annual_content_delivery", "annual_customer_support",
        "annual_amortized_integration",
    ])
    cm = b["annual_revenue"] - costs
    five_year = cm * sum((1 - b["annual_logo_churn"]) ** k for k in range(b["horizon_years"]))
    result = {
        "annual_cm_rub": cm,
        "five_year_contribution_ltv_rub": round(five_year, 2),
        "five_year_ltv_cac": round(five_year / b["cac"], 4),
        "accounting_payback_months": b["cac"] / (cm / 12),
        "fixed_opex_coverage_accounts_before_acquisition_cost": math.ceil(b["fixed_opex_per_year"] / cm),
        "pilot_contribution_before_cac_fixed_opex": cm * b["pilot_accounts"],
        "pilot_deficit_before_cac": b["fixed_opex_per_year"] - cm * b["pilot_accounts"],
    }
    assert cm == 540000
    assert result["fixed_opex_coverage_accounts_before_acquisition_cost"] == 34
    print(json.dumps({"b2c": rows, "b2b": result}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    calculate()
