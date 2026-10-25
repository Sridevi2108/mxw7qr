"""Unit tests for Forecast Accuracy Metrics."""

import math
import pytest
from backend.services.metrics import calculate_accuracy_metrics


def test_perfect_forecast():
    pairs = [(1000.0, 1000.0), (2500.0, 2500.0), (3200.0, 3200.0)]
    res = calculate_accuracy_metrics(pairs, total_expected_intervals=3)

    assert res["status"] == "valid"
    assert res["sample_count"] == 3
    assert res["mae"]["value"] == 0.0
    assert res["rmse"]["value"] == 0.0
    assert res["bias"]["value"] == 0.0
    assert res["wape"]["value"] == 0.0
    assert res["coverage_pct"] == 100.0


def test_known_metrics_calculation():
    # Pairs: (forecast, actual)
    # 1: (120, 100) -> error = +20, abs = 20, sq = 400
    # 2: (80, 100)  -> error = -20, abs = 20, sq = 400
    # 3: (150, 100) -> error = +50, abs = 50, sq = 2500
    # 4: (100, 100) -> error = 0,   abs = 0,  sq = 0
    #
    # N = 4
    # sum(abs) = 90 -> MAE = 90 / 4 = 22.5
    # sum(sq) = 3300 -> RMSE = sqrt(3300 / 4) = sqrt(825) ≈ 28.72
    # sum(signed) = +50 -> Bias = 50 / 4 = +12.5 (Over-forecast)
    # sum(actual) = 400 -> WAPE = (90 / 400) * 100 = 22.5%
    pairs = [(120.0, 100.0), (80.0, 100.0), (150.0, 100.0), (100.0, 100.0)]
    res = calculate_accuracy_metrics(pairs, total_expected_intervals=4)

    assert res["status"] == "valid"
    assert res["sample_count"] == 4
    assert res["mae"]["value"] == 22.5
    assert res["rmse"]["value"] == round(math.sqrt(825), 2)
    assert res["bias"]["value"] == 12.5
    assert res["bias"]["direction"] == "over"
    assert res["wape"]["value"] == 22.5


def test_under_forecast_bias_sign():
    # Systematic under-forecasting
    pairs = [(80.0, 100.0), (90.0, 110.0), (70.0, 100.0)]
    res = calculate_accuracy_metrics(pairs)

    # Bias should be negative: mean((-20, -20, -30)) = -23.33
    assert res["bias"]["value"] < 0
    assert res["bias"]["direction"] == "under"


def test_empty_and_insufficient_data():
    res = calculate_accuracy_metrics([], total_expected_intervals=24)
    assert res["status"] == "insufficient_data"
    assert res["sample_count"] == 0
    assert res["mae"] is None
    assert res["coverage_pct"] == 0.0


def test_none_and_nan_filtering():
    pairs = [
        (100.0, 90.0),
        (None, 80.0),
        (120.0, None),
        (float("nan"), 50.0),
        (200.0, float("nan")),
        (150.0, 140.0),
    ]
    # Only 2 valid pairs: (100, 90) and (150, 140)
    # abs errors: 10, 10 -> MAE = 10
    # signed errors: +10, +10 -> Bias = +10
    res = calculate_accuracy_metrics(pairs, total_expected_intervals=6)

    assert res["sample_count"] == 2
    assert res["mae"]["value"] == 10.0
    assert res["bias"]["value"] == 10.0
    assert res["coverage_pct"] == round((2 / 6) * 100, 1)


def test_zero_actual_sum_avoids_zerodivision():
    pairs = [(50.0, 0.0), (30.0, 0.0)]
    res = calculate_accuracy_metrics(pairs)

    assert res["status"] == "valid"
    assert res["sample_count"] == 2
    assert res["mae"]["value"] == 40.0
    assert res["wape"]["value"] is None  # Handled safely without exception
