# BusinessIntelligence.ai — KPI Intelligence-to-Action Engine
### Accenture Innovation Challenge | Round 2 Project Plan
> **Duration:** 7 Days (Starting 2026-08-22)
> **Goal:** Build a working prototype of a KPI intelligence-to-action engine that detects KPI movements, diagnoses root causes, generates persona-specific narratives, and recommends actions — with full traceability and honest uncertainty handling.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Data Ingestion Layer                        │
│  [CSV / SQLite / Mock APIs]  →  Unified Data Store (SQLite)     │
│  Source A: Daily Sales Transactions (grain: daily, product)     │
│  Source B: Weekly Marketing Spend (grain: weekly, channel)      │
│  Source C: Monthly Financials / External Events (grain: monthly)│
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  KPI Semantic Contract Layer                     │
│  - KPI definitions, formulas, drivers, thresholds, lineage      │
│  - Role-based entitlements (access control per persona)         │
│  - Stored as structured YAML + loaded at runtime                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│               Analytical Intelligence Engine                    │
│  [Anomaly & Materiality Detection] [Contribution Analysis]      │
│  [Causal / Statistical Driver Ranking]  ← ALL NON-LLM           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              LLM Orchestration & Narrative Layer                │
│  - Narrative synthesis per persona (Gemini 2.0 Flash)           │
│  - Action recommendation generation                             │
│  - Uncertainty & abstention logic                               │
│  - Evidence citation + confidence scoring                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Frontend Dashboard (Web)                      │
│  - KPI cards with movement indicators                           │
│  - Plain-language explanation panel                             │
│  - Driver breakdown chart                                       │
│  - Persona switcher (CEO, Analyst, Regional Manager)            │
│  - Feedback/correction UI + Telemetry panel                     │
│  [Stack: Vite + HTML + Vanilla CSS + Vanilla JS]               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| **Data Store** | SQLite (via `better-sqlite3`) | Zero-setup, realistic SQL queries, easy to seed |
| **Backend API** | Node.js + Express | Lightweight, easy to wire SQL + LLM calls |
| **Analytical Engine** | JavaScript + Python subprocess | NumPy/SciPy for Z-score, decomposition |
| **LLM** | Google Gemini 2.0 Flash (`@google/genai`) | Cost-efficient, fast, multimodal capable |
| **Frontend** | Vite + HTML/CSS/JS | No framework overhead, full design control |
| **KPI Contracts** | YAML files | Human-readable, git-diff friendly |
| **Telemetry** | In-memory store + API endpoint | Simple, no extra infra |

> **Explicitly NON-LLM:** Anomaly detection, contribution analysis, statistical driver ranking, SQL queries, security/entitlement checks, data freshness checks, confidence threshold logic.
> **LLM-only:** Natural language narrative, intent parsing, action recommendation phrasing, abstention messages.

---

## Minimum Prototype Checklist (from Problem Statement)

- [ ] **3–5 connected KPIs** across **2–3 data sources** with different grains/cadences
- [ ] **Lightweight KPI semantic contract** (definitions, calculations, drivers, thresholds, lineage, access)
- [ ] **2+ personas** receiving different narratives/actions (CEO, Analyst, Regional Manager)
- [ ] **1 multi-factor KPI movement** with known/simulated drivers
- [ ] **1 low-confidence / abstention scenario**
- [ ] **1 sparse-history / new KPI scenario**
- [ ] **1 role-based security / entitlement scenario**
- [ ] **Evidence panel**: source freshness, method used, contribution, confidence, lineage
- [ ] **LLM vs non-LLM breakdown** clearly shown in UI
- [ ] **Runtime telemetry**: latency, model calls, token usage, estimated cost

---

## Proposed File & Folder Structure

```
Accentur-Innovation-Challenge/
├── plan.md                         ← This file
├── ps.md                           ← Problem statement
├── README.md                       ← Project overview & run instructions
│
├── data/                           ← Seed data & SQLite database
│   ├── seed/
│   │   ├── sales_daily.csv         ← Source A: Daily sales by product/region
│   │   ├── marketing_weekly.csv    ← Source B: Weekly marketing spend by channel
│   │   └── financials_monthly.csv  ← Source C: Monthly P&L + external events log
│   └── db.sqlite                   ← Auto-generated on first run
│
├── kpi-contracts/                  ← KPI Semantic Contracts (YAML)
│   ├── revenue.yaml
│   ├── gross_margin.yaml
│   ├── customer_acquisition_cost.yaml
│   ├── conversion_rate.yaml
│   └── new_product_gmv.yaml        ← Sparse-history KPI
│
├── backend/                        ← Node.js + Express API server
│   ├── package.json
│   ├── server.js                   ← Entry point
│   ├── db/
│   │   ├── schema.sql
│   │   └── seed.js                 ← Seeds SQLite from CSVs
│   ├── kpi/
│   │   ├── contractLoader.js       ← Loads YAML KPI contracts
│   │   ├── kpiEngine.js            ← SQL-based KPI calculation
│   │   └── anomalyDetector.js      ← Z-score / IQR anomaly logic (non-LLM)
│   ├── analysis/
│   │   ├── contributionAnalysis.js ← Decompose KPI movement by driver
│   │   ├── driverRanker.js         ← Rank drivers by contribution/significance
│   │   └── confidenceScorer.js     ← Compute evidence confidence (non-LLM)
│   ├── llm/
│   │   ├── geminiClient.js         ← Gemini API wrapper + token tracking
│   │   ├── narrativeGenerator.js   ← Persona-specific narrative
│   │   ├── actionRecommender.js    ← Structured action recommendations
│   │   └── abstentionHandler.js    ← Low-confidence / ambiguous cases
│   ├── security/
│   │   └── entitlements.js         ← Role-based data access control
│   ├── feedback/
│   │   └── feedbackStore.js        ← Analyst corrections / ratings
│   ├── telemetry/
│   │   └── telemetryStore.js       ← Track latency, tokens, cost
│   └── routes/
│       ├── kpiRoutes.js
│       ├── analysisRoutes.js
│       ├── narrativeRoutes.js
│       ├── feedbackRoutes.js
│       └── telemetryRoutes.js
│
├── frontend/                       ← Vite web app
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.js
│       ├── style.css
│       ├── components/
│       │   ├── KPICard.js
│       │   ├── ExplanationPanel.js
│       │   ├── DriverChart.js
│       │   ├── PersonaSwitcher.js
│       │   ├── FeedbackWidget.js
│       │   ├── EvidencePanel.js
│       │   └── TelemetryPanel.js
│       └── api/
│           └── client.js           ← Fetch wrapper for backend API
│
└── scripts/
    ├── generate_seed_data.py       ← Python: generate realistic CSV seed data
    └── statistical_analysis.py    ← Python: Z-score, correlation, decomposition
```

---

## Day-by-Day Sprint Plan

### Day 1 — Foundation & Data (2026-08-22)
**Goal:** Running backend, seeded DB, KPI contracts, API skeleton.

**Tasks:**
- [ ] Initialize Node.js backend — install `express`, `better-sqlite3`, `js-yaml`, `@google/genai`, `cors`, `dotenv`
- [ ] Write `scripts/generate_seed_data.py` — generate 12 months of realistic daily sales, weekly marketing, monthly financials (with one deliberate multi-driver drop in Month 10)
- [ ] Create `data/db.sqlite` schema and seed script (`db/schema.sql` + `db/seed.js`)
- [ ] Define 5 KPI YAML contracts (revenue, gross_margin, cac, conversion_rate, new_product_gmv)
- [ ] Write `contractLoader.js` and `kpiEngine.js` (pure SQL-based KPI calculation)
- [ ] Stand up Express server with `/health` and `/api/kpis` endpoints
- [ ] **Test:** hit `/api/kpis` and verify correct KPI values from seeded DB

**Deliverable:** Backend returns real KPI values from seeded SQLite data.

---

### Day 2 — Analytical Intelligence Engine (2026-08-23)
**Goal:** Non-LLM anomaly detection, contribution analysis, driver ranking, confidence scoring.

**Tasks:**
- [ ] Implement `anomalyDetector.js` — Z-score + business-rule-based materiality (statistical significance AND business impact threshold combined)
- [ ] Implement `contributionAnalysis.js` — decompose revenue drop into: price effect, volume effect, mix effect, channel effect using additive decomposition via SQL
- [ ] Implement `driverRanker.js` — rank drivers by absolute contribution percentage
- [ ] Implement `confidenceScorer.js` — score confidence based on: data completeness, history length, number of corroborating sources, contradictions detected
- [ ] Handle sparse-history KPI (`new_product_gmv`) — flag as low-history, reduce confidence score, skip decomposition
- [ ] Add `/api/analysis/:kpiId` route returning: anomaly flag, ranked drivers, confidence score, evidence summary
- [ ] Write unit tests for anomaly detector with synthetic known-answer data

**Deliverable:** API returns fully structured analytical results — 100% deterministic, zero LLM.

---

### Day 3 — LLM Narrative & Action Layer (2026-08-24)
**Goal:** Persona-specific narratives, structured action recommendations, abstention logic.

**Tasks:**
- [ ] Set up `geminiClient.js` with Gemini 2.0 Flash — include token counting, cost tracking (`$0.075/1M input tokens`, `$0.30/1M output tokens`)
- [ ] Write system prompts for each persona:
  - **CEO:** High-level, strategic, minimal jargon, focus on bottom-line impact + single top action
  - **Analyst:** Full driver breakdown, statistical details, data quality notes, all caveats, lineage
  - **Regional Manager:** Regional slice only (enforced by entitlements), peer region benchmarks, local levers only
- [ ] Implement `narrativeGenerator.js` — receives pre-computed analytical results → generates persona-tuned narrative (LLM never touches raw data)
- [ ] Implement `actionRecommender.js` — structured output format: `driver → controllable lever → action → expected impact → owner → confidence → monitoring plan`
- [ ] Implement `abstentionHandler.js` — if confidence < 0.40 OR contradictory evidence detected → LLM generates clarification request or explicit abstention with stated reason
- [ ] Add `/api/narrative/:kpiId?persona=ceo` route
- [ ] Test all 3 personas on the multi-driver drop scenario

**Deliverable:** 3 visually and tonally distinct persona narratives for the same KPI event.

---

### Day 4 — Security, Feedback & Telemetry (2026-08-25)
**Goal:** Role-based access control, feedback loop, runtime telemetry.

**Tasks:**
- [ ] Implement `entitlements.js` — define roles and their allowed KPIs / data slices:
  - `ceo`: all KPIs, all regions, aggregated only (no raw row-level data)
  - `analyst`: all KPIs, all regions, full granularity, raw data access
  - `regional_manager_north`: revenue + conversion_rate only, North region data only
- [ ] Enforce entitlements at SQL query layer AND at narrative prompt layer (dual enforcement)
- [ ] Demonstrate entitlement scenario: `regional_manager_north` cannot see South region data or gross_margin / CAC cards
- [ ] Implement `feedbackStore.js` — store analyst ratings (👍/👎), free-text corrections, linked to narrative_id
- [ ] Implement simple feedback weighting: narratives with 2+ thumbs-down → flagged for prompt review log
- [ ] Implement `telemetryStore.js` — track per-request: total latency, LLM latency, non-LLM latency, model name, input/output tokens, estimated cost USD, cache hit boolean
- [ ] Add `/api/feedback` (POST) and `/api/telemetry` (GET) routes

**Deliverable:** Security demo works cleanly; feedback stored in DB; telemetry data piped to frontend.

---

### Day 5 — Frontend Dashboard (2026-08-26)
**Goal:** Stunning, fully interactive web dashboard. First impression must WOW judges.

**Design Language:** Dark-mode glassmorphism. Deep navy `#0A0F1E` background. Electric blue `#4F8EF7` accents. Violet-to-blue gradients on key surfaces. `Inter` font from Google Fonts. Micro-animations on KPI card load and persona switch. Smooth typing animation for narrative reveal.

**Tasks:**
- [ ] Initialize Vite frontend project in `/frontend`
- [ ] Design and implement `style.css` — full design system: CSS custom properties (tokens), glassmorphism card styles, gradient utilities, animation keyframes
- [ ] `KPICard.js` — KPI name, current value, % change with colored directional arrow, mini sparkline (SVG), anomaly badge
- [ ] `PersonaSwitcher.js` — pill/tab switcher for CEO / Analyst / Regional Manager; switching triggers narrative reload + card visibility update based on entitlements
- [ ] `ExplanationPanel.js` — renders AI-generated narrative with typewriter animation; shows persona badge
- [ ] `DriverChart.js` — horizontal bar chart of driver contributions rendered in pure SVG/Canvas (no external chart library)
- [ ] `EvidencePanel.js` — collapsible panel showing: data source names + last refresh timestamp, analytical method label (SQL / Z-score / LLM), confidence meter (animated bar), lineage trail
- [ ] `FeedbackWidget.js` — 👍/👎 buttons + optional free-text correction textarea, POST to `/api/feedback`
- [ ] `TelemetryPanel.js` — live panel: token count, latency breakdown, cost estimate, model name, cache hit indicator
- [ ] Wire all components via `api/client.js` fetch wrapper
- [ ] Set up Vite proxy to backend in `vite.config.js`

**Deliverable:** Full interactive dashboard running locally at `localhost:5173`.

---

### Day 6 — Demo Scenarios, Polish & Prep (2026-08-27)
**Goal:** All 5 required demo scenarios verified end-to-end. Demo rehearsed.

**Scenario Walkthroughs:**

- [ ] **Scenario 1 — Multi-factor KPI Drop** — Revenue drops 8.3% in Month 10. Engine detects and attributes: 40% volume decline (West region), 35% price erosion (discount campaign overshoot), 25% channel mix shift (offline to online). Three personas receive distinct narratives.

- [ ] **Scenario 2 — Low-confidence / Abstention** — CAC spikes 42% after a new campaign but only 2 weeks of data is available post-launch. Engine abstains: *"Insufficient post-campaign data to attribute this movement with confidence. Attribution window may not have fully elapsed. Recommend revisiting in 3 weeks."*

- [ ] **Scenario 3 — Sparse-history KPI** — `new_product_gmv` has only 6 weeks of history. Engine flags: *"Statistical baselines not yet established. Showing raw trend only. Forecast confidence: Very Low. Minimum 8 weeks of data required for anomaly detection."*

- [ ] **Scenario 4 — Role-based Security** — Switch persona to `regional_manager_north`. Gross Margin and CAC cards disappear. Narrative references only North region. South region data is invisible. Entitlement enforcement shown explicitly.

- [ ] **Scenario 5 — Feedback Loop** — Analyst clicks 👎 on a narrative, types correction: *"This misses the effect of the supplier delay in Week 3."* Correction is stored. On next load, EvidencePanel shows: *"Analyst correction logged on [date]. Confidence flag: under review."*

**Polish Tasks:**
- [ ] Loading skeleton animations for all cards
- [ ] Error state components (API down, LLM timeout)
- [ ] Empty state for new KPI with sparse history
- [ ] Responsive layout (tablet + desktop)
- [ ] Write `README.md` — setup instructions, architecture overview, feature list, personas, known limitations
- [ ] Record 3-minute walkthrough video (Loom or OBS)

**Deliverable:** All 5 scenarios demo-ready. README complete.

---

### Day 7 — Final Review & Submission (2026-08-28)
**Goal:** Clean, tagged, submission-ready repository.

**Tasks:**
- [ ] Full end-to-end smoke test of all 5 scenarios
- [ ] Verify EvidencePanel explicitly labels every insight as `LLM` or `Non-LLM (method name)`
- [ ] Confirm telemetry panel shows live latency, token counts, and cost estimate
- [ ] Confirm all checklist items from the problem statement are met
- [ ] Remove all `console.log` debug output; clean up unused code
- [ ] Final README review — runnable by a new developer in under 5 minutes
- [ ] Prepare demo slide deck (5–7 slides): Problem → Architecture → Key Design Decisions → Live Demo Stills → LLM vs Non-LLM Breakdown → Future Work
- [ ] Git tag `v1.0.0-submission`
- [ ] Submit

---

## Personas Reference

| Persona | Role | KPI Access | Data Grain | Narrative Style |
|---|---|---|---|---|
| `ceo` | Chief Executive Officer | All KPIs, all regions | Aggregated only | 3–4 sentences, strategic impact, 1 top action |
| `analyst` | BI Analyst | All KPIs, all regions, raw data | Full granularity | Full breakdown, statistics, caveats, lineage |
| `regional_manager_north` | North Region Manager | Revenue + Conversion Rate — North only | Regional daily | North-focused, local levers, peer benchmarks |

---

## KPI Semantic Contracts Summary

| KPI | Formula | Primary Source | Cadence | Drivers | Alert Threshold |
|---|---|---|---|---|---|
| **Revenue** | `SUM(units_sold × price)` | Sales (daily) | Daily | Price, Volume, Mix, Channel | ±5% vs prior period |
| **Gross Margin %** | `(Revenue - COGS) / Revenue × 100` | Sales + Financials | Monthly | COGS, Price, Product mix | ±2 pp |
| **CAC** | `Marketing Spend / New Customers` | Marketing (weekly) + Sales | Weekly | Spend, Conversion, Attribution | ±15% |
| **Conversion Rate** | `Orders / Sessions × 100` | Sales (daily) | Daily | Funnel, Campaign, Seasonality | ±1 pp |
| **New Product GMV** | `SUM(units × price) WHERE new_product=1` | Sales (daily) | Daily | Launch, Distribution, Promo | N/A (sparse) |

---

## LLM vs Non-LLM Decision Matrix

| Task | Method | Rationale |
|---|---|---|
| KPI calculation | SQL (deterministic) | Accuracy and auditability — numbers must be exact |
| Anomaly detection | Z-score + business rules | Reproducible, explainable, no hallucination risk |
| Contribution decomposition | Additive math (SQL + JS) | Mathematically exact decomposition |
| Driver ranking | Statistical correlation + contribution % | Non-LLM for trust and reproducibility |
| Confidence scoring | Rule-based scoring function | Transparent thresholds, auditable |
| Entitlement enforcement | Code-level RBAC | Security must never pass through LLM |
| Data freshness check | Timestamp comparison (SQL) | Deterministic |
| Narrative synthesis | **LLM (Gemini Flash)** | Natural language is LLM's core strength |
| Intent understanding | **LLM** | Ambiguous NL queries need semantic understanding |
| Action phrasing | **LLM** | Contextual, persona-aware language |
| Abstention message | **LLM** (gated by confidence scorer) | Human-empathetic communication |

---

## Security & Entitlement Design

```
Request arrives with header:  X-Persona: regional_manager_north
  ↓
entitlements.js checks:
  - Allowed KPIs?         → [revenue, conversion_rate]
  - Region filter?        → WHERE region = 'North'
  - Max data grain?       → daily aggregated (no raw rows)
  - Forbidden sections?   → gross_margin, cac, south_data
  ↓
SQL queries are parameterized with entitlement filters (safe, no injection)
LLM system prompt injected with persona context:
  "You are briefing the North Region Manager.
   Only reference North region data and metrics.
   Do not mention gross margin or CAC.
   Do not reference other regions by name."
```

---

## Telemetry Schema

```json
{
  "request_id": "uuid-v4",
  "timestamp": "2026-08-22T13:00:00Z",
  "kpi_id": "revenue",
  "persona": "analyst",
  "total_latency_ms": 1240,
  "non_llm_latency_ms": 85,
  "llm_latency_ms": 1155,
  "model": "gemini-2.0-flash",
  "input_tokens": 1842,
  "output_tokens": 412,
  "estimated_cost_usd": 0.000262,
  "llm_calls": 1,
  "cache_hit": false
}
```

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Gemini API rate limits during live demo | Cache narrative responses; implement retry with exponential backoff |
| SQLite write concurrency | Single-writer pattern; feedback writes are queued |
| LLM hallucinating quantitative data | All numbers come from SQL; LLM only receives pre-computed analytical summaries, never raw data |
| Sparse-history KPI edge cases | Hard minimum: ≥ 8 periods required before running decomposition; else flag and skip |
| Demo internet outage | Pre-cache at least 2 scenario responses; fallback to static JSON |
| Scope creep | Strictly time-box each day; judge quality of scenarios over feature breadth |

---

## Definition of Done

- [ ] All items in the **Minimum Prototype Checklist** are checked off
- [ ] All 5 demo scenarios run end-to-end without errors
- [ ] Evidence Panel clearly labels every insight as LLM or non-LLM with method name
- [ ] Three personas produce visually and tonally distinct narratives and action sets
- [ ] Telemetry panel shows live token count, latency breakdown, and cost estimate
- [ ] README allows another developer to run `npm install && npm run dev` and reproduce the full demo
