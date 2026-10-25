"""Automated API integration tests for WindWise FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "records" in data
    assert data["records"]["actuals_fuelhh"] > 0
    assert data["records"]["forecasts_windfor"] > 0


def test_day_ahead_forecast_endpoint_default():
    res = client.get("/api/forecast/day-ahead?delivery_date=2026-01-15&cutoff_time=11:00")
    assert res.status_code == 200
    data = res.json()
    assert data["delivery_date"] == "2026-01-15"
    assert data["decision_cutoff"]["cutoff_time"] == "11:00"
    assert data["decision_cutoff"]["cutoff_datetime_iso"] == "2026-01-14T11:00:00Z"
    assert len(data["intervals"]) == 24
    assert data["coverage"]["total_intervals"] == 24
    assert data["metrics"]["status"] == "valid"


def test_day_ahead_forecast_half_hourly():
    res = client.get("/api/forecast/day-ahead?delivery_date=2026-01-15&granularity=half_hourly")
    assert res.status_code == 200
    data = res.json()
    assert data["granularity"] == "half_hourly"
    assert len(data["intervals"]) == 48


def test_day_ahead_forecast_invalid_date():
    res = client.get("/api/forecast/day-ahead?delivery_date=invalid-date")
    assert res.status_code == 400


def test_accuracy_range_endpoint():
    res = client.get("/api/accuracy?start=2026-01-01&end=2026-01-07&cutoff_time=11:00")
    assert res.status_code == 200
    data = res.json()
    assert data["start_date"] == "2026-01-01"
    assert data["end_date"] == "2026-01-07"
    assert len(data["daily_trends"]) == 7
    assert data["overall_metrics"]["status"] == "valid"
    assert data["overall_metrics"]["sample_count"] == 7 * 24
    assert data["overall_metrics"]["mae"]["value"] > 0


def test_delivery_data_and_csv_export():
    # JSON delivery endpoint
    res = client.get("/api/delivery?date=2026-01-15&granularity=half_hourly")
    assert res.status_code == 200
    data = res.json()
    assert len(data["intervals"]) == 48

    # CSV delivery endpoint
    csv_res = client.get("/api/delivery/csv?date=2026-01-15&granularity=half_hourly")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "settlement_period,delivery_start" in csv_res.text


def test_supply_gap_scenario_endpoint():
    payload = {
        "delivery_date": "2026-01-15",
        "cutoff_time": "11:00",
        "illustrative_demand_mw": 30000.0,
        "illustrative_wind_share_pct": 10.0,
        "other_contracted_supply_mw": 12000.0,
        "safety_margin_pct": 5.0,
    }
    res = client.post("/api/scenario/supply-gap", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "ILLUSTRATIVE SCENARIO ESTIMATE ONLY" in data["disclaimer"]
    assert len(data["intervals"]) == 24
    assert data["total_illustrative_energy_gap_mwh"] >= 0.0
