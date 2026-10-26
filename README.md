# WindWise: UK Day-Ahead Wind Generation Forecasting & Accuracy Evaluation Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-17%20Passed-brightgreen.svg)]()

WindWise is an energy market analytics platform developed for **UK power procurement trading desks**. It enables electricity utilities to evaluate national renewable wind forecasts at Day-Ahead auction gate closures, quantify historical forecasting error, and optimize thermal power procurement while avoiding punitive system cashout penalties.

---

## 1. Directory Structure & File Overview

```text
windwise/
├── backend/
│   ├── data/
│   │   ├── windwise.db             # Persistent SQLite database (WAL mode, indexed)
│   │   └── january_2026_verified.json # Exported verified January 2026 dataset
│   ├── scripts/
│   │   ├── __init__.py
│   │   └── ingest_elexon.py        # Automated ETL script for Elexon BMRS API
│   ├── services/
│   │   ├── __init__.py
│   │   ├── db.py                   # SQLite connection & table management
│   │   ├── matching.py             # Configurable D-1 cutoff & interval matching
│   │   └── metrics.py              # Mathematical formulas (MAE, RMSE, Bias, WAPE)
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_api.py             # FastAPI integration & routing tests
│   │   ├── test_matching.py        # Strict cutoff & vintage selection tests
│   │   └── test_metrics.py         # Formula & edge-case unit tests
│   ├── Dockerfile                  # Python 3.13-slim production container
│   ├── main.py                     # FastAPI REST API application & endpoints
│   ├── models.py                   # Pydantic V2 data contracts & validation
│   └── requirements.txt            # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/             # Sidebar, Topbar
│   │   │   └── ui/                 # KPICard, Card, Button, Badge, States
│   │   ├── data/
│   │   │   ├── january_2026_verified.json # Bundled offline/fallback dataset
│   │   │   └── mockData.ts         # Synthetic development fallback
│   │   ├── hooks/
│   │   │   ├── useForecastSummary.ts
│   │   │   └── useGeneration.ts
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx   # Day-Ahead Decision Cockpit & Scenario Tool
│   │   │   ├── AccuracyPage.tsx    # Quantitative Error Scorecard & Trends
│   │   │   └── DeliveryPage.tsx    # 48-Period Delivery Ledger & CSV Export
│   │   ├── services/
│   │   │   └── api.ts              # API client with automatic offline fallback
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript interfaces & domain types
│   │   ├── utils/
│   │   │   └── metrics.ts          # Client-side metrics and CSV formatting
│   │   ├── App.tsx                 # Root application component
│   │   └── main.tsx                # React entrypoint
│   ├── Dockerfile                  # Multi-stage Node 22 + Nginx Alpine container
│   ├── nginx.conf                  # Nginx reverse proxy & SPA routing config
│   ├── package.json                # Frontend dependencies
│   ├── tsconfig.json               # TypeScript configuration
│   ├── vercel.json                 # Vercel deployment configuration
│   └── vite.config.ts              # Vite 7 build configuration
├── docs/
│   └── presentation/
│       ├── part1_client_pitch.md   # Part 1 Video Script (< 5 min client presentation)
│       └── part2_tech_lead_review.md # Part 2 Video Script (< 5 min tech lead review)
├── docker-compose.yml              # Multi-container orchestration config
├── .dockerignore                   # Docker build ignore rules
├── implementation_plan.md          # Architectural design & implementation plan
└── README.md                       # Comprehensive project documentation
```

---

## 2. Quickstart: How to Run the Application

### Option A: Using Docker Compose (Recommended)

Make sure Docker Desktop is running, then execute from the project root:

```bash
docker compose up -d --build
```

* **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
* **Backend API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

To stop containers:
```bash
docker compose down
```

---

### Option B: Running Locally (Development Mode)

#### 1. Backend Setup (Python 3.13)
```bash
# Open terminal in d:\windwise
python -m pip install -r backend/requirements.txt

# Run the automated test suite (17 tests)
python -m pytest backend/tests/ -v

# Start the FastAPI backend server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup (Node 22)
```bash
# Open a second terminal in d:\windwise\frontend
cd frontend
npm install
npm run dev
```
* **Frontend Web App**: [http://localhost:5173](http://localhost:5173) (or [http://localhost:5174](http://localhost:5174))

---

## 3. Data Methodology & Market Logic

The platform relies **exclusively on national-level generation data from Elexon BMRS** for **January 2026**:

| Stream | Description | Granularity | Key Fields |
| :--- | :--- | :--- | :--- |
| **`FUELHH`** | Actual Generation by Fuel Type | 30 minutes | `startTime`, `settlementDate`, `settlementPeriod` (1–48), `fuelType: "WIND"`, `generation` (MW) |
| **`WINDFOR`** | Wind Generation Forecasts | 1 hour | `startTime`, `publishTime`, `generation` (MW) |

### Key Market Rules Implemented:

1. **Configurable Day-Ahead Decision Cutoff**:
   - The user can select the auction deadline: **11:00 UTC** (EPEX SPOT auction deadline), **12:00 UTC** (Nord Pool auction deadline), **17:00 UTC**, or **23:59 UTC**.
   - Filtering rule: Only forecasts with `publishTime <= cutoff_datetime` on Day D-1 are eligible.
   - For every delivery interval, the system selects the **latest eligible forecast vintage**.
   - **Zero Silent Substitution**: If no pre-cutoff forecast exists, the interval is flagged as missing rather than silently substituting later forecasts.

2. **Resolution Harmonization (30-Minute vs 1-Hour)**:
   - **Hourly Mode (24 intervals)**: The two 30-minute settlement periods in each hour are mathematically averaged:
     $$\text{Actual}_{\text{Hour}} = \frac{\text{Actual}_{\text{SP 1}} + \text{Actual}_{\text{SP 2}}}{2}$$
   - **Settlement Period Mode (48 SPs)**: The 1-hour forecast is mapped across its constituent half-hour settlement periods with documented mapping notes.

3. **Boundary Ingestion**:
   - For delivery on January 1, 2026, the D-1 decision occurred on December 31, 2025.
   - Ingestion window spans December 30, 2025 through February 1, 2026, guaranteeing **100% data coverage** across all 31 days.

---

## 4. Mathematical Forecast Accuracy Formulas

All metrics are calculated strictly from valid matched forecast-actual pairs:

* **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^{N} |F_i - A_i|$$
* **Root Mean Square Error (RMSE)**:
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (F_i - A_i)^2}$$
* **Mean Directional Bias**:
  $$\text{Bias} = \frac{1}{N} \sum_{i=1}^{N} (F_i - A_i)$$
  * **Sign Convention**: $\text{Forecast} - \text{Actual}$
    * $\text{Bias} > 0$: **Over-forecasting** (forecast exceeded actual generation).
    * $\text{Bias} < 0$: **Under-forecasting** (actual generation exceeded forecast).
* **Weighted Absolute Percentage Error (WAPE)**:
  $$\text{WAPE} = \frac{\sum_{i=1}^{N} |F_i - A_i|}{\sum_{i=1}^{N} A_i} \times 100\% \quad (\text{guarded against zero actuals})$$
* **Data Sample & Coverage**:
  $$\text{Coverage} = \frac{\text{Matched Intervals}}{\text{Total Expected Intervals}} \times 100\%$$

### Verified January 2026 Results (at 11:00 UTC D-1 Cutoff):
* **Total Evaluated Intervals**: 744 hours (31 days)
* **Coverage**: **100.0%** (744 of 744 intervals matched)
* **MAE**: **2,122.81 MW**
* **RMSE**: **2,616.69 MW**
* **Mean Bias**: **+1,840.30 MW** (*Proves National Grid ESO systematically over-estimated wind generation*)
* **WAPE**: **18.33%**

---

## 5. Live Deployment

| Service | URL | Status |
| :--- | :--- | :--- |
| **Frontend Web App (Vercel)** | 🌐 [https://mxw7qr.vercel.app/](https://mxw7qr.vercel.app/) | Live & Production Ready |
| **Backend REST API (Render)** | ⚡ [https://mxw7qr-backend.onrender.com](https://mxw7qr-backend.onrender.com) | Live FastAPI Service |
| **API Documentation (Swagger UI)** | 📖 [https://mxw7qr-backend.onrender.com/docs](https://mxw7qr-backend.onrender.com/docs) | Interactive Testing |
| **API Health Endpoint** | 🩺 [https://mxw7qr-backend.onrender.com/api/health](https://mxw7qr-backend.onrender.com/api/health) | 1,489 actuals • 19,272 forecasts |

### Architecture & Resilience Notes
- **Vercel Frontend**: React 19 + TypeScript SPA connecting to the Render FastAPI backend.
- **Resilience Strategy**: The frontend includes a static fallback dataset (`january_2026_verified.json`) for seamless offline operation, eliminating cold-start downtime on free-tier hosting.
- **Docker Production**: Both services are containerized and orchestrated via `docker-compose.yml`.

---

## 6. Assumptions & Limitations

1. **National vs Company Portfolio**: National wind generation represents all metered wind turbines in Great Britain. An individual utility owns only a contracted percentage of this fleet. The **Illustrative Supply Gap Scenario** models this via an illustrative percentage share slider.
2. **Timezone**: All operations are evaluated in **UTC/GMT** (the UK standard in January).
3. **Imbalance Pricing**: Imbalance cashout prices (SBP/SSP) fluctuate dynamically; the platform provides physical MW volume gap sizing rather than speculative financial settlement.

---

## 7. Automated Test Suite

The test suite runs via `pytest`:
```bash
python -m pytest backend/tests/ -v
```
* `test_metrics.py` (6 tests): Perfect forecasts, hand-calculated verification, under-forecast bias sign, zero actual sum guard, and NaN/None filtering.
* `test_matching.py` (4 tests): D-1 cutoff date computation, strict pre-cutoff filtering, post-cutoff rejection, and genuine zero generation handling.
* `test_api.py` (7 tests): `/health`, `/forecast/day-ahead`, `/accuracy`, `/delivery`, `/delivery/csv`, and `/scenario/supply-gap`.
* **Result**: **17 passed in 2.8s**.

---

## 8. AI Tools Disclosure

In accordance with Section 2 of the assignment brief:
* **AI Coding Assistant**: Google Antigravity (powered by Gemini) was used to assist with domain research, API contract generation, automated test drafting, data ingestion scripting, and frontend React component refinement.
* All data logic, mathematical formulas, and Elexon endpoints were independently verified against official BSC documentation and live BMRS API streams.
