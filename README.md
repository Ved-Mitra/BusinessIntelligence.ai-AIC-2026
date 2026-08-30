# Intelliboard — KPI Intelligence-to-Action Engine

> **Accenture Innovation Challenge 2026 — Round 2 Prototype**

A working prototype of a KPI intelligence-to-action engine that detects material KPI movements, identifies and ranks their root causes through deterministic analysis, generates persona-specific natural language narratives, and recommends structured actions — all with full evidence traceability and honest uncertainty handling.

---

## Table of Contents

1. [Implementation Approach](#1-implementation-approach)
2. [Solution Architecture](#2-solution-architecture)
3. [Project Structure](#3-project-structure)
4. [KPI Semantic Contracts](#4-kpi-semantic-contracts)
5. [Personas & Role-Based Access](#5-personas--role-based-access)
6. [LLM vs Non-LLM Processing](#6-llm-vs-non-llm-processing)
7. [Dependencies](#7-dependencies)
8. [Execution Instructions](#8-execution-instructions)
9. [API Reference](#9-api-reference)
10. [Demo Scenarios](#10-demo-scenarios)

---

## 1. Implementation Approach

### Core Design Principle: No-Hallucination Architecture

The fundamental rule of this engine is: **the LLM never sees raw data, never performs arithmetic, and is never the source of quantitative truth.**

Every number, percentage, and trend shown in the UI comes from deterministic SQL queries. The LLM's sole responsibility is to translate a pre-computed analytical summary into fluent, persona-appropriate natural language.

### How a KPI insight is produced (end-to-end flow)

```
1. KPI Contract loaded (YAML) → defines SQL formula, drivers, thresholds, lineage, access rules
2. KPI Engine runs SQL against SQLite → computes current value, prior value, % change
3. Anomaly Detector (Z-score + business rules) → flags if movement is material
4. Contribution Analyser (additive SQL decomposition) → Volume effect, Price effect, Mix effect
5. Confidence Scorer (rule-based) → score 0–1, reason, triggers abstention if < 0.40
6. Abstention Handler → if low confidence, returns a plain-text explanation and stops
7. Gemini 2.0 Flash (LLM) → receives the analytical summary above, synthesises narrative
8. Action Recommender (LLM, structured JSON output) → returns actionable recommendations
9. Telemetry recorded → latency, token counts, cost stored in SQLite
10. Response returned → frontend renders drivers chart, narrative, actions, evidence panel
```

### Handling Real-World Complexities

| Complexity | How it is handled |
|---|---|
| Multiple interacting drivers | Additive decomposition (Volume + Price + Mix effects via SQL) |
| Heterogeneous data cadences | Three separate tables with different grains (daily/weekly/monthly) |
| Sparse history | `sparse_history: true` flag in KPI contract; confidence set to Very Low; decomposition skipped |
| Low-confidence / ambiguous data | Confidence scorer triggers abstention with a stated reason when score < 0.40 |
| Role-based data access | Entitlements enforced at SQL query layer AND at LLM prompt injection layer |
| Data quality flags | `data_quality_flag` column in financials_monthly; surfaced in evidence panel |
| LLM cost & latency | Token counts and estimated cost tracked per request in telemetry table |
| Feedback loop | Thumbs-up/down + correction text stored in feedback table, linked to narrative_id |

---

## 2. Solution Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Frontend (Vite / Vanilla JS)                  │
│  PersonaSwitcher · KPICards · DriverChart · NarrativePanel           │
│  EvidencePanel · FeedbackWidget · TelemetryPanel                     │
└───────────────────────────┬──────────────────────────────────────────┘
                            │  HTTP (proxied by Vite dev server)
┌───────────────────────────▼──────────────────────────────────────────┐
│                     Express API  (Node.js · port 3001)               │
│                                                                      │
│  GET /api/kpis           GET /api/analysis/:kpiId                    │
│  GET /api/narrative/:id  GET /api/telemetry                          │
│  POST /api/feedback      GET /api/personas · /api/sources            │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ├─── KPI Engine (kpiEngine.js)
       │     └── Loads YAML contract → runs parameterised SQL → returns value, pctChange, lineage
       │
       ├─── Anomaly Detector (anomalyDetector.js)  ← NON-LLM
       │     └── Z-score (simulated) + business-rule thresholds from KPI contract
       │
       ├─── Contribution Analyser (contributionAnalysis.js)  ← NON-LLM
       │     └── Additive SQL decomposition: ΔRevenue = Volume + Price + Mix effects
       │
       ├─── Confidence Scorer (confidenceScorer.js)  ← NON-LLM
       │     └── Rule-based: sparse history → 0.10, CAC attribution lag → 0.35, default → 0.95
       │
       ├─── Abstention Handler (abstentionHandler.js)  ← NON-LLM gate
       │     └── If score < 0.40 → returns explanation, skips LLM entirely
       │
       ├─── Narrative Generator (narrativeGenerator.js)  ← LLM
       │     └── Persona-specific system prompt + pre-computed analysis → Gemini 2.0 Flash
       │
       ├─── Action Recommender (actionRecommender.js)  ← LLM
       │     └── Structured JSON output: driver → lever → action → impact → owner
       │
       ├─── Entitlements (entitlements.js)  ← NON-LLM
       │     └── RBAC: allowed KPIs, region filter, max grain — enforced at SQL + prompt layer
       │
       └─── SQLite Database (data/db.sqlite)
             ├── sales_daily         (4,992 rows · daily grain · 4 regions · 4 products)
             ├── marketing_weekly    (159 rows  · weekly grain · 3 channels)
             ├── financials_monthly  (12 rows   · monthly grain · external events log)
             ├── feedback            (analyst corrections & ratings)
             ├── telemetry           (latency, tokens, cost per request)
             └── source_freshness    (last load timestamp per source)
```

### Data Sources

| Source | Table | Cadence | Key Fields |
|---|---|---|---|
| Sales Transactions | `sales_daily` | Daily | units_sold, unit_price, revenue, cogs, gross_profit, sessions, new_customers |
| Marketing Spend | `marketing_weekly` | Weekly | spend_usd, impressions, clicks, ctr_pct, channel |
| Financials & Events | `financials_monthly` | Monthly | opex, ebitda, headcount, external_events, data_quality_flag |

The seed data covers **January–December 2025**. **October 2025 (Month 10)** contains a deliberate multi-driver revenue drop engineered to demonstrate the analytical engine:
- West region units sold **−22%** (supply disruption)
- Average unit price **−7%** (discount campaign overshoot)
- Online channel share **+18%** in West (channel mix shift)
- Online marketing spend **+45%**, Offline **−30%**

---

## 3. Project Structure

```
Accenture-Innovation-Challenge/
│
├── scripts/
│   └── generate_seed_data.py        # Generates all three CSVs (run once)
│
├── data/
│   ├── seed/                        # Source CSV files (committed)
│   │   ├── sales_daily.csv
│   │   ├── marketing_weekly.csv
│   │   └── financials_monthly.csv
│   └── db.sqlite                    # Auto-generated by seed script (gitignored)
│
├── kpi-contracts/                   # KPI Semantic Contracts (YAML)
│   ├── revenue.yaml
│   ├── gross_margin.yaml
│   ├── customer_acquisition_cost.yaml
│   ├── conversion_rate.yaml
│   └── new_product_gmv.yaml         # sparse_history: true — newly launched product
│
├── backend/
│   ├── server.js                    # Express entry point (port 3001)
│   ├── .env.example                 # Environment variable template
│   ├── db/
│   │   ├── schema.sql               # SQLite schema (6 tables)
│   │   └── seed.js                  # CSV → SQLite loader
│   ├── kpi/
│   │   ├── contractLoader.js        # YAML parser + in-memory cache
│   │   └── kpiEngine.js             # SQL-based KPI calculation
│   ├── analysis/                    # ← All NON-LLM
│   │   ├── anomalyDetector.js       # Z-score + business-rule detection
│   │   ├── contributionAnalysis.js  # Additive SQL decomposition
│   │   ├── driverRanker.js          # Sort by |contribution_pct|
│   │   └── confidenceScorer.js      # Rule-based confidence 0–1
│   ├── llm/                         # ← LLM layer
│   │   ├── geminiClient.js          # @google/genai wrapper + telemetry
│   │   ├── narrativeGenerator.js    # Persona-specific system prompts
│   │   ├── actionRecommender.js     # Structured JSON action output
│   │   └── abstentionHandler.js     # Confidence gate before LLM call
│   ├── security/
│   │   └── entitlements.js          # RBAC — allowed KPIs, region, grain
│   └── routes/
│       ├── kpiRoutes.js             # /api/kpis, /api/personas, /api/sources
│       ├── analysisRoutes.js        # /api/analysis/:kpiId
│       ├── narrativeRoutes.js       # /api/narrative/:kpiId
│       ├── feedbackRoutes.js        # /api/feedback
│       └── telemetryRoutes.js       # /api/telemetry, /api/telemetry/stats
│
└── frontend/
    ├── index.html
    ├── vite.config.js               # Dev proxy → localhost:3001
    └── src/
        ├── style.css                # Dark-mode glassmorphism design system
        └── main.js                  # Single-file vanilla JS dashboard
```

---

## 4. KPI Semantic Contracts

Each KPI is defined in a YAML contract that serves as the single source of truth for its calculation, lineage, access rules, and anomaly thresholds.

```yaml
# Example: kpi-contracts/revenue.yaml
id: revenue
name: Revenue
formula:
  sql: "SELECT SUM(revenue) AS value FROM sales_daily WHERE year = :year AND month = :month"
  human: "SUM(units_sold × unit_price)"
primary_source: sales_daily
cadence: daily
drivers: [price, volume, product_mix, channel_mix, region_mix, seasonality]
alert_threshold:
  pct_change: 5           # ±5% triggers anomaly check
  business_impact_usd: 50000
lineage:
  upstream: [sales_daily.revenue]
  transformations: "SUM aggregation; no adjustments"
  data_quality_check: "NULL revenue rows excluded; negative revenue flagged"
personas_allowed: [ceo, analyst, regional_manager_north, regional_manager_south]
sparse_history: false
min_periods_for_anomaly: 30
```

The five monitored KPIs:

| KPI | Formula | Source | Cadence | Alert |
|---|---|---|---|---|
| **Revenue** | SUM(units × price) | sales_daily | Daily | ±5% |
| **Gross Margin %** | gross_profit / revenue × 100 | sales_daily | Monthly | ±2 pp |
| **CAC** | Total Spend / New Customers | marketing_weekly + sales_daily | Monthly | ±15% |
| **Conversion Rate** | CAST(units AS REAL) / sessions × 100 | sales_daily | Daily | ±1 pp |
| **New Product GMV** | SUM(revenue) WHERE is_new_product=1 | sales_daily | Daily | ±20% (sparse) |

---

## 5. Personas & Role-Based Access

Access is enforced at **two independent layers**: the SQL query (region filter injected into prepared statements) and the LLM system prompt (persona context injected to prevent out-of-scope references).

| Persona | KPI Access | Region | Data Grain |
|---|---|---|---|
| `ceo` | All 5 KPIs | All regions | Monthly aggregates only |
| `analyst` | All 5 KPIs | All regions | Full daily granularity |
| `regional_manager_north` | Revenue + Conversion Rate | North only | Daily |
| `regional_manager_south` | Revenue + Conversion Rate | South only | Daily |

Pass the persona via the `X-Persona` HTTP header on all API requests.

---

## 6. LLM vs Non-LLM Processing

| Task | Method | Rationale |
|---|---|---|
| KPI calculation | **SQL — deterministic** | Exact, auditable, reproducible |
| Anomaly detection | **Z-score + business rules** | Transparent thresholds from KPI contract |
| Driver decomposition | **Additive SQL math** | Mathematically exact; no model drift |
| Confidence scoring | **Rule-based function** | Auditable, threshold-driven |
| Entitlement enforcement | **Code-level RBAC** | Security must never route through LLM |
| Data freshness check | **SQL timestamp comparison** | Deterministic |
| Abstention decision | **Confidence score gate** | Hard threshold — LLM not involved |
| Narrative synthesis | **LLM (Gemini 2.0 Flash)** | Natural language is LLM's core strength |
| Action phrasing | **LLM** | Contextual, persona-aware language |
| Abstention message | **LLM** *(gated by scorer)* | Empathetic communication when abstaining |

---

## 7. Dependencies

### Runtime Requirements

| Tool | Minimum Version |
|---|---|
| Node.js | 18.0.0 |
| Python | 3.8 (seed data generation only) |
| npm | 8.0.0 |

### Backend (`backend/package.json`)

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.21.0 | REST API framework |
| `better-sqlite3` | ^11.0.0 | Synchronous SQLite driver for Node.js |
| `@google/genai` | ^1.0.0 | Gemini API SDK (narrative + actions) |
| `js-yaml` | ^4.1.0 | Parse YAML KPI contract files |
| `csv-parse` | ^5.5.6 | Read CSV seed files during DB seeding |
| `cors` | ^2.8.5 | Cross-origin headers for frontend dev |
| `dotenv` | ^16.4.5 | Load `GEMINI_API_KEY` from `.env` |
| `uuid` | ^10.0.0 | Generate unique narrative_id per request |
| `nodemon` *(dev)* | ^3.1.4 | Auto-restart on file change |

### Frontend (`frontend/package.json`)

| Package | Version | Purpose |
|---|---|---|
| `vite` *(dev)* | ^5.4.1 | Dev server with HMR + build tool; proxies `/api` to backend |

> **No frontend runtime dependencies.** The dashboard is pure Vanilla JS with no frameworks or UI libraries.

### Python (seed script only)

Standard library only — `csv`, `random`, `os`, `datetime`. No `pip install` needed.

---

## 8. Execution Instructions

### Prerequisites

- Node.js ≥ 18 installed (`node --version`)
- Python 3 installed (`python3 --version`)
- A Gemini API key (optional — the engine falls back to persona-specific mock responses if the key is absent)

### Step 1 — Generate Seed Data

```bash
# From the project root
python3 scripts/generate_seed_data.py
```

This creates three CSV files in `data/seed/` covering 12 months of synthetic business data with a deliberate multi-driver revenue drop in Month 10.

### Step 2 — Set Up the Backend

```bash
cd backend

# Install Node dependencies
npm install

# Copy environment template and optionally add your Gemini API key
cp .env.example .env
# Edit .env:  GEMINI_API_KEY=your_key_here
# (Leave empty to use persona-specific mock responses — fully functional for demo)

# Seed the SQLite database from the generated CSVs
npm run seed

# Start the API server (development mode with auto-reload)
npm run dev
```

The API is now available at **`http://localhost:3001`**.
Verify with: `curl http://localhost:3001/health`

### Step 3 — Set Up the Frontend

Open a **second terminal**:

```bash
cd frontend

# Install dev dependencies (Vite only)
npm install

# Start the development server
npm run dev
```

The dashboard is now available at **`http://localhost:5173`**.

> Vite automatically proxies all `/api/*` requests to `http://localhost:3001`, so no CORS configuration is needed.

### Step 4 — Open the Dashboard

Navigate to `http://localhost:5173` in your browser.

Use the **persona dropdown** in the top-right header to switch between roles and explore how the dashboard changes.

### Production Build (optional)

```bash
# Build an optimised static bundle
cd frontend && npm run build
# Output is in frontend/dist/ — serve with any static file host
```

---

## 9. API Reference

All endpoints accept an optional `X-Persona` header (defaults to `analyst`).
Query parameters `year` and `month` default to `2025` and `10` (the demo drop month).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/api/personas` | List all personas and their permissions |
| `GET` | `/api/kpis` | All KPIs accessible to the current persona |
| `GET` | `/api/kpis/:kpiId` | Single KPI value with lineage metadata |
| `GET` | `/api/sources` | Source freshness (last loaded, row count) |
| `GET` | `/api/analysis/:kpiId` | Full analytical result: anomaly, ranked drivers, confidence |
| `GET` | `/api/narrative/:kpiId` | LLM-generated narrative + actions + evidence + telemetry |
| `POST` | `/api/feedback` | Submit thumbs-up/down + correction text |
| `GET` | `/api/feedback` | Retrieve feedback log (analyst role required) |
| `GET` | `/api/telemetry` | Recent telemetry records |
| `GET` | `/api/telemetry/stats` | Aggregate cost, token, and latency stats |

**Example request:**

```bash
curl -H "X-Persona: ceo" \
     "http://localhost:3001/api/narrative/revenue?year=2025&month=10"
```

---

## 10. Demo Scenarios

The following five scenarios cover all minimum prototype requirements from the problem statement. Use Month 10 (default) for all of them.

### Scenario 1 — Multi-Factor KPI Drop
**Action:** Select the **Revenue** KPI with the **Analyst** persona.

The engine detects a **−33.6%** revenue drop and decomposes it into three simultaneous drivers via SQL-based additive decomposition:
- **Volume Effect (~84%):** West region units fell 43% due to simulated supply disruption
- **Price Effect (~16%):** Average unit price dropped $21 from the discount campaign overshoot
- **Mix Effect:** Residual channel-mix shift to lower-AOV Online channel

Three personas (CEO, Analyst, Regional Manager) receive tonally different narratives from the same underlying numbers.

### Scenario 2 — Low-Confidence Abstention
**Action:** Select the **CAC** KPI with the **Analyst** persona.

CAC spiked +88% in Month 10. However, the confidence scorer returns **0.35 (Low)** because the attribution window for a mid-month campaign launch is incomplete. The engine **abstains**, returning:
> *"Insufficient data to attribute this movement with confidence. Insufficient post-campaign data; attribution window incomplete. Recommend revisiting later."*

No LLM narrative or actions are generated — the abstention message is returned instead.

### Scenario 3 — Sparse History
**Action:** Select the **New Product GMV** KPI.

The AI Insights Module launched on 2025-08-01, giving only ~9 weeks of history by Month 10. The KPI contract flags `sparse_history: true`. The confidence scorer returns **0.10 (Very Low)** and the engine abstains with:
> *"Sparse history / newly launched. Statistical baselines not yet established…"*

The KPI card also shows a **SPARSE** badge.

### Scenario 4 — Role-Based Security
**Action:** Switch the persona dropdown to **Regional Manager — North**.

Observe:
- Only **Revenue** and **Conversion Rate** cards are shown (Gross Margin, CAC, New Product GMV are hidden)
- Revenue shows **$380K** (North region only) vs $1.42M for analyst
- Any direct API call to `/api/kpis/gross_margin` with this persona returns **HTTP 403**

### Scenario 5 — Feedback Loop
**Action:** Select any KPI, read the narrative, then click **👎 Needs Correction**.

The feedback is stored in the `feedback` SQLite table linked to the `narrative_id`. Retrieve all feedback via:
```bash
curl -H "X-Persona: analyst" http://localhost:3001/api/feedback
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API server port (default: `3001`) |
| `GEMINI_API_KEY` | No | Google Gemini API key. If absent, persona-specific mock responses are used. |
