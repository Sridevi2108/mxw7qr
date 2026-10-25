"""WindWise FastAPI Backend Service.

Provides REST APIs for:
1. Day-Ahead Wind Forecast Retrieval with Configurable Decision Cutoffs.
2. Quantitative Forecast Accuracy Analysis (MAE, RMSE, Bias, WAPE, Coverage).
3. Interval Delivery Data and CSV Audit Exports.
4. Illustrative Supply Gap Scenario calculations for utility planning.
"""

from __future__ import annotations
import io
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from backend.models import (
    AccuracyMetricsResponse,
    AccuracyRangeResponse,
    DailyTrendPoint,
    DayAheadForecastResponse,
    DecisionCutoffInfo,
    HourlyScenarioInterval,
    MatchedInterval,
    SupplyGapScenarioRequest,
    SupplyGapScenarioResponse,
)
from backend.services.db import DB_PATH, get_db_connection, init_db
from backend.services.matching import (
    compute_cutoff_datetime,
    match_day_ahead_hourly,
    match_day_ahead_settlement_periods,
)
from backend.services.metrics import calculate_accuracy_metrics

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("windwise_api")

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure database schema is ready on startup."""
    init_db(DB_PATH)
    logger.info("WindWise API started. Database at %s", DB_PATH)
    yield


app = FastAPI(
    title="WindWise API",
    description="UK Day-Ahead Wind Generation Forecasting & Accuracy Evaluation Platform",
    version="1.0.0",
    lifespan=lifespan,
)

cors_env = os.getenv("CORS_ORIGINS", "*")
origins = [origin.strip() for origin in cors_env.split(",")] if cors_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """Health status and database record statistics."""
    actuals_count = 0
    forecasts_count = 0
    try:
        conn = get_db_connection(DB_PATH)
        actuals_count = conn.execute("SELECT count(*) FROM actuals_fuelhh").fetchone()[0]
        forecasts_count = conn.execute("SELECT count(*) FROM forecasts_windfor").fetchone()[0]
        conn.close()
    except Exception as e:
        logger.warning("Error checking DB record count: %s", e)

    return {
        "status": "healthy",
        "service": "WindWise API",
        "version": "1.0.0",
        "records": {
            "actuals_fuelhh": actuals_count,
            "forecasts_windfor": forecasts_count,
        },
        "database_path": DB_PATH,
    }


@app.get("/api/forecast/day-ahead", response_model=DayAheadForecastResponse)
def get_day_ahead_forecast(
    delivery_date: str = Query("2026-01-15", description="Delivery date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00", description="Configurable D-1 cutoff time (HH:MM UTC)"),
    days_prior: int = Query(1, description="Days prior to delivery when decision is made"),
    granularity: str = Query("hourly", description="Granularity: 'hourly' or 'half_hourly'"),
):
    """Retrieve Day-Ahead wind forecast matched with actuals for a specific delivery date.

    Only forecasts published on or before the configured decision cutoff are eligible.
    """
    try:
        datetime.strptime(delivery_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid delivery_date format. Must be YYYY-MM-DD.")

    if granularity == "half_hourly":
        matched = match_day_ahead_settlement_periods(
            delivery_date=delivery_date,
            cutoff_time=cutoff_time,
            days_prior=days_prior,
            db_path=DB_PATH,
        )
        total_expected = 48
    else:
        matched = match_day_ahead_hourly(
            delivery_date=delivery_date,
            cutoff_time=cutoff_time,
            days_prior=days_prior,
            db_path=DB_PATH,
        )
        total_expected = 24

    metrics_raw = calculate_accuracy_metrics(
        matched["matched_pairs"],
        total_expected_intervals=total_expected,
    )

    return DayAheadForecastResponse(
        delivery_date=matched["delivery_date"],
        granularity=matched["granularity"],
        decision_cutoff=DecisionCutoffInfo(**matched["decision_cutoff"]),
        coverage=matched["coverage"],
        intervals=[MatchedInterval(**i) for i in matched["intervals"]],
        metrics=AccuracyMetricsResponse(**metrics_raw),
    )


@app.get("/api/accuracy", response_model=AccuracyRangeResponse)
def get_accuracy_metrics(
    start: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    end: str = Query("2026-01-31", description="End date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00", description="Cutoff time on D-1 (HH:MM UTC)"),
    days_prior: int = Query(1, description="Days prior to delivery (default 1)"),
):
    """Calculate aggregate and daily forecast accuracy metrics across a date range."""
    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d")
        end_dt = datetime.strptime(end, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be formatted as YYYY-MM-DD.")

    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="start date must be on or before end date.")

    daily_trends: List[DailyTrendPoint] = []
    all_matched_pairs: List[tuple] = []
    current_dt = start_dt

    while current_dt <= end_dt:
        date_str = current_dt.strftime("%Y-%m-%d")
        matched = match_day_ahead_hourly(
            delivery_date=date_str,
            cutoff_time=cutoff_time,
            days_prior=days_prior,
            db_path=DB_PATH,
        )
        pairs = matched["matched_pairs"]
        all_matched_pairs.extend(pairs)
        daily_m = calculate_accuracy_metrics(pairs, total_expected_intervals=24)

        daily_trends.append(
            DailyTrendPoint(
                date=date_str,
                mae=daily_m["mae"]["value"] if daily_m.get("mae") else None,
                rmse=daily_m["rmse"]["value"] if daily_m.get("rmse") else None,
                bias=daily_m["bias"]["value"] if daily_m.get("bias") else None,
                wape=daily_m["wape"]["value"] if daily_m.get("wape") else None,
                sample_count=daily_m["sample_count"],
                coverage_pct=daily_m["coverage_pct"],
            )
        )
        current_dt += timedelta(days=1)

    total_days = (end_dt - start_dt).days + 1
    total_expected = total_days * 24

    overall_metrics_raw = calculate_accuracy_metrics(
        all_matched_pairs,
        total_expected_intervals=total_expected,
    )

    cutoff_iso = compute_cutoff_datetime(end, cutoff_time, days_prior)
    cutoff_info = DecisionCutoffInfo(
        cutoff_time=cutoff_time,
        days_prior=days_prior,
        cutoff_datetime_iso=cutoff_iso,
        timezone="UTC/GMT",
        documentation=(
            f"Evaluated with Day-Ahead decision cutoff at {cutoff_time} UTC on Day D-{days_prior}. "
            "Only forecasts published strictly on or before cutoff are eligible."
        ),
    )

    return AccuracyRangeResponse(
        start_date=start,
        end_date=end,
        decision_cutoff=cutoff_info,
        overall_metrics=AccuracyMetricsResponse(**overall_metrics_raw),
        daily_trends=daily_trends,
    )


@app.get("/api/delivery")
def get_delivery_data(
    date: str = Query("2026-01-15", description="Delivery date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00", description="Cutoff time on D-1 (HH:MM UTC)"),
    days_prior: int = Query(1, description="Days prior to delivery (default 1)"),
    granularity: str = Query("half_hourly", description="'half_hourly' or 'hourly'"),
):
    """Retrieve full delivery intervals for tabular inspection."""
    if granularity == "half_hourly":
        return match_day_ahead_settlement_periods(
            delivery_date=date,
            cutoff_time=cutoff_time,
            days_prior=days_prior,
            db_path=DB_PATH,
        )
    return match_day_ahead_hourly(
        delivery_date=date,
        cutoff_time=cutoff_time,
        days_prior=days_prior,
        db_path=DB_PATH,
    )


@app.get("/api/delivery/csv")
def export_delivery_csv(
    date: str = Query("2026-01-15", description="Delivery date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00", description="Cutoff time on D-1 (HH:MM UTC)"),
    days_prior: int = Query(1, description="Days prior to delivery (default 1)"),
    granularity: str = Query("half_hourly", description="'half_hourly' or 'hourly'"),
):
    """Export delivery interval data as a CSV file."""
    if granularity == "half_hourly":
        data = match_day_ahead_settlement_periods(date, cutoff_time, days_prior, DB_PATH)
        header = "settlement_period,delivery_start,delivery_end,forecast_mw,forecast_publish_time,actual_mw,error_mw,abs_error_mw,pct_error\n"
        lines = [
            f"{i['settlement_period']},{i['delivery_start']},{i['delivery_end']},{i['forecast_mw'] or ''},{i['forecast_publish_time'] or ''},{i['actual_mw'] or ''},{i['error_mw'] or ''},{i['abs_error_mw'] or ''},{i['pct_error'] or ''}\n"
            for i in data["intervals"]
        ]
    else:
        data = match_day_ahead_hourly(date, cutoff_time, days_prior, DB_PATH)
        header = "interval_hour,settlement_periods,delivery_start,delivery_end,forecast_mw,forecast_publish_time,actual_mw,error_mw,abs_error_mw,pct_error\n"
        lines = [
            f"{i['interval_hour']},\"{i['settlement_periods'][0]}-{i['settlement_periods'][1]}\",{i['delivery_start']},{i['delivery_end']},{i['forecast_mw'] or ''},{i['forecast_publish_time'] or ''},{i['actual_mw'] or ''},{i['error_mw'] or ''},{i['abs_error_mw'] or ''},{i['pct_error'] or ''}\n"
            for i in data["intervals"]
        ]

    csv_content = header + "".join(lines)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=windwise_delivery_{date}_{granularity}.csv"},
    )


@app.post("/api/scenario/supply-gap", response_model=SupplyGapScenarioResponse)
def calculate_supply_gap_scenario(req: SupplyGapScenarioRequest):
    """Calculate an Illustrative Supply Gap Scenario.

    DISCLAIMER: National wind generation forecasts alone cannot determine a utility's
    actual electricity procurement requirements. This scenario provides hypothetical
    estimates assuming an illustrative contracted share of national wind generation.
    """
    matched = match_day_ahead_hourly(
        delivery_date=req.delivery_date,
        cutoff_time=req.cutoff_time,
        days_prior=1,
        db_path=DB_PATH,
    )

    intervals: List[HourlyScenarioInterval] = []
    total_gap_mwh = 0.0

    for item in matched["intervals"]:
        nat_fc = item["forecast_mw"]
        contracted_wind: Optional[float] = None
        thermal_gap: Optional[float] = None
        imbalance_risk: Optional[float] = None

        safety_reserve = req.illustrative_demand_mw * (req.safety_margin_pct / 100.0)
        firm_target = req.illustrative_demand_mw + safety_reserve

        if nat_fc is not None:
            contracted_wind = round(nat_fc * (req.illustrative_wind_share_pct / 100.0), 1)
            total_supply = contracted_wind + req.other_contracted_supply_mw
            thermal_gap = max(0.0, round(firm_target - total_supply, 1))
            total_gap_mwh += thermal_gap

            # Imbalance risk if actual wind differed
            if item["actual_mw"] is not None:
                actual_contracted = item["actual_mw"] * (req.illustrative_wind_share_pct / 100.0)
                imbalance_risk = round(contracted_wind - actual_contracted, 1)

        intervals.append(
            HourlyScenarioInterval(
                interval_hour=item["interval_hour"],
                delivery_start=item["delivery_start"],
                delivery_end=item["delivery_end"],
                illustrative_demand_mw=req.illustrative_demand_mw,
                national_wind_forecast_mw=nat_fc,
                illustrative_contracted_wind_mw=contracted_wind,
                other_contracted_supply_mw=req.other_contracted_supply_mw,
                safety_reserve_mw=round(safety_reserve, 1),
                total_firm_procurement_target_mw=round(firm_target, 1),
                illustrative_thermal_procurement_gap_mw=thermal_gap,
                actual_imbalance_risk_mw=imbalance_risk,
            )
        )

    return SupplyGapScenarioResponse(
        delivery_date=req.delivery_date,
        disclaimer=(
            "ILLUSTRATIVE SCENARIO ESTIMATE ONLY: National wind generation is not the utility's "
            "own contracted electricity supply. This calculation models a hypothetical contracted "
            f"share ({req.illustrative_wind_share_pct}%) of national generation against illustrative "
            "demand and other supply assumptions. It does not represent actual utility procurement."
        ),
        assumptions={
            "illustrative_demand_mw": req.illustrative_demand_mw,
            "illustrative_wind_share_pct": req.illustrative_wind_share_pct,
            "other_contracted_supply_mw": req.other_contracted_supply_mw,
            "safety_margin_pct": req.safety_margin_pct,
            "cutoff_time": req.cutoff_time,
        },
        intervals=intervals,
        total_illustrative_energy_gap_mwh=round(total_gap_mwh, 1),
    )
