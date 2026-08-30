/**
 * main.js — BusinessIntelligence.ai Frontend
 * Connects to the Express API and renders the KPI dashboard.
 */

let currentPersona     = 'analyst';
let currentKpiId       = null;
let currentNarrativeId = null;

const apiBase = '/api';

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function init() {
  await loadPersonas();
  await loadKpis();

  // Wire feedback buttons here (after DOM is ready, elements exist)
  document.getElementById('btnThumbsUp')
    .addEventListener('click', () => sendFeedback('thumbs_up'));
  document.getElementById('btnThumbsDown')
    .addEventListener('click', () => sendFeedback('thumbs_down'));
}

// ── Personas ─────────────────────────────────────────────────────────────────
async function loadPersonas() {
  try {
    const res  = await fetch(`${apiBase}/kpis/personas`);
    const data = await res.json();
    const select = document.createElement('select');
    select.id = 'personaSelect';

    data.personas.forEach(p => {
      const opt = document.createElement('option');
      opt.value       = p.id;
      opt.textContent = p.label;
      if (p.id === currentPersona) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', async (e) => {
      currentPersona = e.target.value;
      document.getElementById('insightsPanel').classList.add('hidden');
      clearBadge();
      await loadKpis();
    });

    document.getElementById('personaSwitcher').appendChild(select);
  } catch (err) {
    console.error('Failed to load personas:', err);
  }
}

// ── KPI Cards ─────────────────────────────────────────────────────────────────
function formatValue(kpi) {
  const v = kpi.value;
  if (v === null || v === undefined) return '—';
  if (kpi.kpiId === 'gross_margin' || kpi.kpiId === 'conversion_rate') {
    return v.toFixed(3) + '%';
  }
  if (kpi.kpiId === 'cac') return '$' + v.toFixed(2);
  // Currency
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000)     return '$' + (v / 1_000).toFixed(1) + 'K';
  return '$' + v.toFixed(2);
}

async function loadKpis() {
  const list = document.getElementById('kpiList');
  list.innerHTML = '<div style="color:var(--text-secondary);font-size:.85rem">Loading…</div>';

  try {
    const res  = await fetch(`${apiBase}/kpis?year=2025&month=10`, {
      headers: { 'x-persona': currentPersona },
    });
    const data = await res.json();
    list.innerHTML = '';

    if (!data.kpis || data.kpis.length === 0) {
      list.innerHTML = '<div style="color:var(--text-secondary)">No KPIs accessible for this role.</div>';
      return;
    }

    data.kpis.forEach(kpi => {
      const card  = document.createElement('div');
      card.className   = 'kpi-card';
      card.dataset.kpi = kpi.kpiId;

      const changeClass  = (kpi.pctChange ?? 0) > 0 ? 'up' : ((kpi.pctChange ?? 0) < 0 ? 'down' : '');
      const changeSymbol = (kpi.pctChange ?? 0) > 0 ? '↑' : ((kpi.pctChange ?? 0) < 0 ? '↓' : '—');
      const changeText   = kpi.pctChange !== null
        ? `${changeSymbol} ${Math.abs(kpi.pctChange).toFixed(1)}% vs last month`
        : 'No prior period';

      const sparseTag = kpi.sparseHistory
        ? '<span style="font-size:.7rem;color:var(--warning);margin-left:.5rem">SPARSE</span>'
        : '';

      card.innerHTML = `
        <div class="kpi-name">${kpi.name}${sparseTag}</div>
        <div class="kpi-val">${formatValue(kpi)}</div>
        <div class="kpi-change ${changeClass}">${changeText}</div>
      `;

      card.addEventListener('click', () => selectKpi(kpi.kpiId, card));
      list.appendChild(card);
    });
  } catch (err) {
    list.innerHTML = '<div style="color:var(--danger)">Error loading KPIs. Is the backend running?</div>';
    console.error('loadKpis error:', err);
  }
}

// ── Select a KPI → fetch narrative ───────────────────────────────────────────
async function selectKpi(kpiId, cardEl) {
  currentKpiId = kpiId;

  document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
  cardEl.classList.add('active');

  const panel = document.getElementById('insightsPanel');
  panel.classList.remove('hidden');

  // Reset panel state
  document.getElementById('insightsKpiName').textContent = kpiId.replace(/_/g, ' ').toUpperCase();
  document.getElementById('narrativeText').textContent   = 'Generating analysis…';
  document.getElementById('actionsList').innerHTML       = '';
  document.getElementById('driversChart').innerHTML      = '';
  document.getElementById('lineageInfo').textContent     = '';
  clearBadge();
  clearTelemetry();

  try {
    const res  = await fetch(`${apiBase}/narrative/${kpiId}?year=2025&month=10`, {
      headers: { 'x-persona': currentPersona },
    });
    const data = await res.json();

    if (data.error) {
      document.getElementById('narrativeText').textContent = `Error: ${data.error}`;
      return;
    }

    currentNarrativeId = data.narrative_id;

    // ── Badge ────────────────────────────────────────────────────────────────
    const badge = document.getElementById('anomalyBadge');
    if (data.abstention) {
      badge.textContent = 'LOW CONFIDENCE — ABSTAINED';
      badge.className   = 'badge warning';
    } else if (data.evidence?.anomaly) {
      badge.textContent = 'ANOMALY DETECTED';
      badge.className   = 'badge anomaly';
    } else {
      badge.textContent = data.evidence?.confidence
        ? `Confidence: ${data.evidence.confidence}`
        : 'OK';
      badge.className   = 'badge normal';
    }

    // ── Narrative (typewriter) ───────────────────────────────────────────────
    typeWriter('narrativeText', data.narrative || '');

    // ── Drivers chart ────────────────────────────────────────────────────────
    if (data.drivers && data.drivers.length > 0) {
      renderDrivers(data.drivers);
    }

    // ── Actions ──────────────────────────────────────────────────────────────
    const aList = document.getElementById('actionsList');
    if (!data.abstention && data.actions && data.actions.length > 0) {
      data.actions.forEach(act => {
        const li = document.createElement('li');
        const lever  = act.lever  || act.driver  || '—';
        const action = act.action || '—';
        const impact = act.expected_impact || '—';
        const owner  = act.owner  || '—';
        li.innerHTML = `<strong>${lever}</strong>: ${action}<br><small>Impact: ${impact} · Owner: ${owner}</small>`;
        aList.appendChild(li);
      });
    } else {
      aList.innerHTML = '<li>No actions recommended.</li>';
    }

    // ── Evidence / Lineage ───────────────────────────────────────────────────
    if (data.evidence) {
      const src = Array.isArray(data.evidence.sources)
        ? data.evidence.sources.join(', ')
        : data.evidence.sources || '—';
      document.getElementById('lineageInfo').innerHTML =
        `<strong>Source(s):</strong> ${src} &nbsp;|&nbsp;
         <strong>Method:</strong> ${data.evidence.method || '—'} &nbsp;|&nbsp;
         <strong>Confidence:</strong> ${data.evidence.confidence || '—'}<br>
         <small style="color:var(--text-secondary)">LLM used only for narrative synthesis — all numbers are SQL-derived.</small>`;
    }

    // ── Telemetry ────────────────────────────────────────────────────────────
    if (data.telemetry) {
      const t = data.telemetry;
      document.getElementById('tTotal').textContent    = t.total_latency_ms    + ' ms';
      document.getElementById('tNonLlm').textContent   = (t.non_llm_latency_ms || 0) + ' ms';
      document.getElementById('tLlm').textContent      = (t.llm_latency_ms     || 0) + ' ms';
      document.getElementById('tInTokens').textContent = t.input_tokens  || 0;
      document.getElementById('tOutTokens').textContent= t.output_tokens || 0;
      document.getElementById('tCost').textContent     = (t.estimated_cost_usd || 0).toFixed(6);
    }
  } catch (err) {
    document.getElementById('narrativeText').textContent = 'Failed to fetch narrative. Check console.';
    console.error('selectKpi error:', err);
  }
}

// ── Driver Bar Chart (pure SVG-free, CSS bars) ───────────────────────────────
function renderDrivers(drivers) {
  const container = document.getElementById('driversChart');
  container.innerHTML = '';

  const maxAbs = Math.max(...drivers.map(d => Math.abs(d.contribution_pct || 0)), 1);

  drivers.forEach(d => {
    const pct       = d.contribution_pct ?? 0;
    const barWidth  = (Math.abs(pct) / maxAbs * 100).toFixed(1);
    const typeClass = d.type === 'negative' ? 'negative' : (d.type === 'positive' ? 'positive' : '');
    const sign      = pct > 0 ? '+' : '';

    const row = document.createElement('div');
    row.className = 'driver-bar-container';
    row.innerHTML = `
      <span title="${d.method || ''}">${d.name}</span>
      <div class="driver-bar-bg">
        <div class="driver-bar-fill ${typeClass}" style="width:${barWidth}%"></div>
      </div>
      <span style="color:${d.type === 'negative' ? 'var(--danger)' : 'var(--success)'}">${sign}${pct}%</span>
    `;
    row.title = d.factor || '';
    container.appendChild(row);
  });
}

// ── Typewriter animation ──────────────────────────────────────────────────────
function typeWriter(elementId, text) {
  const el = document.getElementById(elementId);
  el.textContent = '';
  let i = 0;
  function step() {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(step, 12);
    }
  }
  step();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function clearBadge() {
  const b = document.getElementById('anomalyBadge');
  b.textContent = '';
  b.className   = 'badge';
}

function clearTelemetry() {
  ['tTotal','tNonLlm','tLlm','tInTokens','tOutTokens','tCost'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
}

// ── Feedback ──────────────────────────────────────────────────────────────────
async function sendFeedback(rating) {
  if (!currentNarrativeId) {
    alert('Please select a KPI first.');
    return;
  }
  try {
    await fetch(`${apiBase}/feedback`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-persona': currentPersona },
      body:    JSON.stringify({
        narrative_id:    currentNarrativeId,
        kpi_id:          currentKpiId,
        persona:         currentPersona,
        rating,
        correction_text: '',
      }),
    });
    const btn = rating === 'thumbs_up'
      ? document.getElementById('btnThumbsUp')
      : document.getElementById('btnThumbsDown');
    btn.textContent = rating === 'thumbs_up' ? '👍 Recorded!' : '👎 Recorded!';
    setTimeout(() => {
      btn.textContent = rating === 'thumbs_up' ? '👍 Accurate' : '👎 Needs Correction';
    }, 2000);
  } catch (err) {
    console.error('sendFeedback error:', err);
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
