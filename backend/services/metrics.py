"""Forecast Accuracy Metrics Calculation Module.

Provides standard quantitative evaluation metrics for wind generation forecasts:
- Mean Absolute Error (MAE)
- Root Mean Square Error (RMSE)
- Mean Bias Error (Bias) with explicit sign convention:
    Positive (> 0): Forecast OVER-predicted actual generation (Over-forecasting)
    Negative (< 0): Forecast UNDER-predicted actual generation (Under-forecasting)
- Weighted Absolute Percentage Error (WAPE)
- Sample count and data coverage statistics
"""

from __future__ import annotations
import math
from typing import Any, Dict, List, Optional, Tuple


def calculate_accuracy_metrics(
    pairs: List[Tuple[float, float]],
    total_expected_intervals: Optional[int] = None,
) -> Dict[str, Any]:
    """Calculate accuracy metrics from matched (forecast_mw, actual_mw) pairs.

    Args:
        pairs: List of (forecast_mw, actual_mw) tuples. Only pairs where both
               values are non-None and non-NaN are accepted.
        total_expected_intervals: Optional count of expected intervals in the
               evaluation window (e.g. 24 for a day of hourly periods, or 744
               for 31 days). Used to compute coverage percentage.

    Returns:
        Dictionary containing metric values, units, descriptions, sample count,
        and coverage percentage.
    """
    valid_pairs = [
        (float(f), float(a))
        for f, a in pairs
        if f is not None
        and a is not None
        and not math.isnan(f)
        and not math.isnan(a)
    ]

    n = len(valid_pairs)
    if n == 0:
        return {
            "mae": None,
            "rmse": None,
            "bias": None,
            "wape": None,
            "sample_count": 0,
            "expected_intervals": total_expected_intervals,
            "coverage_pct": 0.0,
            "bias_sign_convention": (
                "Forecast minus Actual (Positive = Over-forecast / excess, "
                "Negative = Under-forecast / shortfall)"
            ),
            "status": "insufficient_data",
        }

    abs_errors = [abs(f - a) for f, a in valid_pairs]
    sq_errors = [(f - a) ** 2 for f, a in valid_pairs]
    signed_errors = [(f - a) for f, a in valid_pairs]
    actual_sum = sum(a for _, a in valid_pairs)

    mae = sum(abs_errors) / n
    rmse = math.sqrt(sum(sq_errors) / n)
    bias = sum(signed_errors) / n

    if actual_sum > 0:
        wape = (sum(abs_errors) / actual_sum) * 100.0
    else:
        # Avoid division by zero when actual generation is exactly zero
        wape = None

    coverage_pct = (
        (n / total_expected_intervals * 100.0)
        if total_expected_intervals and total_expected_intervals > 0
        else 100.0
    )

    return {
        "mae": {
            "value": round(mae, 2),
            "unit": "MW",
            "description": "Mean Absolute Error — average magnitude of forecast deviation.",
        },
        "rmse": {
            "value": round(rmse, 2),
            "unit": "MW",
            "description": "Root Mean Square Error — penalises large forecasting errors.",
        },
        "bias": {
            "value": round(bias, 2),
            "unit": "MW",
            "direction": "over" if bias > 0 else ("under" if bias < 0 else "neutral"),
            "description": (
                "Mean Bias Error [Forecast - Actual]. Positive indicates systematic over-forecasting; "
                "negative indicates systematic under-forecasting."
            ),
        },
        "wape": {
            "value": round(wape, 2) if wape is not None else None,
            "unit": "%",
            "description": (
                "Weighted Absolute Percentage Error — total absolute error divided by total actuals."
            ),
        },
        "sample_count": n,
        "expected_intervals": total_expected_intervals,
        "coverage_pct": round(min(100.0, coverage_pct), 1),
        "bias_sign_convention": "Forecast - Actual (>0 is Over-forecast, <0 is Under-forecast)",
        "status": "valid",
    }
