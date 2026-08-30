let currentPersona = 'analyst';
let currentKpiId = null;
let currentNarrativeId = null;

const apiBase = '/api';

async function init() {
  await loadPersonas();
  await loadKpis();
}

async function loadPersonas() {
  const res = await fetch(`${apiBase}/kpis/personas`);
  const data = await res.json();
  const select = document.createElement('select');
  select.id = 'personaSelect';
  
  data.personas.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    if (p.id === currentPersona) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', async (e) => {
    currentPersona = e.target.value;
    await loadKpis();
    document.getElementById('insightsPanel').classList.add('hidden');
  });

  document.getElementById('personaSwitcher').appendChild(select);
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '-';
  if (val > 1000000) return '$' + (val / 1000000).toFixed(2) + 'M';
  if (val > 1000) return '$' + (val / 1000).toFixed(1) + 'K';
  return '$' + val.toFixed(2);
}

async function loadKpis() {
  const res = await fetch(`${apiBase}/kpis?year=2025&month=10`, { headers: { 'x-persona': currentPersona } });
  const data = await res.json();
  const list = document.getElementById('kpiList');
  list.innerHTML = '';

  data.kpis.forEach(kpi => {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.dataset.kpi = kpi.kpiId;
    
    let valStr = kpi.kpiId === 'gross_margin' || kpi.kpiId === 'conversion_rate' 
      ? (kpi.value ? kpi.value + '%' : '-') 
      : formatCurrency(kpi.value);

    let changeClass = kpi.pctChange > 0 ? 'up' : (kpi.pctChange < 0 ? 'down' : '');
    let changeSymbol = kpi.pctChange > 0 ? '↑' : (kpi.pctChange < 0 ? '↓' : '');

    card.innerHTML = `
      <div class="kpi-name">${kpi.name}</div>
      <div class="kpi-val">${valStr}</div>
      <div class="kpi-change ${changeClass}">${changeSymbol} ${Math.abs(kpi.pctChange || 0)}% vs last month</div>
    `;

    card.addEventListener('click', () => selectKpi(kpi.kpiId, card));
    list.appendChild(card);
  });
}

async function selectKpi(kpiId, cardEl) {
  currentKpiId = kpiId;
  document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
  cardEl.classList.add('active');

  const panel = document.getElementById('insightsPanel');
  panel.classList.remove('hidden');
  document.getElementById('narrativeText').textContent = 'Generating AI synthesis...';
  document.getElementById('actionsList').innerHTML = '';
  document.getElementById('driversChart').innerHTML = '';

  const res = await fetch(`${apiBase}/narrative/${kpiId}?year=2025&month=10`, { headers: { 'x-persona': currentPersona } });
  const data = await res.json();

  currentNarrativeId = data.narrative_id;

  // Header
  document.getElementById('insightsKpiName').textContent = kpiId.toUpperCase();
  const badge = document.getElementById('anomalyBadge');
  if (data.abstention) {
    badge.textContent = 'ABSTAINED';
    badge.className = 'badge normal';
  } else if (data.evidence && data.evidence.confidence === 'High') {
    badge.textContent = 'ANOMALY DETECTED';
    badge.className = 'badge anomaly';
  }

  // Narrative
  typeWriterEffect('narrativeText', data.narrative || '');

  // Actions
  const aList = document.getElementById('actionsList');
  if (data.actions && data.actions.length > 0) {
    data.actions.forEach(act => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${act.lever || act.action}</strong> ${act.action} (Impact: ${act.expected_impact}) [Owner: ${act.owner}]`;
      aList.appendChild(li);
    });
  } else {
    aList.innerHTML = '<li>No actions recommended.</li>';
  }

  // Telemetry
  if (data.telemetry) {
    document.getElementById('tTotal').textContent = data.telemetry.total_latency_ms + 'ms';
    document.getElementById('tNonLlm').textContent = (data.telemetry.non_llm_latency_ms || 0) + 'ms';
    document.getElementById('tLlm').textContent = (data.telemetry.llm_latency_ms || 0) + 'ms';
    document.getElementById('tInTokens').textContent = data.telemetry.input_tokens || 0;
    document.getElementById('tOutTokens').textContent = data.telemetry.output_tokens || 0;
    document.getElementById('tCost').textContent = (data.telemetry.estimated_cost_usd || 0).toFixed(5);
  }
}

function typeWriterEffect(elementId, text) {
  const el = document.getElementById(elementId);
  el.textContent = '';
  let i = 0;
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, 15); // Fast typewriter
    }
  }
  type();
}

document.getElementById('btnThumbsUp').addEventListener('click', () => sendFeedback('thumbs_up'));
document.getElementById('btnThumbsDown').addEventListener('click', () => sendFeedback('thumbs_down'));

async function sendFeedback(rating) {
  if (!currentNarrativeId) return;
  await fetch(`${apiBase}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-persona': currentPersona },
    body: JSON.stringify({ narrative_id: currentNarrativeId, kpi_id: currentKpiId, persona: currentPersona, rating })
  });
  alert('Feedback recorded!');
}

init();
