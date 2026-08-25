// ============================================================
// APP — view routing, rendering and UI behaviour
// ============================================================
// Data policy, by view:
//   Home / All Stocks / Commodities — live only. Every number comes from a
//     /v1 endpoint. Where the DB has no row the UI renders a dash or an empty
//     state; it never substitutes a generated, derived-for-looks or canned value.
//   Watchlist / Active Calls — still on mock-data.js. Neither has an endpoint
//     (backend/routers/watchlist.py and top_picks.py are empty files).
//
// Columns worth knowing about, because the naming isn't obvious:
//   overall_bias_score  0.0-1.0  the LLM's conviction  (llm_score is a dead column)
//   overall_bias_label  Bullish|Bearish|Neutral|Mixed
//   short_term_action   BUY|SELL|HOLD|NEUTRAL         (llm_action is a dead column)
//   python_score        0-100    the rule engine's score
//   combined_score/_action — columns exist but NO pipeline writes them yet, so
//     they arrive null and the combined verdict is derived here from the two above.
// ============================================================

const biasColor = (b) => ({
    'Bullish': 'text-emerald-700 bg-emerald-50',
    'Bearish': 'text-rose-700 bg-rose-50',
    'Mixed': 'text-amber-700 bg-amber-50',
    'Neutral': 'text-slate-600 bg-slate-100',
}[b] || 'text-slate-600 bg-slate-100');

const actionColor = (a) => ({
    'BUY': 'text-emerald-700 bg-emerald-50 border-emerald-200',
    'SELL': 'text-rose-700 bg-rose-50 border-rose-200',
    'HOLD': 'text-slate-600 bg-slate-50 border-slate-200',
    'NEUTRAL': 'text-slate-500 bg-slate-50 border-slate-200',
}[a] || 'text-slate-500 bg-slate-50 border-slate-200');

// null == "no day_change_pct on the latest analysis row" — stay neutral rather
// than painting a missing value green.
const changeColor = (c) => c == null ? 'text-slate-400' : c >= 0 ? 'text-emerald-600' : 'text-rose-600';
const changeSign  = (c) => c == null ? '' : c >= 0 ? '+' : '';

// ============================================================
// Hold-duration pill + "Why hold this long?" popover (shared)
// ============================================================
// Escape for embedding text inside an HTML attribute (reason is read back via dataset).
const escAttr = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Build a clickable hold pill. `variant`: 'card' (LLM card) or 'mini' (history table).
// days=null renders the "undetermined" form. Returns '' if there's no reason to show.
function holdPill(days, label, reason, variant) {
    if (!reason) return '';
    const text = variant === 'mini'
        ? (days != null ? `· ${days}d` : '· ?')
        : (days != null ? `Hold · ~${days}d` : 'Hold · Undetermined');
    const subtitle = label || (days != null ? `~${days} days` : 'Undetermined');
    const cls = variant === 'mini' ? 'hold-pill hold-pill-mini' : 'hold-pill';
    return `<span class="${cls}" onclick="openHoldPopover(event, this)" `
         + `data-hold-label="${escAttr(subtitle)}" data-hold-reason="${escAttr(reason)}" `
         + `title="Why hold this long?">${text}</span>`;
}

// Reveal first so we can measure, then anchor near the trigger within the viewport.
function positionHoldPopover(el) {
    const pop = document.getElementById('hold-popover');
    pop.classList.remove('hidden');
    const r = el.getBoundingClientRect();
    const pad = 12;
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const left = Math.max(pad, Math.min(r.left, window.innerWidth - pw - pad));
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - pad) top = r.top - ph - 8; // flip above if no room below
    top = Math.max(pad, top);
    pop.style.left = left + 'px';
    pop.style.top  = top + 'px';
}

// Single-reason popover — used by the HOLD pill on the LLM analysis card.
function openHoldPopover(ev, el) {
    ev.stopPropagation();
    document.getElementById('hold-popover-title').textContent = 'Why hold this long?';
    const label = el.dataset.holdLabel || '';
    document.getElementById('hold-popover-body').innerHTML =
        (label ? `<div class="hp-label text-[11px] font-semibold mb-1">${escAttr(label)}</div>` : '')
        + `<p class="text-xs leading-relaxed">${escAttr(el.dataset.holdReason || '')}</p>`;
    positionHoldPopover(el);
}

// Dual-reason popover — used by the Combined action chip in the history table.
// Explains the combined call by showing the LLM reasoning AND the Raw (rule-based)
// reasoning side by side, plus the suggested hold window when the LLM action was HOLD.
function openComboPopover(ev, el) {
    ev.stopPropagation();
    const d = el.dataset;
    document.getElementById('hold-popover-title').textContent = `Why ${d.comboAction}?`;
    const holdLine = d.holdLabel
        ? `<div class="hp-label text-[11px] font-semibold mb-2">Suggested hold · ${escAttr(d.holdLabel)}</div>`
        : '';
    // Overall verdict — one line summarising how the combined call was reached.
    const score = d.comboScore === '' || d.comboScore == null ? null : d.comboScore;
    const verdict = verdictText(d.comboAction, score, d.comboMixed === '1', d.llmAct, d.pyAct);
    const verdictLine = `<div class="mb-2.5 pb-2.5 border-b border-slate-200/60">
        <div class="hp-label text-[10px] font-bold uppercase tracking-widest mb-0.5">Overall verdict · ${escAttr(d.comboAction)}${score != null ? ` · ${score}/100` : ''}</div>
        <p class="text-xs leading-relaxed">${escAttr(verdict)}</p></div>`;
    const section = (tag, act, reason) =>
          `<div class="mb-2.5 last:mb-0">`
        + `<div class="hp-label text-[10px] font-bold uppercase tracking-widest mb-0.5">${tag} · ${escAttr(act || '—')}</div>`
        + `<p class="text-xs leading-relaxed">${escAttr(reason)}</p>`
        + `</div>`;
    // Only the reasoning sections the DB actually supplied — a call with no
    // stored reasoning shows the verdict + actions alone, never an invented sentence.
    document.getElementById('hold-popover-body').innerHTML =
        holdLine
        + verdictLine
        + (d.llmReason ? section('LLM', d.llmAct, d.llmReason) : '')
        + (d.pyReason ? section('Python', d.pyAct, d.pyReason) : '')
        + (!d.llmReason && !d.pyReason
            ? `<p class="text-xs leading-relaxed">${escAttr(
                [d.llmAct ? `LLM: ${d.llmAct}` : '', d.pyAct ? `Python: ${d.pyAct}` : '']
                    .filter(Boolean).join(' · ')
              )}. No stored reasoning for this call yet.</p>`
            : '');
    positionHoldPopover(el);
}

function closeHoldPopover() {
    document.getElementById('hold-popover').classList.add('hidden');
}

// Close on outside-click and on Escape. The opener calls stopPropagation, so opening
// never immediately re-closes; clicking another pill is handled by that pill's onclick.
document.addEventListener('click', (e) => {
    const pop = document.getElementById('hold-popover');
    if (pop.classList.contains('hidden')) return;
    if (pop.contains(e.target) || e.target.closest('.hold-pill, .combo-chip')) return;
    closeHoldPopover();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeHoldPopover(); });

// ----- Shared empty / loading state -----
// Used everywhere a live view has nothing to show. Says which endpoint or table
// is empty rather than filling the space with representative-looking rows.
function emptyState(message, spanCls = '') {
    return `<div class="${spanCls} bg-white border border-dashed border-slate-300 rounded-xl px-5 py-8 text-center">
                <p class="text-sm text-slate-500">${escAttr(message)}</p>
            </div>`;
}

// ============================================================
// Ranking model — one scoring pass, three ways of reading it
// ============================================================
// The home Top Picks list, the rankings modal and the Recommendations view all
// rank the same stocks, so the LLM/raw/combined derivation lives here once.
// Returned best-combined-first.
const TOP_PICKS_COUNT = 10;

// The universe the home ranking is built from: one unfiltered page of
// GET /v1/all_stocks/stocks. Sector filtering happens client-side against this
// so switching sectors doesn't refetch, and "All sectors" is a real universe
// rather than whichever page the All Stocks view happens to be on.
const HOME_RANK_LIMIT = 500;
let rankRows   = [];        // mapped live rows
let rankLoaded = false;     // the fetch has settled, one way or the other
let rankError  = false;

async function loadRankUniverse() {
    try {
        const rows = await api.stocks(0, HOME_RANK_LIMIT);
        rankRows  = rows.map(mapStockRow);
        rankError = false;
    } catch (err) {
        console.warn('Home ranking fetch failed:', err.message);
        rankRows  = [];
        rankError = true;
    }
    rankLoaded = true;
    populateSectorSelects();
    renderHomePicks();
    if (!document.getElementById('rankings-overlay').classList.contains('hidden')) renderRankings();
}

// Rank the live rows. A stock is only rankable once the pipeline has written at
// least one of the two scores — rows with neither are dropped, never given a
// stand-in score, so an empty stock_analysis yields an empty list.
function scoredStocks() {
    return rankRows.map(s => {
        const llmScore100 = s.llmScore    == null ? null : Math.round(s.llmScore * 100);
        const pyScore     = s.pythonScore == null ? null : Math.round(s.pythonScore);
        if (llmScore100 == null && pyScore == null) return null;

        const llmAct = s.llmAction    || null;
        const pyAct  = s.pythonAction || null;

        let combinedAction, combinedScore, combinedMixed = false;
        if (s.combinedScore != null && s.combinedAction) {
            // Preferred: the DB's own verdict, once something writes it.
            combinedAction = s.combinedAction;
            combinedScore  = Math.round(s.combinedScore);
        } else if (llmScore100 != null && pyScore != null && llmAct && pyAct) {
            // Both methods present — combine them the way the UI documents.
            const c = combineDecisions(pyAct, pyScore, llmAct, llmScore100);
            combinedAction = c.action; combinedScore = c.score; combinedMixed = c.mixed;
        } else {
            // Only one method has run. Show it as-is instead of inventing the other half.
            combinedScore  = llmScore100 ?? pyScore;
            combinedAction = llmAct || pyAct || null;
        }

        return { ...s, llmScore100, pythonScore: pyScore, llmAct, pyAct,
                 combinedAction, combinedScore, combinedMixed };
    }).filter(Boolean)
      .sort((a, b) => b.combinedScore - a.combinedScore);
}

// hold_duration lives in stock_analysis but no endpoint selects it yet, so this
// resolves to null on every live row. Left in place so the pill lights up on its own.
const holdOf = (s) => s.hold_duration_reason
    ? { days: s.hold_duration_days, label: s.hold_duration_label, reason: s.hold_duration_reason }
    : null;

// ----- Universe selector -----
// '' = the whole universe; otherwise a single sector. Drives both the home Top Picks
// list and the rankings modal, so "top 10" always means top 10 of what's selected.
// Options are derived from the ranked data itself, so every choice yields rows.
let picksSector = '';

const PICKS_UNIVERSE_LABEL = 'All sectors';
const universeLabel = () => picksSector || PICKS_UNIVERSE_LABEL;

function pickSectors() {
    return [...new Set(rankRows.map(s => s.sector).filter(Boolean))].sort();
}

// Defaults to sectors derived from the ranked data; loadPicksSectors() calls
// this again with the backend's list once it arrives.
function populateSectorSelects(sectors = pickSectors()) {
    const opts = `<option value="">${PICKS_UNIVERSE_LABEL} · universe</option>`
        + sectors.map(sec => `<option value="${escAttr(sec)}">${escAttr(sec)}</option>`).join('');
    ['picks-sector', 'rankings-sector'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = opts;
        el.value = picksSector;
    });
}

// Both selects call this, so changing one keeps the other (and every list) in step.
function setPicksSector(sector) {
    picksSector = sector || '';
    closeHoldPopover();
    ['picks-sector', 'rankings-sector'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = picksSector;
    });
    renderHomePicks();
    if (!document.getElementById('rankings-overlay').classList.contains('hidden')) renderRankings();
}

// Every scored stock in the selected universe, best combined score first.
const picksUniverse = () => scoredStocks().filter(s => !picksSector || s.sector === picksSector);

// ----- Render home picks (single combined top 10 within the selected universe) -----
function renderHomePicks() {
    const list = document.getElementById('top-picks-list');
    const sub  = document.getElementById('top-picks-sub');
    if (!list || !sub) return;

    if (!rankLoaded) {
        sub.textContent = '';
        list.innerHTML = emptyState('Loading picks…', 'sm:col-span-2');
        return;
    }
    if (rankError) {
        sub.textContent = '';
        list.innerHTML = emptyState('Could not reach GET /v1/all_stocks/stocks — no picks to show.', 'sm:col-span-2');
        return;
    }

    const universe = picksUniverse();
    const picks    = universe.slice(0, TOP_PICKS_COUNT);
    if (!picks.length) {
        sub.textContent = '';
        list.innerHTML = emptyState(
            picksSector
                ? `No analysed stock in ${picksSector} yet.`
                : 'No stock has an analysis row yet — stock_analysis is empty until the nightly pipeline runs.',
            'sm:col-span-2');
        return;
    }

    const scope = picksSector ? `in ${picksSector}` : 'overall';
    const lead  = picks.length === 1 ? '1 pick' : `Top ${picks.length}`;
    sub.textContent = `${lead} ${scope} of ${universe.length} analysed — LLM conviction and raw signals combined`;
    list.innerHTML = picks.map(topPickCard).join('');
}

function topPickCard(s, idx) {
    // Only name the methods that actually scored this stock.
    const scoreNote = [
        s.llmScore100 == null ? null : `LLM ${s.llmScore100}`,
        s.pythonScore == null ? null : `Raw ${s.pythonScore}`,
    ].filter(Boolean).join(' · ');
    return `
        <div onclick="openDrawer('${escAttr(s.symbol)}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-sm rounded-xl p-4 cursor-pointer transition group">
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 shrink-0 bg-gradient-to-br from-sky-100 to-teal-100 rounded-lg flex items-center justify-center text-xs font-bold text-sky-700">
                    #${idx + 1}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-slate-900 truncate">${s.name}</span>
                        <span class="text-xs text-slate-400 shrink-0">${s.symbol.replace('.NS','')}</span>
                    </div>
                    <div class="flex items-center gap-2 mt-2 flex-wrap">
                        ${comboChip(s.combinedAction, s.llmAct, s.pyAct, s, holdOf(s), s.combinedScore, s.combinedMixed)}
                        <span class="text-xs text-slate-500">${scoreNote}</span>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <div class="text-sm font-semibold text-slate-900">${s.combinedScore ?? '—'}/100</div>
                    <div class="text-xs ${changeColor(s.change)} mt-1">${fmtChange(s.change)}</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// Rankings modal — the same list read three ways
// ============================================================
// 'all' ranks every tracked stock by combined score; 'llm' and 'raw' are the
// per-method lists that used to sit side by side on the home page.
const RANKING_TABS = {
    all: { label: 'All rankings',  sub: (n) => `All ${n} stock${n === 1 ? '' : 's'} in ${universeLabel()} ranked by combined score — LLM conviction and raw signals together.` },
    llm: { label: 'Top LLM picks', sub: (n) => `${n === 1 ? '1 pick' : 'Top ' + n} in ${universeLabel()} by LLM conviction alone (Qwen3-32B) — bias, narrative and news flow.` },
    raw: { label: 'Top raw picks', sub: (n) => `${n === 1 ? '1 pick' : 'Top ' + n} in ${universeLabel()} by the rule engine alone — technical and fundamental thresholds, no LLM.` },
};
let rankingsTab = 'all';

function openRankings(tab) {
    rankingsTab = RANKING_TABS[tab] ? tab : 'all';
    renderRankings();
    const overlay = document.getElementById('rankings-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

function closeRankings() {
    closeHoldPopover();
    const overlay = document.getElementById('rankings-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
}

function showRankingsTab(tab) {
    rankingsTab = tab;
    closeHoldPopover();
    renderRankings();
    document.getElementById('rankings-body').scrollTop = 0;
}

// Each tab sorts on its own score; 'all' keeps every row, the two method tabs cut at 10.
// A method tab only lists stocks that method actually scored.
function rankingRowsFor(tab) {
    const scored = picksUniverse();
    if (tab === 'llm') return scored.filter(s => s.llmScore100 != null)
                                    .sort((a, b) => b.llmScore100 - a.llmScore100).slice(0, TOP_PICKS_COUNT);
    if (tab === 'raw') return scored.filter(s => s.pythonScore != null)
                                    .sort((a, b) => b.pythonScore - a.pythonScore).slice(0, TOP_PICKS_COUNT);
    return scored;
}

function rankingRow(s, idx, tab) {
    // Detail modal opens on the method the tab is about; 'all' defaults to the LLM narrative.
    const source = tab === 'raw' ? 'raw' : 'llm';
    const score  = tab === 'llm' ? s.llmScore100 : tab === 'raw' ? s.pythonScore : s.combinedScore;

    let chip, note;
    if (tab === 'all') {
        chip = comboChip(s.combinedAction, s.llmAct, s.pyAct, s, holdOf(s), s.combinedScore, s.combinedMixed);
        // "agree"/"diverge" is only meaningful when both methods actually ran.
        note = (s.llmAct && s.pyAct)
            ? (s.combinedMixed ? 'Methods diverge' : 'Both methods agree')
            : (s.llmAct ? 'LLM only' : s.pyAct ? 'Rule engine only' : '');
    } else if (tab === 'llm') {
        chip = s.llmAct
            ? `<span class="text-xs font-semibold px-2.5 py-1 rounded-md border ${actionColor(s.llmAct)}">${s.llmAct}</span>`
            : '<span class="text-xs text-slate-400">—</span>';
        note = [s.llmBias, s.pythonScore == null ? null : `Raw ${s.pythonScore}`].filter(Boolean).join(' · ');
    } else {
        chip = s.pyAct
            ? `<span class="text-xs font-semibold px-2.5 py-1 rounded-md border ${actionColor(s.pyAct)}">${s.pyAct}</span>`
            : '<span class="text-xs text-slate-400">—</span>';
        note = ['Rule-based', s.llmScore100 == null ? null : `LLM ${s.llmScore100}`].filter(Boolean).join(' · ');
    }

    return `
        <div onclick="openDrawer('${escAttr(s.symbol)}', '${source}')" class="grid grid-cols-12 gap-3 items-center px-3 py-3 rounded-lg border border-transparent hover:border-sky-300 hover:bg-slate-100 cursor-pointer transition">
            <div class="col-span-5 flex items-center gap-3 min-w-0">
                <span class="text-xs font-bold text-slate-400 w-6 shrink-0">#${idx + 1}</span>
                <div class="min-w-0">
                    <div class="font-semibold text-slate-900 text-sm truncate">${s.name}</div>
                    <div class="text-xs text-slate-400 mt-0.5 truncate">${s.symbol.replace('.NS','')} · ${s.sector}</div>
                </div>
            </div>
            <div class="col-span-3">
                ${chip}
                <div class="text-[10px] text-slate-400 uppercase tracking-wide mt-1">${note}</div>
            </div>
            <div class="col-span-2 text-right text-sm font-semibold text-slate-900">${score ?? '—'}<span class="text-xs text-slate-400 font-normal">/100</span></div>
            <div class="col-span-2 text-right">
                <div class="text-sm font-semibold text-slate-900">${fmtPrice(s.price)}</div>
                <div class="text-xs ${changeColor(s.change)} mt-0.5">${fmtChange(s.change)}</div>
            </div>
        </div>
    `;
}

function renderRankings() {
    const tab  = rankingsTab;
    const meta = RANKING_TABS[tab];
    const rows = rankingRowsFor(tab);

    document.getElementById('rankings-title').textContent = meta.label;
    document.getElementById('rankings-sub').textContent   = meta.sub(rows.length);
    document.getElementById('rankings-sector').value      = picksSector;

    const activeCls   = 'px-3.5 py-2.5 text-sm font-medium border-b-2 border-sky-500 text-sky-600 -mb-px transition';
    const inactiveCls = 'px-3.5 py-2.5 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 -mb-px transition';
    const universeSize = picksUniverse().length;
    const tabCount = (key) => key === 'all' ? universeSize : Math.min(TOP_PICKS_COUNT, universeSize);
    document.getElementById('rankings-tabs').innerHTML = Object.entries(RANKING_TABS).map(([key, t]) => `
        <button onclick="showRankingsTab('${key}')" class="${key === tab ? activeCls : inactiveCls}">
            ${t.label}
            <span class="ml-1 text-xs text-slate-400">${tabCount(key)}</span>
        </button>
    `).join('');

    if (!rows.length) {
        document.getElementById('rankings-body').innerHTML = emptyState(
            !rankLoaded ? 'Loading…'
            : rankError ? 'Could not reach GET /v1/all_stocks/stocks.'
            : tab === 'llm' ? 'No stock has an LLM bias score yet.'
            : tab === 'raw' ? 'No stock has a rule-engine score yet.'
            : 'No analysed stocks in this universe yet.');
        return;
    }

    document.getElementById('rankings-body').innerHTML = `
        <div class="grid grid-cols-12 gap-3 px-3 pb-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            <div class="col-span-5">Stock</div>
            <div class="col-span-3">${tab === 'all' ? 'Combined call' : 'Call'}</div>
            <div class="col-span-2 text-right">${tab === 'all' ? 'Combined' : tab === 'llm' ? 'LLM score' : 'Raw score'}</div>
            <div class="col-span-2 text-right">Price</div>
        </div>
        <div class="space-y-1">${rows.map((s, i) => rankingRow(s, i, tab)).join('')}</div>
    `;
}

// ============================================================
// All Stocks — batched rendering behind a "Load more" button
// ============================================================
// The real list is ~2,400 NSE symbols, so rows are pulled from the API in
// blocks of STOCKS_FETCH_SIZE and revealed ALL_STOCKS_PAGE_SIZE at a time.
// If the API is unreachable the view falls back to mock-data.js.
const STOCKS_FETCH_SIZE    = 50;    // rows pulled from the API per request
const ALL_STOCKS_PAGE_SIZE = 50;    // cards revealed per "Load more" click
let allStocksShown = 0;

// Live rows from GET /v1/all_stocks/stocks. Kept separate from the mock `stocks`
// array so Home / Top Picks / Watchlist keep rendering until their endpoints exist.
let allStocks       = [];
let allStocksOffset = 0;            // server-side cursor
let allStocksMore   = true;         // false once a fetch returns a short page
let allStocksLive   = false;        // true once the API has answered at least once
let currentSector   = '';           // '' = all sectors

// ----- Null-safe formatters -----
// stock_analysis is empty until the nightly pipeline writes to it, so every
// analysis column arrives null. Render a dash rather than throwing.
const fmtPrice  = (p) => p == null ? '—' : '₹' + p.toLocaleString('en-IN');
const fmtChange = (c) => c == null ? '' : `${changeSign(c)}${c}%`;
const fmtScore  = (v) => v == null ? '—' : (v * 100).toFixed(0);
const fmtMarketCap = (n) => {
    const num = Number(n);
    if (!num) return '—';
    const cr = num / 1e7;                                   // 1 crore = 10^7
    if (cr >= 1e5) return (cr / 1e5).toFixed(1) + 'L Cr';
    if (cr >= 1e3) return (cr / 1e3).toFixed(1) + 'K Cr';
    return cr.toFixed(0) + ' Cr';
};

// llm_reasoning is JSONB {technical, fundamental, sentiment, synthesis} in the
// schema, but a future flat text column would arrive as a plain string — normalise
// so .synthesis resolves either way. Returns null when the column is absent.
const normLlmReasoning = (r) => {
    if (r == null) return null;
    if (typeof r === 'string') return { synthesis: r };
    return r;
};

// One-line explanation of the combined call. There is no stored combined-verdict
// column yet (combined_score/_action exist but no pipeline writes them), so this
// is derived from which methods ran and whether they agreed.
function verdictText(action, score, mixed, llmAct, pyAct) {
    const s = score == null ? '—' : score;
    if (llmAct && pyAct) {
        if (mixed) return `Methods diverge — LLM says ${llmAct}, Python says ${pyAct}. Averaged conviction ${s}/100 → ${action}.`;
        return `Both methods agree on ${action}. Averaged conviction ${s}/100.`;
    }
    if (llmAct) return `Only the LLM has scored this stock — ${action} at ${s}/100. Python hasn't run yet.`;
    if (pyAct)  return `Only Python has scored this stock — ${action} at ${s}/100. The LLM hasn't run yet.`;
    return `${action}. No method has scored this stock yet.`;
}

// API row (snake_case, from SQL) → the camelCase shape the render code expects.
// Field source, per backend/routers/all_stocks.py's SELECT on stock_analysis:
//   llmBias/llmScore/llmAction  <- overall_bias_label / overall_bias_score / short_term_action
//     (llm_bias / llm_score / llm_action are commented out in db_schema/stock_analysis.sql —
//      reading those names here would silently pull undefined on every row)
//   pythonScore/pythonAction    <- python_score / python_action, unchanged
//   techScore/fundScore/flowScore/rawSignals/pythonReasoning — not in the SELECT list
//     at all yet, so these stay null until the endpoint is extended to return them.
function mapStockRow(r) {
    return {
        symbol:       r.nse_symbol,
        name:         r.company_name,
        sector:       r.sector || 'Undefined',
        industry:     r.industry || '—',
        isin:         r.isin,
        marketCap:    fmtMarketCap(r.market_cap),
        price:        r.price,
        change:       r.day_change_pct,
        llmBias:      r.overall_bias_label ?? null,
        llmScore:     r.overall_bias_score ?? null,
        llmAction:    r.short_term_action  ?? null,
        pythonScore:  r.python_score ?? null,
        pythonAction: r.python_action ?? null,
        // Raw-pipeline detail — not yet selected by /all_stocks/stocks, so null
        // until that endpoint's SELECT is extended.
        techScore:    r.tech_score    ?? null,
        fundScore:    r.fund_score    ?? null,
        flowScore:    r.flow_score    ?? null,
        rawSignals:   r.raw_signals   ?? null,
        pythonReasoning: r.python_reasoning ?? null,
        llmReasoning:    normLlmReasoning(r.llm_reasoning),
        combinedAction: r.combined_action ?? null,
        combinedScore:  r.combined_score  ?? null,
        analysisDate: r.analysis_date,
        // Column the `stocks` table carries but the list query only uses in the dialog.
        summary:   r.business_summary || 'No business summary available.',
    };
}

let allStocksFetchFailed = false;   // true when the most recent fetch errored, for the empty state

// Fetch one page from the API and append to `allStocks`.
// `reset` starts a fresh list (new sector, or first entry into the view).
async function fetchStocksPage(reset = false) {
    if (reset) { allStocks = []; allStocksOffset = 0; allStocksMore = true; }
    if (!allStocksMore) return;
    try {
        const rows = await api.stocks(allStocksOffset, STOCKS_FETCH_SIZE, currentSector);
        allStocks.push(...rows.map(mapStockRow));
        allStocksOffset += rows.length;
        allStocksMore = rows.length === STOCKS_FETCH_SIZE;
        allStocksLive = true;
        allStocksFetchFailed = false;
    } catch (err) {
        console.warn('Stock fetch failed:', err.message);
        allStocksFetchFailed = true;
    }
}

// Live rows only — no mock fallback. Client-side search filters this.
let stockSearchTerm = '';
function stocksSource() {
    if (!stockSearchTerm) return allStocks;
    const q = stockSearchTerm.toLowerCase();
    return allStocks.filter(s => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q));
}

function onStockSearch(value) {
    stockSearchTerm = value.trim();
    renderAllStocks();
}

function stockCard(s) {
    const biasBadge = s.llmBias
        ? `<span class="text-xs font-medium px-2 py-0.5 rounded-full ${biasColor(s.llmBias)} shrink-0 ml-2">${s.llmBias}</span>`
        : `<span class="text-xs font-medium px-2 py-0.5 rounded-full text-slate-400 bg-slate-50 shrink-0 ml-2">No analysis</span>`;
    return `
        <div onclick="openDialog('${escAttr(s.symbol)}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md rounded-xl p-5 cursor-pointer transition">
            <div class="flex items-start justify-between mb-3">
                <div class="min-w-0 flex-1">
                    <div class="font-semibold text-slate-900 truncate">${s.name}</div>
                    <div class="text-xs text-slate-400 mt-0.5">${s.symbol.replace('.NS','')}</div>
                </div>
                ${biasBadge}
            </div>
            <div class="text-xs text-slate-500 mb-3">${s.sector} · ${s.industry}</div>
            <div class="flex items-baseline justify-between pt-3 border-t border-slate-100">
                <div>
                    <div class="text-lg font-semibold text-slate-900">${fmtPrice(s.price)}</div>
                    <div class="text-xs ${changeColor(s.change)} mt-0.5">${fmtChange(s.change)}</div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-slate-400">Conviction</div>
                    <div class="text-sm font-semibold text-sky-600">${fmtScore(s.llmScore)}</div>
                </div>
            </div>
        </div>
    `;
}

// Start over from the first page (called on every entry into the view).
function renderAllStocks() {
    allStocksShown = 0;
    document.getElementById('all-stocks-grid').innerHTML = '';
    appendStockPage();
}

// Append the next page to whatever is already on screen.
function appendStockPage() {
    const src = stocksSource();
    const next = src.slice(allStocksShown, allStocksShown + ALL_STOCKS_PAGE_SIZE);
    const grid = document.getElementById('all-stocks-grid');
    if (!src.length) {
        grid.innerHTML = allStocksFetchFailed
            ? emptyState('Could not reach GET /v1/all_stocks/stocks — is the backend running?')
            : stockSearchTerm
                ? emptyState(`No stock matches "${stockSearchTerm}".`)
                : emptyState('No active stocks found in the database.');
    } else {
        grid.insertAdjacentHTML('beforeend', next.map(stockCard).join(''));
    }
    allStocksShown += next.length;
    updateLoadMore();
}

// Reveals the next batch; pulls another page from the API first if we've
// run out of locally-buffered rows and the server still has more.
async function loadMoreStocks() {
    if (allStocksShown >= allStocks.length && allStocksMore) {
        await fetchStocksPage();
    }
    appendStockPage();
}

// Keep the counter honest and hide the button once the list is exhausted.
function updateLoadMore() {
    const total = stocksSource().length;
    const btn = document.getElementById('load-more-btn');
    const done = allStocksShown >= total && !(allStocksMore && !stockSearchTerm);
    const sub = document.getElementById('all-stocks-subtitle');
    if (sub) sub.textContent = allStocksLive ? `${total}${allStocksMore && !stockSearchTerm ? '+' : ''} stocks tracked` : 'Loading…';
    document.getElementById('all-stocks-count').textContent =
        `Showing ${allStocksShown} of ${total}${allStocksMore && !stockSearchTerm ? '+' : ''} stocks`;
    btn.classList.toggle('hidden', done);
}

// Sector dropdown → refetch from the server, then re-render from page one.
async function onSectorChange(value) {
    currentSector = value || '';
    renderSectorCheck(currentSector);
    await fetchStocksPage(true);
    renderAllStocks();
}

// Small banner under the sector filter: how many of yesterday's combined
// predictions in this sector turned out correct once today's close arrived.
// Hidden when "All sectors" is selected.
async function renderSectorCheck(sector) {
    const banner = document.getElementById('sector-check-banner');
    if (!banner) return;
    if (!sector) { banner.classList.add('hidden'); banner.innerHTML = ''; return; }

    banner.classList.remove('hidden');
    banner.innerHTML = `
        <div class="flex items-center gap-2 text-sm text-slate-500">
            <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
            Checking yesterday's ${escAttr(sector)} predictions…
        </div>`;

    try {
        const d = await api.sectorCheck(sector);
        if (!d.predictions_made) {
            banner.innerHTML = `
                <div class="inline-flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <span>${escAttr(sector)}</span> · No evaluated predictions yet.
                </div>`;
            return;
        }
        const pct = d.accuracy_pct ?? 0;
        const color = pct >= 60 ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                      : pct >= 40 ? 'text-amber-600 bg-amber-50 border-amber-100'
                      : 'text-rose-600 bg-rose-50 border-rose-100';
        const date = d.last_evaluated_date ? fmtDateShort(d.last_evaluated_date) : '—';
        banner.innerHTML = `
            <div class="inline-flex items-center gap-3 text-sm ${color} border rounded-lg px-3 py-2">
                <span class="font-medium">${escAttr(sector)} predictions</span>
                <span class="text-slate-400">·</span>
                <span>${d.correct_predictions}/${d.predictions_made} correct (${pct}%)</span>
                <span class="text-slate-400">·</span>
                <span class="text-xs text-slate-500">evaluated ${date}</span>
            </div>`;
    } catch (err) {
        console.warn('Sector check failed:', err.message);
        banner.innerHTML = `
            <div class="inline-flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                ${escAttr(sector)} · prediction check unavailable
            </div>`;
    }
}

// ----- View switching -----
function hideAllViews() {
    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('all-stocks-view').classList.add('hidden');
    document.getElementById('top-recs-view').classList.add('hidden');
    document.getElementById('watchlist-view').classList.add('hidden');
    document.getElementById('commodities-view').classList.add('hidden');
}
async function showAllStocks() {
    hideAllViews();
    document.getElementById('all-stocks-view').classList.remove('hidden');
    window.scrollTo(0, 0);
    stockSearchTerm = '';
    const search = document.getElementById('all-stocks-search');
    if (search) search.value = '';
    await fetchStocksPage(true);
    renderAllStocks();
}
function showHome() {
    hideAllViews();
    document.getElementById('home-view').classList.remove('hidden');
    window.scrollTo(0, 0);
}
function showWatchlist() {
    hideAllViews();
    document.getElementById('watchlist-view').classList.remove('hidden');
    renderWatchlist();
    window.scrollTo(0, 0);
}
function showTopRecs() {
    hideAllViews();
    document.getElementById('top-recs-view').classList.remove('hidden');
    renderTopRecs();
    renderActiveRecs();           // populate Active Calls tab in background
    showTopRecsTab('top-picks');  // default to first tab
    window.scrollTo(0, 0);
}

function showTopRecsTab(tab) {
    const tabTop    = document.getElementById('tab-top-picks');
    const tabActive = document.getElementById('tab-active-calls');
    const contTop    = document.getElementById('top-picks-content');
    const contActive = document.getElementById('active-calls-content');

    // base classes for inactive
    const inactiveCls = 'px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 -mb-px transition';
    const activeCls   = 'px-4 py-2.5 text-sm font-medium border-b-2 border-sky-500 text-sky-600 -mb-px transition';

    // Real counts, not a hardcoded number: however many cards renderTopRecs()/
    // renderActiveRecs() actually put in the list.
    const topPicksCount = document.getElementById('top-recs-list')?.children.length ?? 0;
    const activeCount   = document.getElementById('active-recs-list')?.children.length ?? 0;
    // re-append the count spans every time — innerHTML below replaces them
    tabTop.innerHTML    = `Today's Top Picks <span id="top-picks-count" class="ml-1 text-xs text-slate-400">${topPicksCount}</span>`;
    tabActive.innerHTML = `Active Calls <span id="active-count" class="ml-1 text-xs text-slate-400">${activeCount}</span>`;

    if (tab === 'top-picks') {
        tabTop.className    = activeCls;
        tabActive.className = inactiveCls;
        contTop.classList.remove('hidden');
        contActive.classList.add('hidden');
    } else {
        tabTop.className    = inactiveCls;
        tabActive.className = activeCls;
        contTop.classList.add('hidden');
        contActive.classList.remove('hidden');
    }
}

// ----- Add-to-watchlist modal -----
let pendingAddSymbol = null;
function openAddToWatchlist(symbol, name, currentPrice) {
    if (symbol) {
        pendingAddSymbol = symbol;
        document.getElementById('add-watchlist-stock').textContent = `${name} · ${symbol}`;
        document.getElementById('add-watchlist-price').value = currentPrice || '';
    } else {
        pendingAddSymbol = null;
        document.getElementById('add-watchlist-stock').textContent = 'Select a stock from All Stocks first, then add it from there.';
    }
    const overlay = document.getElementById('add-watchlist-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}
function closeAddToWatchlist() {
    const overlay = document.getElementById('add-watchlist-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
}
function confirmAddToWatchlist() {
    const date = document.getElementById('add-watchlist-date').value;
    const price = document.getElementById('add-watchlist-price').value;
    const qty = document.getElementById('add-watchlist-qty').value;
    // In real app: POST /user/watchlist with { symbol, entry_date, entry_price, qty }
    alert(`✓ Added to watchlist:\n${pendingAddSymbol}\nEntry: ${date} @ ₹${price}\nQty: ${qty}`);
    closeAddToWatchlist();
}

// Symbol lookup shared by every modal/dialog opener. Checks the home ranking
// universe first, then whatever the All Stocks view has paged in — between the
// two, every card actually on screen resolves without a second network call.
const findStock = (symbol) => rankRows.find(x => x.symbol === symbol) || allStocks.find(x => x.symbol === symbol) || null;

// ----- Render Top Recommendations -----
// Top picks where Combined score > 65 with both Python and LLM agreeing on BUY
function renderTopRecs() {
    const list = document.getElementById('top-recs-list');
    const dateBadge = document.getElementById('top-recs-date');
    if (!rankLoaded) { list.innerHTML = emptyState('Loading…'); return; }
    if (rankError) { list.innerHTML = emptyState('Could not reach GET /v1/all_stocks/stocks — no picks to show.'); return; }

    // Filter stocks with high combined conviction and bullish action
    const candidates = scoredStocks().filter(s =>
        (s.combinedAction === 'BUY' || s.combinedAction === 'MIXED-BUY') &&
        s.combinedScore >= 60
    ).slice(0, TOP_PICKS_COUNT);

    // Newest analysis_date actually behind these picks (ISO strings sort lexically) —
    // shown only once real analysis rows exist, never a placeholder date.
    if (dateBadge) {
        const newest = rankRows.map(s => s.analysisDate).filter(Boolean).sort().at(-1);
        dateBadge.textContent = newest || '';
        dateBadge.classList.toggle('hidden', !newest);
    }

    document.getElementById('top-picks-count').textContent = candidates.length;

    if (!candidates.length) {
        list.innerHTML = emptyState('No stock currently meets the BUY + combined score ≥ 60 threshold.');
        return;
    }

    list.innerHTML = candidates.map((s, idx) => `
        <div onclick="openDrawer('${escAttr(s.symbol)}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-sm rounded-xl p-5 cursor-pointer transition">
            <div class="grid grid-cols-12 gap-4 items-start">
                <!-- Rank + Stock -->
                <div class="col-span-1">
                    <div class="w-9 h-9 bg-gradient-to-br from-sky-100 to-teal-100 rounded-lg flex items-center justify-center text-sm font-bold text-sky-700">
                        #${idx + 1}
                    </div>
                </div>
                <div class="col-span-5">
                    <div class="font-semibold text-slate-900">${s.name}</div>
                    <div class="text-xs text-slate-400 mt-0.5">${s.symbol.replace('.NS','')} · ${s.sector}</div>
                </div>
                <!-- Combined chip -->
                <div class="col-span-2 flex flex-col items-start gap-1">
                    <div class="flex items-center gap-1.5">
                        <span class="text-xs font-semibold px-2.5 py-1 rounded-md border ${combinedColor(s.combinedAction)}">${s.combinedAction}</span>
                        <span class="text-xs text-slate-600 font-semibold">${s.combinedScore}</span>
                    </div>
                    <span class="text-[10px] text-slate-400 uppercase tracking-wide">${s.combinedMixed ? 'Methods diverge' : 'Both methods agree'}</span>
                </div>
                <!-- Price -->
                <div class="col-span-2 text-right">
                    <div class="text-lg font-semibold">${fmtPrice(s.price)}</div>
                    <div class="text-xs ${changeColor(s.change)} mt-0.5">${fmtChange(s.change)}</div>
                </div>
                <!-- Quick add -->
                <div class="col-span-2 text-right">
                    <button onclick="event.stopPropagation(); openAddToWatchlist('${escAttr(s.symbol)}', '${escAttr(s.name)}', ${s.price ?? 'null'})" class="text-xs font-medium text-sky-700 hover:text-sky-900 hover:bg-sky-50 px-3 py-1.5 rounded-md transition">
                        + Watchlist
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ----- Centered modal (LLM vs Raw analysis based on source) -----
function openDrawer(symbol, source) {
    source = source || 'llm';
    const s = findStock(symbol);
    if (!s) return;
    const content = (source === 'raw' || source === 'python')
        ? renderRawDrawer(s)
        : renderLlmDrawer(s);
    document.getElementById('drawer-content').innerHTML = content;
    const overlay = document.getElementById('drawer-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

function closeDrawer() {
    closeHoldPopover();
    const overlay = document.getElementById('drawer-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
}

// ===== LLM-focused drawer: narrative analysis from the cached LLM output =====
// risks / llm_reasoning aren't selected by /all_stocks/stocks yet (see comboChip's
// note above), so this renders only what the row actually carries.
function renderLlmDrawer(s) {
    const hasBias = s.llmBias != null && s.llmScore != null;
    return `
        <div class="text-xs text-slate-400 mb-2">${s.symbol}</div>
        <h2 class="text-2xl font-bold tracking-tight">${s.name}</h2>
        <p class="text-sm text-slate-500 mt-1 mb-6">${s.sector} · ${s.industry}</p>

        <div class="flex items-baseline gap-3 mb-6">
            <span class="text-3xl font-bold">${fmtPrice(s.price)}</span>
            <span class="text-sm font-medium ${changeColor(s.change)}">${fmtChange(s.change)} today</span>
        </div>

        <!-- LLM Analysis card -->
        <div class="bg-gradient-to-br from-sky-50 to-teal-50 border border-sky-100 rounded-2xl p-5 mb-4">
            <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-semibold text-sky-700 uppercase tracking-wide">LLM Analysis</span>
                ${s.analysisDate ? `<span class="text-xs text-slate-500">${escAttr(s.analysisDate)}</span>` : ''}
            </div>
            ${hasBias ? `
            <div class="flex items-center gap-3 mb-4 flex-wrap">
                <span class="text-xs font-medium px-2.5 py-1 rounded-full ${biasColor(s.llmBias)}">${s.llmBias}</span>
                <span class="text-xs font-medium px-2.5 py-1 rounded border ${actionColor(s.llmAction)}">${s.llmAction}</span>
                ${s.llmAction === 'HOLD' ? holdPill(s.hold_duration_days, s.hold_duration_label, s.hold_duration_reason, 'card') : ''}
                <span class="text-xs text-slate-500">Conviction <span class="font-semibold text-slate-900">${(s.llmScore*100).toFixed(0)}/100</span></span>
            </div>
            <p class="text-sm text-slate-700 leading-relaxed">${s.llmReasoning?.synthesis || 'No stored synthesis for this call yet.'}</p>
            ` : `<p class="text-sm text-slate-500">No LLM analysis for this stock yet — stock_analysis has no row with an overall_bias_score.</p>`}
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="openAddToWatchlist('${escAttr(s.symbol)}', '${escAttr(s.name)}', ${s.price ?? 'null'})" class="flex-1 px-4 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 font-medium rounded-lg transition">
                + Add to watchlist
            </button>
            <button onclick="openDrawer('${escAttr(s.symbol)}', 'raw')" class="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition">
                View raw data →
            </button>
        </div>
    `;
}

// ===== Raw drawer: deterministic numbers + rule-based interpretation =====
// techScore/fundScore/flowScore/rawSignals/pythonReasoning aren't selected by
// /all_stocks/stocks yet (see mapStockRow's comment), so every technical/
// fundamental row below shows "—" until that endpoint returns them — no
// value here is ever computed from pythonScore or Math.random() as a stand-in.
function renderRawDrawer(s) {
    const py = s.pythonScore;
    const sig = s.rawSignals || {};

    // Helpers for interpretation badges — only rendered when the underlying value exists.
    const interp = (text, kind = 'neutral') => {
        const colors = {
            bull: 'text-emerald-700 bg-emerald-50',
            bear: 'text-rose-700 bg-rose-50',
            neutral: 'text-slate-600 bg-slate-100',
        };
        return `<span class="text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[kind]}">${text}</span>`;
    };

    const rsiInterp = sig.rsi_14 == null ? '' : sig.rsi_14 > 70 ? interp('Overbought', 'bear')
                    : sig.rsi_14 < 30 ? interp('Oversold', 'bear')
                    : sig.rsi_14 >= 55 ? interp('Bullish', 'bull')
                    : interp('Neutral', 'neutral');
    const emaInterp = (ema) => (ema == null || s.price == null) ? ''
        : s.price > ema ? interp('Above · Bullish', 'bull') : interp('Below · Bearish', 'bear');
    const peInterp = sig.pe == null ? '' : sig.pe < 20 ? interp('Cheap', 'bull') : sig.pe < 30 ? interp('Fair', 'neutral') : interp('Expensive', 'bear');
    const roceInterp = sig.roce == null ? '' : sig.roce > 15 ? interp('High quality', 'bull') : sig.roce > 8 ? interp('Moderate', 'neutral') : interp('Weak', 'bear');
    const deInterp = sig.debt_to_equity == null ? '' : sig.debt_to_equity < 0.5 ? interp('Low leverage', 'bull') : sig.debt_to_equity < 1.0 ? interp('Moderate', 'neutral') : interp('Leveraged', 'bear');
    const marginInterp = sig.operating_margin == null ? '' : sig.operating_margin > 12 ? interp('Strong', 'bull') : sig.operating_margin > 6 ? interp('Average', 'neutral') : interp('Weak', 'bear');
    const revInterp = sig.revenue_growth == null ? '' : sig.revenue_growth > 12 ? interp('Strong', 'bull') : sig.revenue_growth > 4 ? interp('Average', 'neutral') : interp('Weak', 'bear');

    const rowHTML = (label, value, badge) => `
        <div class="grid grid-cols-12 items-center py-2.5 border-b border-slate-100 last:border-0">
            <span class="col-span-5 text-sm text-slate-600">${label}</span>
            <span class="col-span-3 text-sm font-semibold text-slate-900">${value ?? '—'}</span>
            <span class="col-span-4 text-right">${badge}</span>
        </div>
    `;
    const scoreBar = (label, v) => `
        <div>
            <div class="flex items-center justify-between text-xs mb-1"><span class="text-slate-600">${label}</span><span class="font-semibold text-slate-900">${v == null ? '—' : v + '/100'}</span></div>
            <div class="h-1.5 bg-white rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-sky-400 to-teal-400" style="width:${v ?? 0}%"></div></div>
        </div>`;

    return `
        <div class="text-xs text-slate-400 mb-2">${s.symbol}</div>
        <h2 class="text-2xl font-bold tracking-tight">${s.name}</h2>
        <p class="text-sm text-slate-500 mt-1 mb-6">${s.sector} · ${s.industry}</p>

        <div class="flex items-baseline gap-3 mb-6">
            <span class="text-3xl font-bold">${fmtPrice(s.price)}</span>
            <span class="text-sm font-medium ${changeColor(s.change)}">${fmtChange(s.change)} today</span>
        </div>

        <!-- Raw Analysis card -->
        <div class="bg-white border-2 border-sky-100 rounded-2xl p-5 mb-4">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-semibold text-sky-700 uppercase tracking-wide">Raw Analysis</span>
                <span class="text-xs text-slate-500">Rule-based · ${s.analysisDate || 'no analysis yet'}</span>
            </div>

            <!-- Technical signals -->
            <h4 class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Technical Signals</h4>
            <div class="mb-4">
                ${rowHTML('RSI (14)', sig.rsi_14, rsiInterp)}
                ${rowHTML('20D EMA', sig.ema_20 == null ? null : '₹' + sig.ema_20.toLocaleString('en-IN'), emaInterp(sig.ema_20))}
                ${rowHTML('50D EMA', sig.ema_50 == null ? null : '₹' + sig.ema_50.toLocaleString('en-IN'), emaInterp(sig.ema_50))}
                ${rowHTML('200D EMA', sig.ema_200 == null ? null : '₹' + sig.ema_200.toLocaleString('en-IN'), emaInterp(sig.ema_200))}
                ${rowHTML('ATR (14)', sig.atr == null ? null : '₹' + sig.atr, sig.atr == null ? '' : interp('Normal vol', 'neutral'))}
            </div>

            <!-- Fundamental signals -->
            <h4 class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Fundamental Signals</h4>
            <div class="mb-4">
                ${rowHTML('PE Ratio', sig.pe == null ? null : sig.pe + 'x', peInterp)}
                ${rowHTML('ROCE', sig.roce == null ? null : sig.roce + '%', roceInterp)}
                ${rowHTML('Debt / Equity', sig.debt_to_equity == null ? null : sig.debt_to_equity + 'x', deInterp)}
                ${rowHTML('Operating Margin', sig.operating_margin == null ? null : sig.operating_margin + '%', marginInterp)}
                ${rowHTML('Revenue Growth YoY', sig.revenue_growth == null ? null : sig.revenue_growth + '%', revInterp)}
            </div>
        </div>

        <!-- Score breakdown -->
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Score Breakdown</span>
                <span class="text-xs text-slate-500">Composite</span>
            </div>
            <div class="space-y-3">
                ${scoreBar('Technical', s.techScore)}
                ${scoreBar('Fundamental', s.fundScore)}
                ${scoreBar('Flow', s.flowScore)}
                <div class="pt-3 mt-2 border-t border-slate-200 flex items-center justify-between">
                    <span class="text-sm font-semibold text-slate-900">Total</span>
                    <span class="text-lg font-bold text-sky-700">${py == null ? '—' : py + '/100'}</span>
                </div>
            </div>
        </div>

        <!-- Rule-based reasoning -->
        <div class="mb-5">
            <h3 class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">${py == null ? 'Why this scores what it does' : `Why this scores ${py}/100`}</h3>
            <p class="text-sm text-slate-700 leading-relaxed">${s.pythonReasoning || 'No stored reasoning for this call yet.'}</p>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="openAddToWatchlist('${escAttr(s.symbol)}', '${escAttr(s.name)}', ${s.price ?? 'null'})" class="flex-1 px-4 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 font-medium rounded-lg transition">
                + Add to watchlist
            </button>
            <button onclick="openDrawer('${escAttr(s.symbol)}', 'llm')" class="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition">
                View LLM analysis →
            </button>
        </div>
    `;
}

// "2026-06-20" -> "20 Jun". Manual split, same reasoning as fmtAsOf below:
// new Date(iso) parses as UTC and can shift the day.
function fmtDateShort(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// Combine a Python call and an LLM call into one verdict. Prefers the DB's own
// combined_action/combined_score once a pipeline writes them (it doesn't yet);
// falls back to deriving it here, and shows whichever single method ran when
// only one did.
function combinedFor(pyAct, pyScore, llmAct, llmScore100, dbAction, dbScore) {
    if (dbScore != null && dbAction) return { action: dbAction, score: Math.round(dbScore), mixed: false };
    if (pyAct && llmAct && pyScore != null && llmScore100 != null) {
        return combineDecisions(pyAct, pyScore, llmAct, llmScore100);
    }
    return { action: llmAct || pyAct || null, score: llmScore100 ?? pyScore ?? null, mixed: false };
}

// ----- Dialog (all-stocks card detail) -----
// Metadata + history both come from GET /v1/all_stocks/card/{stock} — real
// history rows from stock_analysis, not generated ones. The findStock() lookup
// only supplies an instant header while that request is in flight.
function dialogHeader(symbol, name, sector, industry) {
    return `
        <div class="flex justify-between items-start mb-6">
            <div>
                <h2 class="text-2xl font-bold tracking-tight">${escAttr(name)}</h2>
                <p class="text-sm text-slate-500 mt-1">${escAttr(symbol)}${sector ? ` · ${escAttr(sector)} · ${escAttr(industry)}` : ''}</p>
            </div>
            <button onclick="closeDialog()" class="text-slate-400 hover:text-slate-900 text-xl leading-none">✕</button>
        </div>
    `;
}

async function openDialog(symbol) {
    const cached = findStock(symbol);
    document.getElementById('dialog-content').innerHTML =
        dialogHeader(symbol, cached?.name || symbol, cached?.sector, cached?.industry)
        + emptyState('Loading…');
    document.getElementById('dialog-overlay').classList.remove('hidden');
    document.getElementById('dialog-overlay').classList.add('flex');

    let card;
    try {
        card = await api.stockCard(symbol);
    } catch (err) {
        console.warn('Stock card fetch failed:', err.message);
        document.getElementById('dialog-content').innerHTML =
            dialogHeader(symbol, cached?.name || symbol, cached?.sector, cached?.industry)
            + emptyState(`Could not reach GET /v1/all_stocks/card/${symbol}.`);
        return;
    }

    const m = card.metadata;
    const history = card.history || [];
    document.getElementById('dialog-content').innerHTML = `
        ${dialogHeader(m.nse_symbol, m.company_name, m.sector, cached?.industry)}

        <!-- Metadata grid -->
        <div class="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
            <div>
                <div class="text-xs text-slate-400 uppercase tracking-wide mb-1">Market Cap</div>
                <div class="font-semibold">${escAttr(m.market_cap)}</div>
            </div>
            <div>
                <div class="text-xs text-slate-400 uppercase tracking-wide mb-1">Current Price</div>
                <div class="font-semibold">${fmtPrice(m.current_price)}</div>
            </div>
            <div>
                <div class="text-xs text-slate-400 uppercase tracking-wide mb-1">ISIN</div>
                <div class="font-medium text-slate-700 text-xs">${m.ISIN || '—'}</div>
            </div>
            <div>
                <div class="text-xs text-slate-400 uppercase tracking-wide mb-1">Latest analysis</div>
                <div class="font-medium text-slate-700 text-xs">${m.date || 'None yet'}</div>
            </div>
        </div>

        <!-- Business summary -->
        <div class="mb-6">
            <div class="text-xs text-slate-400 uppercase tracking-wide mb-2">About</div>
            <p class="text-sm text-slate-700 leading-relaxed">${m.about || 'No business summary available.'}</p>
        </div>

        <!-- Analysis history — real rows from stock_analysis -->
        <div class="mb-6">
            <div class="text-xs text-slate-400 uppercase tracking-wide mb-3">Recent Analysis History</div>
            <div class="space-y-2">
                ${renderHistoryRows(history)}
            </div>
        </div>

        <div class="flex gap-3 pt-4 border-t border-slate-100">
            <button id="dialog-expand-btn" onclick="toggleDialogExpansion('${escAttr(m.nse_symbol)}')" class="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition">
                View full analysis ▼
            </button>
            <button onclick="openAddToWatchlist('${escAttr(m.nse_symbol)}', '${escAttr(m.company_name)}', ${m.current_price ?? 'null'})" class="px-4 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-lg transition">
                Add to watchlist
            </button>
        </div>

        <!-- Expansion target — full analysis renders inline here when expanded -->
        <div id="dialog-expanded" class="hidden mt-6 pt-6 border-t-2 border-dashed border-slate-200 space-y-6"></div>
    `;
}

// Real history rows: one per stock_analysis row for this symbol, newest first
// (the SQL already orders that way). No row is generated or jittered.
function renderHistoryRows(history) {
    if (!history.length) {
        return emptyState('No analysis history yet for this stock — stock_analysis has no rows.');
    }

    const header = `
        <div class="grid grid-cols-12 gap-2 px-3 pb-2 mb-1 border-b border-slate-100">
            <span class="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</span>
            <span class="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Python</span>
            <span class="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">LLM</span>
            <span class="col-span-3 text-xs font-semibold text-sky-600 uppercase tracking-wide">Combined</span>
            <span class="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Actual</span>
            <span class="col-span-1 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">✓/✗</span>
        </div>
    `;

    const rows = history.map((r, i) => {
        const pyAct  = r.python_action;
        const pyScore = r.python_score == null ? null : Math.round(r.python_score);
        const llmAct = r.short_term_action;
        const llmScore100 = r.overall_bias_score == null ? null : Math.round(r.overall_bias_score * 100);
        const combined = combinedFor(pyAct, pyScore, llmAct, llmScore100, r.combined_action, r.combined_score);

        // matched is a real DB column ('true'/'false'/'pending'), never recomputed.
        const matchBadge = r.matched === 'true'
            ? `<span class="text-sm font-bold text-emerald-600" title="${escAttr(matchTitle(combined.action, true))}">✓</span>`
            : r.matched === 'false'
            ? `<span class="text-sm font-bold text-rose-500" title="${escAttr(matchTitle(combined.action, false))}">✗</span>`
            : `<span class="text-xs font-medium px-2 py-0.5 rounded-full text-amber-700 bg-amber-50 inline-flex items-center gap-1.5">
                   <span class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>Pending
               </span>`;

        const actualPct = r.actual_close_pct;
        const actualColor = actualPct == null ? 'text-slate-400 bg-slate-50'
            : actualPct > 0.5 ? 'text-emerald-700 bg-emerald-50'
            : actualPct < -0.5 ? 'text-rose-700 bg-rose-50'
            : 'text-slate-600 bg-slate-100';

        return `
            <div class="grid grid-cols-12 gap-2 items-center py-2.5 px-3 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'} rounded-lg">
                <span class="col-span-2 text-xs font-medium text-slate-600">${fmtDateShort(r.analysis_date)}</span>
                <div class="col-span-2 flex items-center gap-1">
                    ${pyAct ? `<span class="text-xs font-medium px-2 py-0.5 rounded border ${actionColor(pyAct)}">${pyAct}</span><span class="text-xs text-slate-400">${pyScore ?? '—'}</span>` : '<span class="text-xs text-slate-300">—</span>'}
                </div>
                <div class="col-span-2 flex items-center gap-1">
                    ${llmAct ? `<span class="text-xs font-medium px-2 py-0.5 rounded border ${actionColor(llmAct)}">${llmAct}</span><span class="text-xs text-slate-400">${llmScore100 ?? '—'}</span>` : '<span class="text-xs text-slate-300">—</span>'}
                </div>
                <div class="col-span-3 flex items-center gap-1.5">
                    ${combined.action ? comboChip(combined.action, llmAct, pyAct, {}, null, combined.score, combined.mixed) : '<span class="text-xs text-slate-300">—</span>'}
                    <span class="text-xs text-slate-600 font-semibold">${combined.score ?? ''}</span>
                </div>
                <div class="col-span-2">
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full ${actualColor}">${actualPct == null ? '—' : `${actualPct > 0 ? '+' : ''}${actualPct}%`}</span>
                </div>
                <div class="col-span-1 text-right">${matchBadge}</div>
            </div>
        `;
    }).join('');

    return header + rows;
}

// ----- Inline full-analysis expansion within the dialog -----
// GET /v1/all_stocks/card/{stock}/full_analysis is a stub that returns {} —
// nothing to render yet, so this states that plainly instead of fabricating
// trade setups, reasoning paragraphs or a news list.
function toggleDialogExpansion(symbol) {
    const expanded = document.getElementById('dialog-expanded');
    const btn = document.getElementById('dialog-expand-btn');
    if (expanded.classList.contains('hidden')) {
        expanded.innerHTML = emptyState(
            `Full analysis isn't available yet — GET /v1/all_stocks/card/${symbol}/full_analysis is not implemented on the backend.`);
        expanded.classList.remove('hidden');
        btn.innerHTML = 'Hide full analysis ▲';
        setTimeout(() => expanded.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } else {
        expanded.classList.add('hidden');
        expanded.innerHTML = '';
        btn.innerHTML = 'View full analysis ▼';
    }
}

function closeDialog() {
    closeHoldPopover();
    document.getElementById('dialog-overlay').classList.add('hidden');
    document.getElementById('dialog-overlay').classList.remove('flex');
}

// ----- Helpers for the combined-decision history table -----
// Uses both the actions AND the numeric scores. The average score informs the action;
// agreement (same action) signals high conviction, disagreement signals "Mixed".
function combineDecisions(pyAct, pyScore, llmAct, llmScore) {
    const avgScore = Math.round((pyScore + llmScore) / 2);

    // Direct conflict (BUY vs SELL) → neutral with high uncertainty
    if ((pyAct === 'BUY'  && llmAct === 'SELL') ||
        (pyAct === 'SELL' && llmAct === 'BUY'))  {
        return { action: 'MIXED', mixed: true, score: avgScore };
    }

    // Both agree on action → use it as-is, high conviction
    if (pyAct === llmAct) {
        return { action: pyAct, mixed: false, score: avgScore };
    }

    // One says HOLD, the other has direction → averaged score arbitrates
    if (avgScore > 65) return { action: 'MIXED-BUY',  mixed: true, score: avgScore };
    if (avgScore < 35) return { action: 'MIXED-SELL', mixed: true, score: avgScore };
    return { action: 'HOLD', mixed: true, score: avgScore };
}
const combinedColor = (a) => ({
    'BUY':        'text-emerald-700 bg-emerald-50 border-emerald-300',
    'SELL':       'text-rose-700 bg-rose-50 border-rose-300',
    'HOLD':       'text-slate-700 bg-slate-100 border-slate-300',
    'MIXED-BUY':  'text-emerald-700 bg-emerald-50/60 border-emerald-300 border-dashed',
    'MIXED-SELL': 'text-rose-700 bg-rose-50/60 border-rose-300 border-dashed',
    'MIXED':      'text-amber-700 bg-amber-50 border-amber-300 border-dashed',
}[a] || 'text-slate-500 bg-slate-50 border-slate-200');
// Clickable Combined chip — embeds the LLM + Python reasoning the DB actually
// has, plus the derived overall verdict, so a click can explain the call.
// mapStockRow maps llm_reasoning / python_reasoning; the /all_stocks/stocks
// SELECT now returns them, so the home Top Picks + rankings chips show real
// reasoning. The /card/{stock} history SELECT doesn't list them yet, so a
// history-table chip shows the verdict + "no stored reasoning" rather than
// inventing a sentence. `hold` (optional) carries the LLM hold window; it
// surfaces only when the LLM action was HOLD.
function comboChip(comboAction, llmAct, pyAct, s, hold, comboScore, comboMixed) {
    const llmReason = s.llmReasoning?.synthesis || null;
    const pyReason  = s.pythonReasoning || null;
    const holdLabel = (llmAct === 'HOLD' && hold && hold.reason)
        ? (hold.label || (hold.days != null ? `~${hold.days} days` : 'Undetermined'))
        : '';
    const holdAttr = holdLabel ? ` data-hold-label="${escAttr(holdLabel)}"` : '';
    return `<span class="combo-chip text-xs font-semibold px-2.5 py-1 rounded-md border ${combinedColor(comboAction)}" `
         + `onclick="openComboPopover(event, this)" title="Why ${comboAction}? — tap for reasoning" `
         + `data-combo-action="${escAttr(comboAction)}" `
         + `data-combo-score="${comboScore ?? ''}" data-combo-mixed="${comboMixed ? '1' : ''}" `
         + `data-llm-act="${escAttr(llmAct)}" data-llm-reason="${escAttr(llmReason)}" `
         + `data-py-act="${escAttr(pyAct)}" data-py-reason="${escAttr(pyReason)}"${holdAttr}>${comboAction}</span>`;
}
// Human-readable explanation for the ✓/✗ badge tooltip. `matched` here is the
// DB's own stored true/false (see stock_analysis.matched) — it is never
// recomputed client-side from a simulated price move.
function matchTitle(combinedAct, matched) {
    if (combinedAct === 'HOLD' || combinedAct === 'MIXED') {
        return matched
            ? 'Held through a gain/flat — no loss taken'
            : 'Held into a decline — should have exited';
    }
    if (combinedAct === 'BUY' || combinedAct === 'MIXED-BUY') {
        return matched
            ? 'Bought ahead of a gain — call paid off'
            : 'Bought ahead of a decline — call missed';
    }
    return matched
        ? 'Sold ahead of a decline — avoided the drop'
        : 'Sold ahead of a gain — exited too early';
}

// ----- Render Active Recommendations -----
// Active Calls has no backing endpoint (backend/routers/top_picks.py is empty,
// same as watchlist.py) and needs data no table carries yet — an entry date/price
// for a call, mirroring the user_holdings gap the Watchlist build-notes describe.
// Left on mock-data.js under the same exception as Watchlist until that lands.
// For mock purposes: pick stocks with BUY/SELL action, simulate entry date + horizon
const horizonDays = { 'intraday': 1, 'swing': 10, 'positional': 45, 'long': 180 };
const horizonLabel = { 'intraday': 'Intraday', 'swing': 'Swing (5–10d)', 'positional': 'Positional (1–3m)', 'long': 'Long (3–12m)' };

function buildActiveRecs() {
    // pick stocks with an actionable signal, generate plausible entry data
    const actionables = stocks.filter(s => s.llmAction === 'BUY' || s.llmAction === 'SELL');
    return actionables.map((s, i) => {
        // assign a horizon — distribute across types
        const horizons = ['swing', 'swing', 'positional', 'positional', 'long', 'swing', 'positional', 'long'];
        const horizon = horizons[i % horizons.length];
        const totalDays = horizonDays[horizon];
        // entry date was N days ago (random within horizon range)
        const daysElapsed = Math.floor(Math.random() * (totalDays * 0.7)) + 1;
        const daysLeft = totalDays - daysElapsed;
        // simulated % move since entry
        const sinceEntryPct = +((Math.random() * 8) - 3).toFixed(2);
        // entry date display
        const today = new Date('2026-06-21');
        const entryDate = new Date(today);
        entryDate.setDate(today.getDate() - daysElapsed);
        const entryStr = entryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        return { ...s, horizon, totalDays, daysElapsed, daysLeft, sinceEntryPct, entryStr };
    });
}

function renderActiveRecs() {
    const recs = buildActiveRecs();
    document.getElementById('active-count').textContent = `${recs.length} active`;
    const list = document.getElementById('active-recs-list');
    list.innerHTML = recs.map(r => {
        const daysColor = r.daysLeft <= 2 ? 'text-amber-600 font-semibold' :
                          r.daysLeft <= 0 ? 'text-rose-600 font-semibold' :
                          'text-slate-700';
        const perfColor = changeColor(r.sinceEntryPct);
        const sign = r.sinceEntryPct >= 0 ? '+' : '';
        return `
            <div onclick="openDrawer('${r.symbol}')" class="grid grid-cols-12 gap-4 items-center px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition">
                <div class="col-span-4 min-w-0">
                    <div class="font-medium text-slate-900 truncate">${r.name}</div>
                    <div class="text-xs text-slate-400 mt-0.5">${r.symbol.replace('.NS','')} · entered ${r.entryStr}</div>
                </div>
                <div class="col-span-2">
                    <span class="text-xs font-medium px-2.5 py-1 rounded border ${actionColor(r.llmAction)}">${r.llmAction}</span>
                </div>
                <div class="col-span-2 text-sm text-slate-700">${horizonLabel[r.horizon]}</div>
                <div class="col-span-2 text-sm ${daysColor}">${r.daysLeft > 0 ? r.daysLeft + ' days' : 'Expires today'}</div>
                <div class="col-span-2 text-right">
                    <div class="text-sm font-semibold ${perfColor}">${sign}${r.sinceEntryPct}%</div>
                </div>
            </div>
        `;
    }).join('');
}

// ---- Color mapping for personalized actions ----
const personalizedActionColor = (a) => ({
    'HOLD':       'text-slate-700 bg-slate-100 border-slate-200',
    'WAIT':       'text-amber-700 bg-amber-50 border-amber-200',
    'BUY MORE':   'text-emerald-700 bg-emerald-50 border-emerald-200',
    'TRIM':       'text-sky-700 bg-sky-50 border-sky-200',
    'SELL':       'text-rose-700 bg-rose-50 border-rose-200',
    'CUT LOSSES': 'text-rose-700 bg-rose-50 border-rose-200',
}[a] || 'text-slate-600 bg-slate-50 border-slate-200');

function renderWatchlist() {
    const list = document.getElementById('watchlist-list');
    list.innerHTML = watchlist.map(w => {
        const pnlAbs = (w.currentPrice - w.entryPrice) * w.qty;
        const pnlPct = ((w.currentPrice - w.entryPrice) / w.entryPrice * 100);
        const pnlColor = pnlAbs >= 0 ? 'text-emerald-600' : 'text-rose-600';
        const pnlSign = pnlAbs >= 0 ? '+' : '';
        const remaining = w.actionDaysRemaining;
        const total = w.actionDaysTotal;
        const elapsed = total - remaining;
        const pct = (elapsed / total) * 100;
        const expired = remaining <= 0;
        const urgent = remaining > 0 && remaining <= 2;

        // horizon bar color tied to personalized action (not global)
        let barColor = 'from-sky-400 to-teal-400';
        if (['SELL','CUT LOSSES'].includes(w.personalizedAction)) barColor = 'from-rose-400 to-rose-500';
        else if (['BUY MORE'].includes(w.personalizedAction)) barColor = 'from-emerald-400 to-emerald-500';
        else if (w.personalizedAction === 'TRIM') barColor = 'from-sky-400 to-sky-500';
        else if (expired) barColor = 'from-amber-400 to-amber-500';

        // days remaining label
        let daysLabel;
        if (expired) daysLabel = `<span class="text-xs font-medium text-amber-600">Window expired</span>`;
        else if (urgent) daysLabel = `<span class="text-xs font-medium text-amber-600">${remaining} of ${total}d left</span>`;
        else daysLabel = `<span class="text-xs text-slate-500">${remaining} of ${total}d left</span>`;

        // global vs personalized — show alignment or divergence
        const divergent = w.llmAction !== w.personalizedAction &&
                          !(w.llmAction === 'HOLD' && w.personalizedAction === 'HOLD') &&
                          !(w.llmAction === 'BUY' && w.personalizedAction === 'BUY MORE') &&
                          !(w.llmAction === 'SELL' && ['SELL','CUT LOSSES'].includes(w.personalizedAction));

        return `
            <div onclick="openDrawer('${w.symbol}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-sm rounded-xl p-5 cursor-pointer transition">
                <!-- TOP ROW: stock + price + personalized action -->
                <div class="flex items-start justify-between mb-4 pb-4 border-b border-slate-100">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-semibold text-slate-900 truncate">${w.name}</span>
                            <span class="text-xs text-slate-400">${w.symbol.replace('.NS','')}</span>
                        </div>
                        <div class="text-xs text-slate-500">
                            ${w.qty} shares · entered ${w.entryDate} @ ₹${w.entryPrice.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div class="text-right ml-4 mr-6">
                        <div class="text-lg font-semibold">₹${w.currentPrice.toLocaleString('en-IN')}</div>
                        <div class="text-sm font-medium ${pnlColor}">${pnlSign}₹${Math.abs(pnlAbs).toLocaleString('en-IN')} (${pnlSign}${pnlPct.toFixed(1)}%)</div>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-semibold px-3 py-1.5 rounded-md border ${personalizedActionColor(w.personalizedAction)}">${w.personalizedAction}</span>
                        <div class="mt-1.5">${daysLabel}</div>
                    </div>
                </div>

                <!-- HYBRID REASONING BLOCK -->
                <div class="space-y-3">
                    <!-- Python-decided personalized advice -->
                    <div class="flex gap-3">
                        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide w-20 shrink-0 pt-0.5">For you</span>
                        <p class="text-sm text-slate-700 leading-relaxed">${w.personalizedReason}</p>
                    </div>

                    <!-- LLM-cached synthesis -->
                    <div class="flex gap-3">
                        <span class="text-xs font-semibold text-sky-600 uppercase tracking-wide w-20 shrink-0 pt-0.5">Analysis</span>
                        <p class="text-sm text-slate-600 leading-relaxed italic">
                            <span class="font-medium not-italic px-2 py-0.5 rounded text-xs ${actionColor(w.llmAction)} mr-2">Global: ${w.llmAction}</span>
                            ${w.llmSynthesis}
                        </p>
                    </div>

                    <!-- Top risk -->
                    <div class="flex gap-3">
                        <span class="text-xs font-semibold text-amber-600 uppercase tracking-wide w-20 shrink-0 pt-0.5">⚠ Risk</span>
                        <p class="text-sm text-slate-600 leading-relaxed">${w.topRisk}</p>
                    </div>
                </div>

                ${divergent ? `
                    <div class="mt-4 pt-3 border-t border-amber-100 flex items-center gap-2 text-xs text-amber-700 bg-amber-50/50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        <span><b>Your situation diverges from the global view.</b> The system suggests <b>${w.personalizedAction}</b> for your position even though the global call is <b>${w.llmAction}</b>.</span>
                    </div>
                ` : ''}

                <!-- Horizon bar -->
                <div class="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r ${barColor}" style="width:${Math.min(100, pct)}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================
// COMMODITIES  (macro-driven — reference: COMMOD~1.HTM)
// Uses the existing #drawer-overlay modal + biasColor/changeColor
// helpers, so all three themes render via the same overrides.
// ============================================================
const USDINR = 85.7;
const OZ_G = 31.1035;                          // grams per troy ounce
const inrPer10gGold  = usdOz => usdOz * USDINR / OZ_G * 10;
const inrPerKgSilver = usdOz => usdOz * USDINR / OZ_G * 1000;
const cmdFmt = n => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

const COMMODITY_CATS = ['Metals', 'Energy', 'Agriculture', 'Livestock'];
let commodityFilter = 'all';
let commoditiesInit = false;

// Live rows only, filled once /v1/commodities answers. Empty until then —
// no placeholder futures.
let commodityData = [];
let commoditiesLoaded = false;
let commoditiesError  = false;
const commodityCache = {};              // category (or 'all') -> mapped rows

// Decoration only — the API sends no icon, and this never affects the numbers.
const COMMODITY_EMOJI = {
    'GC=F':'🥇','SI=F':'🥈','PL=F':'⚪','PA=F':'⚪','HG=F':'🟠',
    'CL=F':'🛢️','BZ=F':'🛢️','NG=F':'🔥','RB=F':'⛽','HO=F':'🔆',
    'ZC=F':'🌽','ZS=F':'🫘','ZW=F':'🌾','KC=F':'☕','CT=F':'🧺',
    'SB=F':'🍬','CC=F':'🍫','OJ=F':'🍊',
    'LE=F':'🐄','HE=F':'🐖','GF=F':'🐂',
};

// DB row -> the shape the cards/modal already read. Analysis fields (bias,
// driver, rsi, trend, ranges, risks) have no column yet, so they stay undefined
// and every block that uses them is skipped rather than printing "undefined".
function toCommodityView(r) {
    return {
        sym:   r.ticker,
        name:  r.name,
        cat:   r.category,
        emoji: COMMODITY_EMOJI[r.ticker] || '•',
        price: r.price,
        chg:   r.p_change,
        // "oz" -> "/oz", but "¢/lb" already carries its own separator.
        unit:  r.unit ? (r.unit.includes('/') ? r.unit : `/${r.unit}`) : '',
        as_of: r.as_of,
    };
}

const commodityBiasLabel = (b) => b === 'bull' ? 'Bullish' : b === 'bear' ? 'Bearish' : 'Neutral';
// Show the stored value, not a rounded one: 334.75 stays 334.75. Grouping only
// adds separators. (cmdFmt stays whole-number — it's for the ₹ conversions.)
const commodityPrice = (p) => p.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function renderCommodityFilters() {
    const cats = ['all', ...COMMODITY_CATS];
    document.getElementById('commodities-filters').innerHTML = cats.map(cat => {
        const active = cat === commodityFilter;
        const label = cat === 'all' ? 'All' : cat;
        const cls = active
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900';
        return `<button onclick="setCommodityFilter('${cat}')" class="px-4 py-2 rounded-full text-sm font-medium border cursor-pointer transition ${cls}">${label}</button>`;
    }).join('');
}

function setCommodityFilter(cat) {
    commodityFilter = cat;
    renderCommodityFilters();
    renderCommodities();
    loadCommodities(cat);
}

// GET /v1/commodities/{sector}/commodity — one call per category, cached so
// clicking back and forth doesn't refetch.
async function loadCommodities(cat = commodityFilter) {
    const key = cat || 'all';
    if (commodityCache[key]) {
        commodityData = commodityCache[key];
        commoditiesLoaded = true;
        renderCommodities();
        return;
    }
    try {
        const { commodities: rows } = await api.commodities(key);
        commodityCache[key] = rows.map(toCommodityView);
        commodityData = commodityCache[key];
        commoditiesError = false;
    } catch (err) {
        console.warn('Commodities fetch failed:', err.message);
        commodityData = [];
        commoditiesError = true;
    }
    commoditiesLoaded = true;
    renderCommodities();
}

function commodityStatTile(k, v) {
    return `<div class="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
                <div class="text-xs text-slate-400 font-semibold uppercase tracking-wide">${k}</div>
                <div class="text-sm font-semibold text-slate-900 mt-0.5">${v}</div>
            </div>`;
}

function renderCommodities() {
    const groups = document.getElementById('commodities-groups');
    if (!commoditiesLoaded) { groups.innerHTML = emptyState('Loading…'); return; }
    if (commoditiesError) { groups.innerHTML = emptyState('Could not reach GET /v1/commodities — is the backend running?'); return; }
    if (!commodityData.length) { groups.innerHTML = emptyState('No commodity data in the database yet.'); return; }

    const cats = commodityFilter === 'all' ? COMMODITY_CATS : [commodityFilter];
    const rendered = cats.map(cat => {
        const items = commodityData.filter(d => d.cat === cat);
        if (!items.length) return '';
        const cards = items.map(d => {
            const up = d.chg != null && d.chg >= 0;
            // Only claim a bias when the data actually carries one.
            const badge = d.bias
                ? `<span class="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${biasColor(commodityBiasLabel(d.bias))}">${commodityBiasLabel(d.bias)}</span>`
                : '';
            let inrLine = '';
            if (d.sym === 'GC=F') inrLine = `<div class="text-xs text-slate-500 mb-2">≈ ₹${cmdFmt(inrPer10gGold(d.price))} / 10g</div>`;
            if (d.sym === 'SI=F') inrLine = `<div class="text-xs text-slate-500 mb-2">≈ ₹${cmdFmt(inrPerKgSilver(d.price))} / kg</div>`;
            return `
                <div onclick="openCommodity('${d.sym}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md rounded-xl p-4 cursor-pointer transition">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0">${d.emoji}</div>
                            <div class="min-w-0">
                                <div class="font-semibold text-slate-900 truncate leading-tight">${d.name}</div>
                                <div class="text-xs text-slate-400">${d.sym}</div>
                            </div>
                        </div>
                        ${badge}
                    </div>
                    <div class="flex items-end justify-between mb-2">
                        <div class="text-xl font-bold text-slate-900">${d.price == null ? '—' : commodityPrice(d.price)}<span class="text-xs font-medium text-slate-400 ml-1">${d.unit}</span></div>
                        <div class="text-sm font-semibold ${changeColor(d.chg)}">${d.chg == null ? '—' : `${up ? '▲' : '▼'} ${Math.abs(d.chg).toFixed(2)}%`}</div>
                    </div>
                    ${inrLine}
                    ${d.driver ? `<div class="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2.5">${d.driver}</div>` : ''}
                </div>`;
        }).join('');
        return `<div class="text-xs font-bold uppercase tracking-wider text-slate-400 mt-8 mb-3">${cat}</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">${cards}</div>`;
    }).join('');

    groups.innerHTML = rendered.trim() ? rendered : emptyState(`No ${commodityFilter === 'all' ? '' : commodityFilter + ' '}commodities in the database yet.`);
}

// Reuses the shared #drawer-overlay centered modal (same one the stock cards use).
function openCommodity(sym) {
    const d = commodityData.find(x => x.sym === sym);
    if (!d) return;
    const up = d.chg != null && d.chg >= 0;
    const label = commodityBiasLabel(d.bias);
    // The technical/LLM blocks only render once those fields exist server-side.
    const stats = [
        ['Trend', d.trend], ['RSI (14)', d.rsi],
        ['Day range', d.dayRange], ['52-week range', d.range52],
    ].filter(([, v]) => v != null);
    let inrLine = '';
    if (d.sym === 'GC=F') inrLine = `≈ ₹${cmdFmt(inrPer10gGold(d.price))} / 10g (MCX-equivalent)`;
    if (d.sym === 'SI=F') inrLine = `≈ ₹${cmdFmt(inrPerKgSilver(d.price))} / kg (MCX-equivalent)`;
    document.getElementById('drawer-content').innerHTML = `
        <div class="flex items-center gap-3 mb-1">
            <div class="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">${d.emoji}</div>
            <div>
                <div class="text-xl font-bold text-slate-900">${d.name}</div>
                <div class="text-xs text-slate-500">${d.sym} · ${d.cat}</div>
            </div>
        </div>
        <div class="flex items-end gap-3 mt-4 mb-1">
            <div class="text-3xl font-bold text-slate-900">${d.price == null ? '—' : commodityPrice(d.price)}<span class="text-sm font-medium text-slate-400 ml-1">USD${d.unit}</span></div>
            <div class="text-base font-semibold ${changeColor(d.chg)} pb-1">${d.chg == null ? '—' : `${up ? '▲' : '▼'} ${Math.abs(d.chg).toFixed(2)}%`}</div>
        </div>
        ${inrLine ? `<div class="text-sm text-slate-500 mb-4">${inrLine}</div>` : '<div class="h-2"></div>'}
        ${stats.length ? `<div class="grid grid-cols-2 gap-3 mb-4">
            ${stats.map(([k, v]) => commodityStatTile(k, v)).join('')}
        </div>` : ''}
        ${d.analysis ? `<div class="bg-gradient-to-br from-sky-50 to-teal-50 border border-slate-200 rounded-xl p-4 mb-4">
            <div class="text-xs font-bold uppercase tracking-wider text-sky-600 mb-2">LLM Analysis · ${label}</div>
            <p class="text-sm text-slate-700 leading-relaxed">${d.analysis}</p>
        </div>` : ''}
        ${d.risks?.length ? `<div class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Risks</div>
        <ul class="space-y-2 mb-2">
            ${d.risks.map(r => `<li class="text-sm text-slate-700 leading-snug flex gap-2"><span class="text-rose-500 shrink-0">⚠</span><span>${r}</span></li>`).join('')}
        </ul>` : ''}
        <div class="text-xs text-slate-400 text-center mt-5 leading-relaxed">Price data: Yahoo Finance futures (${d.sym}), USD${d.as_of ? ` · as of ${d.as_of}` : ''}. Commodity analysis is driven by macro factors (rates, USD, supply/demand, geopolitics) — not company fundamentals.</div>`;
    const overlay = document.getElementById('drawer-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

function showCommodities() {
    hideAllViews();
    document.getElementById('commodities-view').classList.remove('hidden');
    if (!commoditiesInit) {
        document.getElementById('commodities-fx').textContent = `USD/INR ≈ ${USDINR}.`;
        renderCommodityFilters();
        commoditiesInit = true;
        loadCommodities();
    }
    renderCommodities();
    window.scrollTo(0, 0);
}

// ============================================================
// SECTOR FILTER — first live endpoint (GET /v1/all_stocks/sector)
// ============================================================
async function loadSectors() {
    const el = document.getElementById('all-stocks-sector');
    if (!el) return;
    try {
        const sectors = await api.sectors();
        el.innerHTML = '<option value="">All sectors</option>'
            + sectors.map(s => `<option value="${escAttr(s)}">${escAttr(s)}</option>`).join('');
        el.onchange = (e) => onSectorChange(e.target.value);
    } catch (err) {
        console.warn('Sector fetch failed — "All sectors" stays the only option:', err.message);
    }
}

// ============================================================
// TOP BAR — live endpoint (GET /v1/home/basic_top_bar)
// ============================================================
// Renders every ticker the endpoint returns (indices, FX, VIX, oil) as a
// continuously scrolling strip. index.html carries no fallback rows — if the
// backend is unreachable the strip and dates show an honest "—" instead.

// "2026-08-21" -> "Friday, 21 Aug 2026". Split manually rather than
// new Date(iso), which parses as UTC and can shift the day by one.
function fmtAsOf(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN',
        { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
}

// Same markup as the static rows in index.html, so theming keeps working.
function topBarRow(q) {
    const up = q.direction === 'up';
    // A VIX spike is risk-off, not a gain — keep it neutral rather than green.
    const tone = q.ticker === '^INDIAVIX' ? 'text-slate-500'
               : up ? 'text-emerald-600' : 'text-rose-600';
    return `
        <div class="flex items-center gap-2 whitespace-nowrap">
            <span class="text-xs font-medium text-slate-500">${escAttr(q.name)}</span>
            <span class="text-sm font-semibold">${q.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            <span class="text-xs font-medium ${tone}">${up ? '+' : '−'}${Math.abs(q.p_change).toFixed(2)}%</span>
        </div>`;
}

async function loadTopBar() {
    const strip = document.getElementById('market-strip');
    if (!strip) return;
    try {
        const { date, as_of, market_data } = await api.topBar();

        const todayEl = document.getElementById('home-date-today');
        const asofEl  = document.getElementById('home-date-asof');
        if (todayEl && date)   todayEl.textContent = date;
        if (asofEl  && as_of)  asofEl.textContent  = fmtAsOf(as_of);

        if (!market_data.length) {
            strip.innerHTML = '<span class="text-xs text-slate-400">No market_stats rows in the database yet.</span>';
            return;
        }
        // Rendered twice: the ticker wraps from the end of copy 1 to the same
        // point in copy 2, which is pixel-identical, so the loop has no seam.
        const rows = market_data.map(topBarRow).join('');
        strip.innerHTML = rows + rows;
        strip.classList.add('market-strip');
        startTopBarTicker(strip, market_data.length);
    } catch (err) {
        console.warn('Top bar fetch failed:', err.message);
        strip.innerHTML = '<span class="text-xs text-slate-400">Could not reach GET /v1/home/basic_top_bar.</span>';
    }
}

// Drives the strip right-to-left forever. Animates scrollLeft rather than a CSS
// transform so the element stays a real scroll box: wheel and drag keep working,
// and the animation resumes from wherever the user left it.
function startTopBarTicker(strip, count) {
    const SPEED = 0.4;          // px per frame — ~24px/s at 60fps
    const RESUME_DELAY = 1500;  // ms of stillness before auto-scroll takes over again
    let hovering = false, resumeAt = 0, dragFrom = null, scrollFrom = 0;
    const hold = () => { resumeAt = Date.now() + RESUME_DELAY; };

    // Width of one copy of the row set. Measured from the second copy's first
    // child instead of scrollWidth/2, which would fold in container padding.
    let span = 0;
    const measure = () => {
        span = (strip.children[count]?.offsetLeft ?? 0) - (strip.children[0]?.offsetLeft ?? 0);
    };
    measure();
    window.addEventListener('resize', measure);

    strip.addEventListener('mouseenter', () => { hovering = true; });
    strip.addEventListener('mouseleave', () => { hovering = false; });
    strip.addEventListener('wheel', hold, { passive: true });

    // Drag-to-scroll — scroll boxes don't get this natively with a mouse.
    strip.addEventListener('pointerdown', (e) => {
        dragFrom = e.clientX;
        scrollFrom = strip.scrollLeft;
        strip.setPointerCapture(e.pointerId);
        strip.classList.add('dragging');
    });
    strip.addEventListener('pointermove', (e) => {
        if (dragFrom === null) return;
        let next = scrollFrom - (e.clientX - dragFrom);
        // Wrap inside copy 1 so dragging loops forever either way. scrollFrom
        // shifts with it, so later moves in the same drag stay continuous.
        if (next >= span)   { next -= span; scrollFrom -= span; }
        else if (next < 0)  { next += span; scrollFrom += span; }
        strip.scrollLeft = next;
        hold();
    });
    const endDrag = () => {
        dragFrom = null;
        strip.classList.remove('dragging');
        hold();
    };
    strip.addEventListener('pointerup', endDrag);
    strip.addEventListener('pointercancel', endDrag);

    // Users who ask for reduced motion get a plain scrollable strip.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Chrome snaps scrollLeft to whole pixels, so `scrollLeft += 0.4` reads back
    // as 0 and the strip never moves. Keep the true position as a float here and
    // assign that instead, so sub-pixel speeds still accumulate.
    let pos = 0;

    const step = () => {
        if (span > 0) {
            if (hovering || dragFrom !== null || Date.now() < resumeAt) {
                // User owns the position while paused — follow it, don't fight it.
                if (strip.scrollLeft >= span) strip.scrollLeft -= span;
                pos = strip.scrollLeft;
            } else {
                pos += SPEED;
                if (pos >= span) pos -= span;
                strip.scrollLeft = pos;
            }
        }
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// ============================================================
// PICKS SECTOR FILTER — live endpoint (GET /v1/home/sector)
// ============================================================
// populateSectorSelects() has already filled these from the ranked data, so the
// selects work immediately; this swaps in the backend's full sector list once it
// arrives, and keeps the derived options if the fetch fails.
async function loadPicksSectors() {
    try {
        populateSectorSelects(await api.homeSector());
    } catch (err) {
        console.warn('Picks sector fetch failed — keeping derived options:', err.message);
    }
}

// ----- Initialize -----
// Theme cycling lives in theme.js (shared with admin.html) and self-applies.
populateSectorSelects();
renderHomePicks();     // paints the "Loading…" state immediately
loadRankUniverse();    // then fetches the real ranking universe for Home + Rankings
loadSectors();
loadTopBar();
loadPicksSectors();
