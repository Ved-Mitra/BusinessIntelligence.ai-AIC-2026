# BusinessIntelligence.ai — Hackathon Presentation Deck Guide
### Accenture Innovation Challenge 2026 | 3-Slide Submission

---

## 📽️ Slide 1: The Problem Statement (Word Count: ~195 words)

### Slide Title
**The Enterprise "Translation Gap": From Passive Dashboards to Decision Latency**

### Slide Content / Visual Bullets
* **The Dashboard Dilemma:** Modern BI tools (Tableau, PowerBI) tell business leaders *what* changed (e.g., *"Revenue is down 8.3% in West Region"*), but completely fail to explain *why* it happened or *what actions* should be taken next.
* **Costly Analytical Latency:** Answering basic root-cause questions requires analysts to spend **3 to 5 business days** writing ad-hoc SQL queries, slicing spreadsheets, and reconciling conflicting departmental reports. By the time causes are identified, corrective windows have expired.
* **The Peril of Pure-GenAI BI:** Attempting to solve this with raw LLMs / Text-to-SQL introduces severe enterprise risks: arithmetic hallucinations, false causal claims, uncalibrated confidence on sparse data, and data leakage across authorization boundaries.
* **Enterprise Fragmentation:** Disparate data cadences (daily transactions, weekly ad spend, monthly P&L) and inconsistent metric definitions paralyze cross-functional decision-making.

### Speaker Notes / Script (~1 Minute)
> *"Every executive has experienced opening a dashboard on Monday morning to find revenue down 8%, without a single clue as to why. Today, answering that question requires filing tickets with the BI team and waiting 72 hours while analysts manually slice data. In fast-moving markets, this 'translation gap' costs millions in delayed interventions. Furthermore, simply pointing an LLM at an enterprise database is dangerous—LLMs hallucinate arithmetic and overconfidently misdiagnose anomalies. Enterprises don't just need more charts; they need a trusted, auditable bridge from metric variance to decisive action."*

---

## 💡 Slide 2: Proposed Solution (Word Count: ~200 words)

### Slide Title
**BusinessIntelligence.ai: The Governed KPI Intelligence-to-Action Engine**

### Slide Content / Visual Bullets
* **Strict "No-Hallucination" Architecture:** Decouples quantitative truth from language generation. Deterministic SQL engines compute metrics, Z-scores ($|Z| > 2.5$), and exact additive driver decompositions ($\Delta\text{Revenue} = \text{Volume} + \text{Price} + \text{Mix}$); LLMs (Gemini) are restricted solely to narrative synthesis.
* **Declarative Semantic Contracts (YAML):** Governs formulas, data lineage, anomaly alert thresholds, and dual-layer RBAC (SQL parameterization + LLM prompt isolation) as version-controlled code.
* **Persona-Calibrated Intelligence:** Concurrently synthesizes high-level strategic directives for the **CEO**, full mathematical waterfall proofs for the **BI Analyst**, and localized operational levers for **Regional Managers**.
* **Honest Uncertainty & Abstention:** Evaluates statistical maturity and attribution windows; programmatically abstains with clear diagnostics when evidence is sparse ($<8$ weeks) or ambiguous.
* **Prescriptive Action Blueprints:** Automatically generates structured, role-assigned remediation plans: $\text{Driver} \to \text{Controllable Lever} \to \text{Action} \to \text{Impact} \to \text{Owner}$.

### Speaker Notes / Script (~1 Minute)
> *"BusinessIntelligence.ai solves the translation gap with a strict 'No-Hallucination' architecture. We never allow the LLM to touch raw rows or calculate math. Instead, our deterministic engine calculates the exact additive dollar impact of volume, price, and mix shifts via SQL, while Gemini 2.0 Flash translates these validated findings into persona-tailored briefings in under 5 seconds. Whether providing high-level strategy to the CEO or granular lineage to an analyst, our system delivers trusted narratives and role-assigned action plans—while honestly abstaining when data is too sparse to draw conclusions."*

---

## 🎬 Slide 3: Video Walkthrough & Live Demo

### Slide Title
**Live System Demonstration & End-to-End Walkthrough**

### Embedded Video Placeholder / Link
> `[ Embed 3-Minute Demonstration Video / YouTube / Loom Link Here ]`

---

### ⏱️ 3-Minute Video Demo Script & Screen Breakdown

| Time | Screen / Visual Focus | Voiceover Narration & Action |
|:---|:---|:---|
| **0:00 – 0:35** | **Architecture & Dashboard Overview**<br>• Show Dark-Mode Glassmorphic UI (`localhost:5173`)<br>• Highlight KPI Cards (Revenue, Gross Margin, CAC, Conv. Rate, New Product GMV) | *"Welcome to BusinessIntelligence.ai. In front of you is our executive dashboard powered by a deterministic SQL engine and Gemini. Notice how each KPI card displays real-time variances, sparklines, and status badges derived directly from SQLite and our YAML semantic contracts."* |
| **0:35 – 1:20** | **Scenario 1: Multi-Factor Revenue Drop (Analyst Persona)**<br>• Select **Revenue** card<br>• Show live Typewriter AI Synthesis<br>• Show **Driver Contribution Bar Chart** ($\text{Volume } 84.4\%, \text{Price } 15.6\%$)<br>• Show Structured Action Cards & Evidence Lineage | *"In Month 10, Revenue dropped 33.6%. Our deterministic engine immediately performs additive variance decomposition, proving West region supply bottlenecks caused 84% of the loss, while an over-discounting campaign caused 16%. Gemini translates this into structured action items assigned to the VP of Supply Chain and Director of Pricing, complete with source lineage."* |
| **1:20 – 1:55** | **Scenario 2: Persona Hyper-Personalization (CEO vs Regional Mgr)**<br>• Switch Persona dropdown to **CEO**<br>• Switch Persona dropdown to **Regional Manager - North**<br>• Show card filtering (Gross Margin & CAC hidden) | *"Watch what happens when we switch personas. The CEO receives a high-level 3-sentence macro summary focusing on cash impact. When we switch to Regional Manager North, our dual-layer RBAC filters out corporate-only KPIs and isolates North revenue to \$380K, ensuring local managers only see levers they can control."* |
| **1:55 – 2:30** | **Scenario 3: Honest Uncertainty & Abstention**<br>• Click **CAC** card (Shows `LOW CONFIDENCE — ABSTAINED`)<br>• Click **New Product GMV** (Shows `SPARSE` history badge) | *"Unlike black-box LLMs that hallucinate confident answers on incomplete data, our engine evaluates attribution maturity. For CAC, it detects an incomplete campaign attribution window and explicitly abstains. For our newly launched AI module, it flags sparse history ($<8$ weeks) rather than making false projections."* |
| **2:30 – 3:00** | **Scenario 4: Feedback Loop & Live Telemetry**<br>• Click **👍 / 👎 Feedback** button<br>• Highlight **Runtime Telemetry Panel** (Latency: 42ms, Cost: \$0.000048) | *"Finally, analyst feedback is captured directly into our audit store to fine-tune future responses. Our live telemetry panel demonstrates sub-second execution at less than five-thousandths of a cent per insight. BusinessIntelligence.ai transforms business intelligence from passive retrospective reporting into governed, instant action. Thank you."* |

---

### 📋 Checklist for Slide Deck Preparation
- [ ] **Slide 1:** Copy and paste the 4 visual bullet points; use a visual icon comparing "Dashboard" vs "Analyst Ticket (3-5 Days)" vs "Decision".
- [ ] **Slide 2:** Use the architectural diagram or the 5 pillar boxes (No-Hallucination, Semantic Contracts, Persona Tuning, Abstention Gate, Action Blueprints).
- [ ] **Slide 3:** Insert video frame (16:9 1080p recording of `localhost:5173` demonstrating all 4 scenarios as scripted above).
