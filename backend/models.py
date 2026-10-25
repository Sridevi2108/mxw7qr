"""Pydantic Models for WindWise API."""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DecisionCutoffInfo(BaseModel):
    cutoff_time: str = Field(description="Cutoff time in HH:MM format (UTC)")
    days_prior: int = Field(description="Days prior to delivery (e.g. 1 for D-1)")
    cutoff_datetime_iso: str = Field(description="Full ISO 8601 UTC cutoff timestamp")
    timezone: str = Field(default="UTC/GMT", description="Timezone of the cutoff")
    documentation: str = Field(description="Explanation of cutoff assumption and source")


class CoverageInfo(BaseModel):
    total_intervals: int
    matched_intervals: int
    missing_forecasts: int
    missing_actuals: int
    coverage_pct: float


class MetricValue(BaseModel):
    value: Optional[float] = None
    unit: str
    description: str
    direction: Optional[str] = None


class AccuracyMetricsResponse(BaseModel):
    mae: Optional[MetricValue] = None
    rmse: Optional[MetricValue] = None
    bias: Optional[MetricValue] = None
    wape: Optional[MetricValue] = None
    sample_count: int
    expected_intervals: Optional[int] = None
    coverage_pct: float
    bias_sign_convention: str
    status: str


class MatchedInterval(BaseModel):
    interval_hour: Optional[int] = None
    settlement_period: Optional[int] = None
    settlement_periods: Optional[List[int]] = None
    delivery_start: str
    delivery_end: str
    forecast_mw: Optional[float] = None
    forecast_publish_time: Optional[str] = None
    forecast_status: Optional[str] = None
    forecast_mapping_note: Optional[str] = None
    actual_mw: Optional[float] = None
    actual_settlement_periods_present: Optional[int] = None
    error_mw: Optional[float] = None
    abs_error_mw: Optional[float] = None
    pct_error: Optional[float] = None


class DayAheadForecastResponse(BaseModel):
    delivery_date: str
    granularity: str
    decision_cutoff: DecisionCutoffInfo
    coverage: CoverageInfo
    intervals: List[MatchedInterval]
    metrics: AccuracyMetricsResponse


class DailyTrendPoint(BaseModel):
    date: str
    mae: Optional[float] = None
    rmse: Optional[float] = None
    bias: Optional[float] = None
    wape: Optional[float] = None
    sample_count: int
    coverage_pct: float


class AccuracyRangeResponse(BaseModel):
    start_date: str
    end_date: str
    decision_cutoff: DecisionCutoffInfo
    overall_metrics: AccuracyMetricsResponse
    daily_trends: List[DailyTrendPoint]


class SupplyGapScenarioRequest(BaseModel):
    delivery_date: str = Field(default="2026-01-15", description="Delivery date (YYYY-MM-DD)")
    cutoff_time: str = Field(default="11:00", description="Cutoff time on D-1 (HH:MM UTC)")
    illustrative_demand_mw: float = Field(default=25000.0, description="Hypothetical utility consumer demand in MW")
    illustrative_wind_share_pct: float = Field(
        default=10.0,
        description="Hypothetical contracted share of national wind generation (%)",
    )
    other_contracted_supply_mw: float = Field(
        default=10000.0,
        description="Other contracted baseload/supply in MW (e.g. nuclear, hydro)",
    )
    safety_margin_pct: float = Field(
        default=5.0,
        description="Optional safety reserve margin (%) to protect against forecast shortfall",
    )


class HourlyScenarioInterval(BaseModel):
    interval_hour: int
    delivery_start: str
    delivery_end: str
    illustrative_demand_mw: float
    national_wind_forecast_mw: Optional[float]
    illustrative_contracted_wind_mw: Optional[float]
    other_contracted_supply_mw: float
    safety_reserve_mw: float
    total_firm_procurement_target_mw: float
    illustrative_thermal_procurement_gap_mw: Optional[float]
    actual_imbalance_risk_mw: Optional[float]


class SupplyGapScenarioResponse(BaseModel):
    delivery_date: str
    disclaimer: str
    assumptions: Dict[str, Any]
    intervals: List[HourlyScenarioInterval]
    total_illustrative_energy_gap_mwh: float
