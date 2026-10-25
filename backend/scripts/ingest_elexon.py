"""Elexon BMRS Data Ingestion Script for January 2026.

Fetches:
1. FUELHH actual wind generation records from 2026-01-01T00:00:00Z to 2026-02-01T00:00:00Z.
2. WINDFOR wind generation forecast vintages from 2025-12-30T00:00:00Z to 2026-02-01T00:00:00Z.

Stores verified records in SQLite (windwise.db) and exports a JSON cache for frontend fallback.
"""

from __future__ import annotations
import json
import logging
import os
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.services.db import init_db, insert_actuals, insert_forecasts, DB_PATH, DB_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("elexon_ingest")

BASE_API_URL = "https://data.elexon.co.uk/bmrs/api/v1"


def fetch_url(url: str, retries: int = 3, delay: float = 2.0) -> list:
    """Fetch JSON array from URL with exponential retry."""
    headers = {"User-Agent": "WindWise/1.0 (UK Power Procurement Platform; Python-urllib)"}
    req = urllib.request.Request(url, headers=headers)
    for attempt in range(1, retries + 1):
        try:
            logger.info("GET %s (attempt %d/%d)", url, attempt, retries)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict) and "data" in data:
                    return data["data"]
                return []
        except Exception as e:
            logger.warning("Attempt %d failed: %s", attempt, e)
            if attempt < retries:
                time.sleep(delay * attempt)
            else:
                logger.error("All %d attempts failed for %s", retries, url)
                return []
    return []


def ingest_fuelhh(start_dt: datetime, end_dt: datetime, chunk_days: int = 5) -> int:
    """Fetch and insert FUELHH actual wind generation records in chunked date windows."""
    current = start_dt
    total_wind = 0

    while current < end_dt:
        chunk_end = min(current + timedelta(days=chunk_days), end_dt)
        url = (
            f"{BASE_API_URL}/datasets/FUELHH/stream"
            f"?publishDateTimeFrom={current.strftime('%Y-%m-%dT%H:%M:%SZ')}"
            f"&publishDateTimeTo={chunk_end.strftime('%Y-%m-%dT%H:%M:%SZ')}"
        )
        records = fetch_url(url)
        wind_records = [r for r in records if r.get("fuelType") == "WIND"]
        inserted = insert_actuals(wind_records)
        total_wind += len(wind_records)
        logger.info(
            "FUELHH chunk %s -> %s: fetched %d total, %d wind, inserted %d",
            current.strftime("%Y-%m-%d"),
            chunk_end.strftime("%Y-%m-%d"),
            len(records),
            len(wind_records),
            inserted,
        )
        current = chunk_end
        time.sleep(0.5)

    return total_wind


def ingest_windfor(start_dt: datetime, end_dt: datetime, chunk_days: int = 5) -> int:
    """Fetch and insert WINDFOR forecast records in chunked date windows."""
    current = start_dt
    total_forecasts = 0

    while current < end_dt:
        chunk_end = min(current + timedelta(days=chunk_days), end_dt)
        url = (
            f"{BASE_API_URL}/datasets/WINDFOR/stream"
            f"?publishDateTimeFrom={current.strftime('%Y-%m-%dT%H:%M:%SZ')}"
            f"&publishDateTimeTo={chunk_end.strftime('%Y-%m-%dT%H:%M:%SZ')}"
        )
        records = fetch_url(url)
        inserted = insert_forecasts(records)
        total_forecasts += len(records)
        logger.info(
            "WINDFOR chunk %s -> %s: fetched %d forecasts, inserted %d",
            current.strftime("%Y-%m-%d"),
            chunk_end.strftime("%Y-%m-%d"),
            len(records),
            inserted,
        )
        current = chunk_end
        time.sleep(0.5)

    return total_forecasts


def export_january_summary_json():
    """Export pre-compiled January 2026 data into backend/data and frontend/src/data."""
    from backend.services.matching import match_day_ahead_hourly, match_day_ahead_settlement_periods
    from backend.services.metrics import calculate_accuracy_metrics

    logger.info("Exporting January 2026 verified data for frontend...")
    daily_summaries = []
    all_matched_pairs = []

    for day in range(1, 32):
        date_str = f"2026-01-{day:02d}"
        hourly_match = match_day_ahead_hourly(date_str, cutoff_time="11:00", days_prior=1)
        sp_match = match_day_ahead_settlement_periods(date_str, cutoff_time="11:00", days_prior=1)

        pairs = hourly_match["matched_pairs"]
        all_matched_pairs.extend(pairs)
        metrics = calculate_accuracy_metrics(pairs, total_expected_intervals=24)

        daily_summaries.append({
            "date": date_str,
            "metrics": metrics,
            "hourly": hourly_match["intervals"],
            "settlement_periods": sp_match["intervals"],
            "coverage": hourly_match["coverage"],
            "decision_cutoff": hourly_match["decision_cutoff"],
        })

    full_month_metrics = calculate_accuracy_metrics(all_matched_pairs, total_expected_intervals=31 * 24)

    export_payload = {
        "metadata": {
            "source": "Elexon BMRS API (FUELHH wind actuals and WINDFOR forecasts)",
            "period": "January 2026",
            "extracted_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "default_cutoff": "D-1 11:00 UTC",
            "granularity_notes": "Hourly intervals compare hourly WINDFOR forecasts to 2-period averaged FUELHH actuals.",
        },
        "full_month_metrics": full_month_metrics,
        "daily": daily_summaries,
    }

    # Save to backend data
    backend_out = os.path.join(DB_DIR, "january_2026_verified.json")
    with open(backend_out, "w", encoding="utf-8") as f:
        json.dump(export_payload, f, indent=2)
    logger.info("Saved verified backend dataset to %s", backend_out)

    # Save to frontend data for offline / fallback resilience
    frontend_data_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "frontend",
        "src",
        "data",
    )
    if os.path.exists(frontend_data_dir):
        frontend_out = os.path.join(frontend_data_dir, "january_2026_verified.json")
        with open(frontend_out, "w", encoding="utf-8") as f:
            json.dump(export_payload, f, indent=2)
        logger.info("Saved verified frontend dataset to %s", frontend_out)


def main():
    logger.info("Starting Elexon BMRS ingestion for January 2026...")
    init_db()

    # 1. Ingest FUELHH Actuals (Jan 1, 2026 to Feb 1, 2026)
    fuelhh_start = datetime(2026, 1, 1, 0, 0, 0)
    fuelhh_end = datetime(2026, 2, 1, 0, 0, 0)
    total_wind = ingest_fuelhh(fuelhh_start, fuelhh_end, chunk_days=5)

    # 2. Ingest WINDFOR Forecasts (Dec 30, 2025 to Feb 1, 2026)
    # Late December covers forecasts issued for Jan 1 and Jan 2 delivery!
    windfor_start = datetime(2025, 12, 30, 0, 0, 0)
    windfor_end = datetime(2026, 2, 1, 0, 0, 0)
    total_forecasts = ingest_windfor(windfor_start, windfor_end, chunk_days=5)

    logger.info("Ingestion complete. Total wind actuals: %d, Total forecasts: %d", total_wind, total_forecasts)

    # 3. Export verified January dataset
    export_january_summary_json()
    logger.info("Data ingestion and export workflow completed successfully.")


if __name__ == "__main__":
    main()
