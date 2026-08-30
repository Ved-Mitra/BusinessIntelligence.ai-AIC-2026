# BusinessIntelligence.ai — KPI Intelligence-to-Action Engine

Accenture Innovation Challenge — Round 2 Prototype

An AI-powered system that explains what changed in a business metric, identifies root causes, and recommends actions, without ever hallucinating numbers.

## 🚀 Quickstart (Running the Demo)

1. **Install Node.js (v18+)**
2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY (optional, falls back to mock if empty)
   npm run seed   # Generates SQLite DB from CSVs
   npm run dev    # Starts API on http://localhost:3001
   ```
3. **Setup Frontend:**
   ```bash
   # In a new terminal
   cd frontend
   npm install
   npm run dev    # Starts UI on http://localhost:5173
   ```
4. **Open `http://localhost:5173`**

## 🧩 Architecture: The "No-Hallucination" Design

The core rule of this engine: **The LLM never touches raw data or calculates math.**

1. **KPI Semantic Contracts (YAML):** Defines rules, sources, lineage, and role-based access.
2. **Analytical Engine (Node.js/SQL):** Calculates metrics, detects anomalies (Z-score), and decomposes drivers (volume, price, mix) purely using deterministic SQL/Math.
3. **LLM Orchestration Layer (Gemini 2.0 Flash):** Receives the pre-computed driver breakdown and synthesizes a persona-specific natural language narrative and action plan.
4. **Abstention Handler:** If data is sparse or contradictory, the engine abstains rather than guessing.

## 🎭 Scenarios to Demo

Use the persona dropdown in the UI to explore:
1. **Multi-driver Drop:** Month 10 Revenue drops 33% due to West region volume issues and a discount overshoot.
2. **Role-Based Security:** Switch to "Regional Manager - North". Note how they only see 2 KPIs and their revenue figure is much smaller (North region data only).
3. **Sparse History:** Click "New Product GMV". Notice the warning badge and lack of driver decomposition due to insufficient history.
4. **Low Confidence:** (Simulated on CAC in Month 10). Notice the system explicitly abstains from attributing the spike.
