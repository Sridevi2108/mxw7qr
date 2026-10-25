# Video Demo — Part 2: Technical Lead Walkthrough & Architecture Review

* **Role**: Product Developer presenting the software design and implementation to the internal Technical Lead.
* **Target Audience**: Technical Lead, Senior Software Architects, and DevOps reviewers.
* **Target Duration**: 4 minutes 30 seconds (Strict maximum: 5 minutes).
* **Goal**: Enable effortless technical review, demonstrate sound architectural choices, explain data harmonization and cutoff logic, and prove code quality with automated tests.

---

## Timed Screen-by-Screen Technical Script

### [0:00 – 0:50] Architectural Overview & Tech Stack
*(Screen: Visual architecture diagram or code editor showing root directory structure)*

> **Speaker**:  
> "Hi everyone. In Part 2 of this review, I’m walking through the system architecture, data engineering pipeline, analytical models, and software engineering practices behind **WindWise**.
> 
> Let's look at the tech stack:
> - **Frontend**: React 19, TypeScript, Tailwind CSS, Recharts for composed visualisations, and Lucide icons, bundled with Vite 7.
> - **Backend**: Python 3.13 with FastAPI for high-performance async REST APIs, Pydantic V2 for strict request/response data contracts, and SQLite with Write-Ahead Logging (WAL) for persistent, low-latency historical queries.
> - **Containerization**: Multi-stage Docker build for the frontend running on Alpine Nginx, and a slim Python 3.13 container for the backend, orchestrated via Docker Compose.
> - **Resilience**: The frontend implements a dual-mode data service. It connects to the live FastAPI backend, but also bundles a pre-compiled, verified January 2026 dataset as an automatic fallback, guaranteeing zero downtime if deployed on serverless platforms like Vercel."

---

### [0:50 – 2:00] Data Engineering & Granularity Harmonization
*(Screen: Show `backend/scripts/ingest_elexon.py` and `backend/services/matching.py`)*

> **Speaker**:  
> "Let’s look at the data engineering layer. The assignment specifies using **Elexon data alone** for **January 2026**.
> 
> We pull from two official Elexon Insights Solution streams:
> 1. **`FUELHH/stream`**: Half-hourly generation by fuel type. We filter for `fuelType == 'WIND'`.
> 2. **`WINDFOR/stream`**: Wind generation forecasts published by National Grid ESO.
> 
> During data exploration, we solved two major domain challenges:
> 
> **Challenge 1: The Granularity Mismatch**.
> `FUELHH` actuals are published every **30 minutes** (48 settlement periods per day), but `WINDFOR` forecasts are issued at **1-hour resolution**. 
> To avoid naive duplication, we implemented two verified modes:
> - In **Hourly mode**, we mathematically average the two 30-minute settlement periods:
>   $$\text{Actual}_{\text{Hour}} = \frac{\text{Actual}_{\text{SP 1}} + \text{Actual}_{\text{SP 2}}}{2}$$
> - In **Settlement Period mode (48 SPs)**, the 1-hour forecast is uniformly mapped to its two constituent half-hours with explicit documentation in the API payload.
> 
> **Challenge 2: The Date Window**.
> For a decision on January 1, 2026, the D-1 decision occurred on **December 31, 2025**. Our ingestion pipeline fetches from December 30, 2025 to February 1, 2026, ingesting **1,489 actuals** and **19,272 forecast vintages**, ensuring 100% matched coverage with zero boundary dropouts."

---

### [2:00 – 3:00] Configurable Cutoff Matching Engine
*(Screen: Show `backend/services/matching.py` function `match_day_ahead_hourly`)*

> **Speaker**:  
> "Next, let’s examine the **Day-Ahead Decision Cutoff algorithm** in `backend/services/matching.py`.
> 
> We do not assume 11:00 UTC or 12:00 UTC is an immutable universal cutoff. Instead, `compute_cutoff_datetime` accepts a configurable cutoff time and day offset.
> 
> For any delivery date $D$, the cutoff timestamp is computed as:
> $$\text{Cutoff} = (D - 1\text{ day}) \text{ at } \text{Cutoff Time (UTC)}$$
> 
> Our SQL query filters forecasts strictly where `publish_time <= cutoff_iso` and orders by `publish_time DESC LIMIT 1`. This extracts the **latest eligible forecast vintage** available prior to auction lock.
> 
> Crucially, if only post-cutoff forecasts exist, the engine does **not** silently substitute them. It marks the interval as `forecast_status: 'post_cutoff_only'` and leaves the forecast field `None`, rendering a transparent data availability warning on the frontend."

---

### [3:00 – 3:50] Mathematical Metrics & Automated Test Suite
*(Screen: Open terminal and execute `python -m pytest backend/tests/ -v`)*

> **Speaker**:  
> "Now let's examine the mathematical formulation in `backend/services/metrics.py`.
> 
> We implement:
> - $\text{MAE} = \frac{1}{N} \sum |F - A|$
> - $\text{RMSE} = \sqrt{\frac{1}{N} \sum (F - A)^2}$
> - $\text{Mean Bias} = \frac{1}{N} \sum (F - A)$, where positive explicitly indicates over-forecasting.
> - $\text{WAPE} = \frac{\sum |F - A|}{\sum A} \times 100\%$, with a zero-division guard.
> 
> Let's run our automated test suite live in terminal:
> `python -m pytest backend/tests/ -v`
> 
> As you can see: **all 17 unit and API integration tests pass in 2.8 seconds**:
> - 6 tests in `test_metrics.py` covering perfect forecasts, hand-calculated values, under-forecast bias sign, zero actual sums, and NaN filtering.
> - 4 tests in `test_matching.py` verifying cutoff filtering, post-cutoff rejection, and genuine zero generation handling.
> - 7 tests in `test_api.py` validating FastAPI endpoints, Swagger serialization, and CSV exports."

---

### [3:50 – 4:30] Docker, Nginx & Deployment Architecture
*(Screen: Show `docker-compose.yml` and Docker Desktop running)*

> **Speaker**:  
> "Finally, let's look at deployment.
> 
> Our `docker-compose.yml` defines a production-ready stack:
> - **`windwise-backend`**: Exposes FastAPI on port 8000 with a health check querying `/api/health`. We bind `./backend/data` to persist the SQLite database across container restarts.
> - **`windwise-frontend`**: Multi-stage build. Node 22 compiles the Vite TypeScript bundle into minified static assets. An Nginx Alpine container then serves these assets on port 3000, while reverse-proxying `/api/` calls directly to the backend service.
> - For cloud deployment, the frontend includes a tested `vercel.json` with SPA rewrites, ready for instant deployment.
> 
> In conclusion, the codebase is modular, fully tested, follows clean architectural separation, and provides complete audit transparency.
> 
> Thank you, and I look forward to your code review feedback."

---

## Technical Review Checklist:
* [ ] Terminal open and ready to run `python -m pytest backend/tests/ -v`.
* [ ] Code editor open displaying `backend/services/matching.py` and `backend/services/metrics.py`.
* [ ] Docker Desktop open showing both containers running healthy on ports 3000 and 8000.
* [ ] Keep pacing crisp and technical; highlight error handling and testing.
