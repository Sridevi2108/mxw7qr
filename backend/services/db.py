"""Database Access Layer for WindWise.

Stores raw Elexon BMRS datasets (FUELHH actuals and WINDFOR forecasts) in SQLite.
Enables fast, reliable querying with indexed delivery and publication timestamps.
"""

from __future__ import annotations
import os
import sqlite3
from typing import Any, Dict, List, Optional, Tuple

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "windwise.db")


def get_db_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    """Return a configured SQLite connection with row factory and WAL mode."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn


def init_db(db_path: str = DB_PATH) -> None:
    """Create raw and matched tables with proper indexes."""
    conn = get_db_connection(db_path)
    with conn:
        # 1. Actuals table (from FUELHH stream, fuelType=WIND)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS actuals_fuelhh (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dataset TEXT NOT NULL,
                publish_time TEXT NOT NULL,
                start_time TEXT NOT NULL,
                settlement_date TEXT NOT NULL,
                settlement_period INTEGER NOT NULL,
                fuel_type TEXT NOT NULL,
                generation_mw REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(start_time, fuel_type)
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_actuals_date_start 
            ON actuals_fuelhh (settlement_date, start_time)
        """)

        # 2. Forecasts table (from WINDFOR stream)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS forecasts_windfor (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dataset TEXT NOT NULL,
                publish_time TEXT NOT NULL,
                start_time TEXT NOT NULL,
                generation_mw REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(publish_time, start_time)
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_forecasts_start_publish 
            ON forecasts_windfor (start_time, publish_time)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_forecasts_publish 
            ON forecasts_windfor (publish_time)
        """)

    conn.close()


def insert_actuals(records: List[Dict[str, Any]], db_path: str = DB_PATH) -> int:
    """Batch insert or ignore FUELHH actual records."""
    if not records:
        return 0
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    rows = [
        (
            r.get("dataset", "FUELHH"),
            r["publishTime"],
            r["startTime"],
            r["settlementDate"],
            int(r["settlementPeriod"]),
            r["fuelType"],
            float(r["generation"]),
        )
        for r in records
        if r.get("generation") is not None and r.get("startTime")
    ]
    cursor.executemany(
        """
        INSERT OR IGNORE INTO actuals_fuelhh
        (dataset, publish_time, start_time, settlement_date, settlement_period, fuel_type, generation_mw)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    inserted = cursor.rowcount
    conn.commit()
    conn.close()
    return inserted


def insert_forecasts(records: List[Dict[str, Any]], db_path: str = DB_PATH) -> int:
    """Batch insert or ignore WINDFOR forecast records."""
    if not records:
        return 0
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    rows = [
        (
            r.get("dataset", "WINDFOR"),
            r["publishTime"],
            r["startTime"],
            float(r["generation"]),
        )
        for r in records
        if r.get("generation") is not None and r.get("startTime") and r.get("publishTime")
    ]
    cursor.executemany(
        """
        INSERT OR IGNORE INTO forecasts_windfor
        (dataset, publish_time, start_time, generation_mw)
        VALUES (?, ?, ?, ?)
        """,
        rows,
    )
    inserted = cursor.rowcount
    conn.commit()
    conn.close()
    return inserted


def get_actuals_for_range(start_date: str, end_date: str, db_path: str = DB_PATH) -> List[sqlite3.Row]:
    """Retrieve actual wind generation records between settlement_date start and end (inclusive)."""
    conn = get_db_connection(db_path)
    rows = conn.execute(
        """
        SELECT * FROM actuals_fuelhh
        WHERE fuel_type = 'WIND'
          AND settlement_date >= ?
          AND settlement_date <= ?
        ORDER BY start_time ASC
        """,
        (start_date, end_date),
    ).fetchall()
    conn.close()
    return rows


def get_forecasts_for_interval(
    start_time: str,
    max_publish_time: str,
    db_path: str = DB_PATH,
) -> Optional[sqlite3.Row]:
    """Get the latest forecast published on or before max_publish_time for a given start_time."""
    conn = get_db_connection(db_path)
    row = conn.execute(
        """
        SELECT * FROM forecasts_windfor
        WHERE start_time = ?
          AND publish_time <= ?
        ORDER BY publish_time DESC
        LIMIT 1
        """,
        (start_time, max_publish_time),
    ).fetchone()
    conn.close()
    return row
