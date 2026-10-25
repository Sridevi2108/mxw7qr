"""Forecast Matching and Decision Cutoff Service for WindWise.

Handles:
1. Configurable Day-Ahead Decision Cutoff logic (D-1 at specified time in UTC/GMT).
2. Selection of the latest eligible forecast published on or before cutoff.
3. Strict rejection of post-cutoff forecasts with transparent warnings.
4. Granularity harmonization between 1-hour WINDFOR and 30-minute FUELHH.
5. Distinction between genuine zero generation and missing data.
"""

from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import sqlite3

from backend.services.db import get_db_connection, DB_PATH


def compute_cutoff_datetime(
    delivery_date: str,
    cutoff_time: str = "11:00",
    days_prior: int = 1,
) -> str:
    """Calculate the exact ISO UTC cutoff timestamp for a given delivery date.

    Args:
        delivery_date: Delivery date string (YYYY-MM-DD).
        cutoff_time: Configurable cutoff time (HH:MM), defaults to 11:00 UTC.
        days_prior: Number of days prior to delivery when decision is taken
                    (default 1 for Day-Ahead auction gate closure).

    Returns:
        ISO 8601 UTC timestamp string, e.g. '2026-01-14T11:00:00Z'.
    """
    dt = datetime.strptime(delivery_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    cutoff_dt = dt - timedelta(days=days_prior)
    hour, minute = [int(p) for p in cutoff_time.split(":")[:2]]
    cutoff_dt = cutoff_dt.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return cutoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def match_day_ahead_hourly(
    delivery_date: str,
    cutoff_time: str = "11:00",
    days_prior: int = 1,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Produce hourly matched intervals for a delivery day against a configurable cutoff.

    Harmonization methodology:
    - Target delivery day has 24 hourly intervals (00:00 to 23:00 UTC).
    - Forecast: Latest WINDFOR published on or before cutoff_datetime for start_time.
    - Actual: Average of the two 30-minute FUELHH settlement periods for that hour.
    """
    cutoff_iso = compute_cutoff_datetime(delivery_date, cutoff_time, days_prior)
    conn = get_db_connection(db_path)

    intervals: List[Dict[str, Any]] = []
    missing_forecast_count = 0
    missing_actual_count = 0
    matched_pairs: List[Tuple[float, float]] = []

    for hour in range(24):
        start_iso = f"{delivery_date}T{hour:02d}:00:00Z"
        end_iso = (
            datetime.strptime(start_iso, "%Y-%m-%dT%H:%M:%SZ") + timedelta(hours=1)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")

        # 1. Fetch latest eligible forecast on or before cutoff
        fc_row = conn.execute(
            """
            SELECT publish_time, generation_mw FROM forecasts_windfor
            WHERE start_time = ?
              AND publish_time <= ?
            ORDER BY publish_time DESC
            LIMIT 1
            """,
            (start_iso, cutoff_iso),
        ).fetchone()

        # Check if a post-cutoff forecast exists (to inform user if data was rejected by cutoff rule)
        post_cutoff_row = conn.execute(
            """
            SELECT publish_time FROM forecasts_windfor
            WHERE start_time = ?
              AND publish_time > ?
            ORDER BY publish_time ASC
            LIMIT 1
            """,
            (start_iso, cutoff_iso),
        ).fetchone()

        forecast_mw: Optional[float] = None
        publish_time: Optional[str] = None
        fc_status = "available"

        if fc_row:
            forecast_mw = round(float(fc_row["generation_mw"]), 1)
            publish_time = fc_row["publish_time"]
        else:
            missing_forecast_count += 1
            fc_status = (
                "post_cutoff_only"
                if post_cutoff_row
                else "no_forecast_found"
            )

        # 2. Fetch FUELHH actuals for the two 30-min settlement periods in this hour
        sp_start1 = start_iso
        sp_start2 = f"{delivery_date}T{hour:02d}:30:00Z"
        act_rows = conn.execute(
            """
            SELECT settlement_period, generation_mw FROM actuals_fuelhh
            WHERE fuel_type = 'WIND'
              AND start_time IN (?, ?)
            ORDER BY start_time ASC
            """,
            (sp_start1, sp_start2),
        ).fetchall()

        actual_mw: Optional[float] = None
        sp_count = len(act_rows)

        if sp_count == 2:
            # Full hourly actual coverage
            actual_mw = round((float(act_rows[0]["generation_mw"]) + float(act_rows[1]["generation_mw"])) / 2.0, 1)
        elif sp_count == 1:
            # Partial coverage (one settlement period available)
            actual_mw = round(float(act_rows[0]["generation_mw"]), 1)
        else:
            missing_actual_count += 1

        # 3. Calculate error if both exist
        error_mw: Optional[float] = None
        abs_error_mw: Optional[float] = None
        pct_error: Optional[float] = None

        if forecast_mw is not None and actual_mw is not None:
            error_mw = round(forecast_mw - actual_mw, 1)
            abs_error_mw = round(abs(error_mw), 1)
            pct_error = (
                round((error_mw / actual_mw) * 100.0, 1) if actual_mw > 0 else None
            )
            matched_pairs.append((forecast_mw, actual_mw))

        intervals.append({
            "interval_hour": hour,
            "settlement_periods": [hour * 2 + 1, hour * 2 + 2],
            "delivery_start": start_iso,
            "delivery_end": end_iso,
            "forecast_mw": forecast_mw,
            "forecast_publish_time": publish_time,
            "forecast_status": fc_status,
            "actual_mw": actual_mw,
            "actual_settlement_periods_present": sp_count,
            "error_mw": error_mw,
            "abs_error_mw": abs_error_mw,
            "pct_error": pct_error,
        })

    conn.close()

    return {
        "delivery_date": delivery_date,
        "granularity": "hourly",
        "decision_cutoff": {
            "cutoff_time": cutoff_time,
            "days_prior": days_prior,
            "cutoff_datetime_iso": cutoff_iso,
            "timezone": "UTC/GMT",
            "documentation": (
                f"Evaluated with Day-Ahead decision cutoff at {cutoff_time} UTC on Day D-{days_prior}. "
                "Only forecasts published strictly on or before this cutoff are considered eligible."
            ),
        },
        "coverage": {
            "total_intervals": 24,
            "matched_intervals": len(matched_pairs),
            "missing_forecasts": missing_forecast_count,
            "missing_actuals": missing_actual_count,
            "coverage_pct": round((len(matched_pairs) / 24) * 100.0, 1),
        },
        "intervals": intervals,
        "matched_pairs": matched_pairs,
    }


def match_day_ahead_settlement_periods(
    delivery_date: str,
    cutoff_time: str = "11:00",
    days_prior: int = 1,
    db_path: str = DB_PATH,
) -> Dict[str, Any]:
    """Produce 48 half-hour settlement period intervals for a delivery day.

    Harmonization methodology:
    - 48 settlement periods (SP 1 to 48) covering 00:00 to 24:00 UTC.
    - Each hour's WINDFOR forecast (e.g. 01:00) maps to its two 30-min settlement periods
      (SP 3 01:00–01:30 and SP 4 01:30–02:00).
    - Actuals are matched directly from FUELHH by settlementPeriod.
    """
    cutoff_iso = compute_cutoff_datetime(delivery_date, cutoff_time, days_prior)
    conn = get_db_connection(db_path)

    intervals: List[Dict[str, Any]] = []
    matched_pairs: List[Tuple[float, float]] = []
    missing_forecast_count = 0
    missing_actual_count = 0

    for sp in range(1, 49):
        # Calculate start and end times for this settlement period
        minute_offset = (sp - 1) * 30
        start_dt = datetime.strptime(delivery_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(minutes=minute_offset)
        end_dt = start_dt + timedelta(minutes=30)

        start_iso = start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        end_iso = end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        # Hourly forecast anchor start (hour start)
        hour_start_iso = start_dt.replace(minute=0).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Fetch latest eligible hourly forecast published on or before cutoff
        fc_row = conn.execute(
            """
            SELECT publish_time, generation_mw FROM forecasts_windfor
            WHERE start_time = ?
              AND publish_time <= ?
            ORDER BY publish_time DESC
            LIMIT 1
            """,
            (hour_start_iso, cutoff_iso),
        ).fetchone()

        forecast_mw: Optional[float] = None
        publish_time: Optional[str] = None
        if fc_row:
            forecast_mw = round(float(fc_row["generation_mw"]), 1)
            publish_time = fc_row["publish_time"]
        else:
            missing_forecast_count += 1

        # Fetch actual FUELHH for this specific settlement period
        act_row = conn.execute(
            """
            SELECT generation_mw FROM actuals_fuelhh
            WHERE fuel_type = 'WIND'
              AND settlement_date = ?
              AND settlement_period = ?
            LIMIT 1
            """,
            (delivery_date, sp),
        ).fetchone()

        actual_mw: Optional[float] = None
        if act_row:
            actual_mw = round(float(act_row["generation_mw"]), 1)
        else:
            missing_actual_count += 1

        error_mw: Optional[float] = None
        abs_error_mw: Optional[float] = None
        pct_error: Optional[float] = None

        if forecast_mw is not None and actual_mw is not None:
            error_mw = round(forecast_mw - actual_mw, 1)
            abs_error_mw = round(abs(error_mw), 1)
            pct_error = round((error_mw / actual_mw) * 100.0, 1) if actual_mw > 0 else None
            matched_pairs.append((forecast_mw, actual_mw))

        intervals.append({
            "settlement_period": sp,
            "delivery_start": start_iso,
            "delivery_end": end_iso,
            "forecast_mw": forecast_mw,
            "forecast_publish_time": publish_time,
            "forecast_mapping_note": "Mapped from 1-hour ESO wind forecast for " + hour_start_iso,
            "actual_mw": actual_mw,
            "error_mw": error_mw,
            "abs_error_mw": abs_error_mw,
            "pct_error": pct_error,
        })

    conn.close()

    return {
        "delivery_date": delivery_date,
        "granularity": "half_hourly",
        "decision_cutoff": {
            "cutoff_time": cutoff_time,
            "days_prior": days_prior,
            "cutoff_datetime_iso": cutoff_iso,
            "timezone": "UTC/GMT",
            "documentation": (
                f"Evaluated with Day-Ahead decision cutoff at {cutoff_time} UTC on Day D-{days_prior}. "
                "Hourly WINDFOR forecasts mapped to constituent half-hour settlement periods."
            ),
        },
        "coverage": {
            "total_intervals": 48,
            "matched_intervals": len(matched_pairs),
            "missing_forecasts": missing_forecast_count,
            "missing_actuals": missing_actual_count,
            "coverage_pct": round((len(matched_pairs) / 48) * 100.0, 1),
        },
        "intervals": intervals,
        "matched_pairs": matched_pairs,
    }
