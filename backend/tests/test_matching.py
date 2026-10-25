"""Unit tests for Forecast Matching and Decision Cutoff logic."""

import os
import sqlite3
import pytest
from backend.services.db import init_db, insert_actuals, insert_forecasts
from backend.services.matching import (
    compute_cutoff_datetime,
    match_day_ahead_hourly,
    match_day_ahead_settlement_periods,
)

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "test_windwise.db")


@pytest.fixture(autouse=True)
def setup_test_db():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    init_db(TEST_DB_PATH)
    yield
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def test_compute_cutoff_datetime():
    # Day-Ahead D-1 11:00 UTC
    c1 = compute_cutoff_datetime("2026-01-15", cutoff_time="11:00", days_prior=1)
    assert c1 == "2026-01-14T11:00:00Z"

    # Configurable 12:00 UTC
    c2 = compute_cutoff_datetime("2026-01-15", cutoff_time="12:00", days_prior=1)
    assert c2 == "2026-01-14T12:00:00Z"

    # Early Jan D-1 goes to Dec 31
    c3 = compute_cutoff_datetime("2026-01-01", cutoff_time="11:00", days_prior=1)
    assert c3 == "2025-12-31T11:00:00Z"


def test_strict_cutoff_filtering_and_latest_selection():
    """Verify that only forecasts published on or before cutoff are used,

    and the latest eligible one is chosen.
    """
    delivery_date = "2026-01-05"
    target_start = "2026-01-05T00:00:00Z"

    # Insert 3 forecast vintages for the same start_time:
    # 1: Published 2026-01-04T07:30:00Z (Eligible, earlier) -> 5000 MW
    # 2: Published 2026-01-04T10:30:00Z (Eligible, latest pre-cutoff) -> 5500 MW
    # 3: Published 2026-01-04T14:30:00Z (INELIGIBLE, post-cutoff) -> 6500 MW
    insert_forecasts(
        [
            {
                "dataset": "WINDFOR",
                "publishTime": "2026-01-04T07:30:00Z",
                "startTime": target_start,
                "generation": 5000.0,
            },
            {
                "dataset": "WINDFOR",
                "publishTime": "2026-01-04T10:30:00Z",
                "startTime": target_start,
                "generation": 5500.0,
            },
            {
                "dataset": "WINDFOR",
                "publishTime": "2026-01-04T14:30:00Z",
                "startTime": target_start,
                "generation": 6500.0,
            },
        ],
        db_path=TEST_DB_PATH,
    )

    # Insert actuals for hour 0 (SP 1 and SP 2)
    insert_actuals(
        [
            {
                "dataset": "FUELHH",
                "publishTime": "2026-01-05T01:00:00Z",
                "startTime": "2026-01-05T00:00:00Z",
                "settlementDate": delivery_date,
                "settlementPeriod": 1,
                "fuelType": "WIND",
                "generation": 5200.0,
            },
            {
                "dataset": "FUELHH",
                "publishTime": "2026-01-05T01:30:00Z",
                "startTime": "2026-01-05T00:30:00Z",
                "settlementDate": delivery_date,
                "settlementPeriod": 2,
                "fuelType": "WIND",
                "generation": 5400.0,
            },
        ],
        db_path=TEST_DB_PATH,
    )

    # Cutoff at 11:00 on D-1
    result = match_day_ahead_hourly(
        delivery_date=delivery_date,
        cutoff_time="11:00",
        days_prior=1,
        db_path=TEST_DB_PATH,
    )

    interval_0 = result["intervals"][0]

    # Must select 5500 MW published at 10:30 (latest pre-cutoff), NOT the 6500 MW post-cutoff
    assert interval_0["forecast_mw"] == 5500.0
    assert interval_0["forecast_publish_time"] == "2026-01-04T10:30:00Z"

    # Actual average: (5200 + 5400) / 2 = 5300.0
    assert interval_0["actual_mw"] == 5300.0
    assert interval_0["error_mw"] == 200.0  # 5500 - 5300 = +200 (over-forecast)


def test_post_cutoff_rejection_leaves_interval_empty_with_flag():
    """If only post-cutoff forecasts exist, do not silently substitute it."""
    delivery_date = "2026-01-06"
    target_start = "2026-01-06T00:00:00Z"

    # Only a post-cutoff forecast is inserted (published at 15:00 UTC on D-1)
    insert_forecasts(
        [
            {
                "dataset": "WINDFOR",
                "publishTime": "2026-01-05T15:00:00Z",
                "startTime": target_start,
                "generation": 8000.0,
            }
        ],
        db_path=TEST_DB_PATH,
    )

    result = match_day_ahead_hourly(
        delivery_date=delivery_date,
        cutoff_time="11:00",
        days_prior=1,
        db_path=TEST_DB_PATH,
    )

    interval_0 = result["intervals"][0]
    # Forecast must be None and flagged as post_cutoff_only
    assert interval_0["forecast_mw"] is None
    assert interval_0["forecast_publish_time"] is None
    assert interval_0["forecast_status"] == "post_cutoff_only"


def test_genuine_zero_actual_vs_missing():
    """Verify that actual generation of 0.0 MW is treated as 0.0, not None."""
    delivery_date = "2026-01-07"
    insert_actuals(
        [
            {
                "dataset": "FUELHH",
                "publishTime": "2026-01-07T01:00:00Z",
                "startTime": "2026-01-07T00:00:00Z",
                "settlementDate": delivery_date,
                "settlementPeriod": 1,
                "fuelType": "WIND",
                "generation": 0.0,  # Calm wind
            },
            {
                "dataset": "FUELHH",
                "publishTime": "2026-01-07T01:30:00Z",
                "startTime": "2026-01-07T00:30:00Z",
                "settlementDate": delivery_date,
                "settlementPeriod": 2,
                "fuelType": "WIND",
                "generation": 0.0,
            },
        ],
        db_path=TEST_DB_PATH,
    )

    result = match_day_ahead_hourly(
        delivery_date=delivery_date,
        cutoff_time="11:00",
        days_prior=1,
        db_path=TEST_DB_PATH,
    )

    interval_0 = result["intervals"][0]
    assert interval_0["actual_mw"] == 0.0
    assert interval_0["actual_settlement_periods_present"] == 2
