// ============================================================
// APP — view routing, rendering and UI behaviour
// Reads from mock-data.js today; swap those reads for the api.js
// calls once the backend is wired up.
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

const changeColor = (c) => c >= 0 ? 'text-emerald-600' : 'text-rose-600';
const changeSign = (c) => c >= 0 ? '+' : '';

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
    const section = (tag, act, reason) =>
          `<div class="mb-2.5 last:mb-0">`
        + `<div class="hp-label text-[10px] font-bold uppercase tracking-widest mb-0.5">${tag} · ${escAttr(act)}</div>`
        + `<p class="text-xs leading-relaxed">${escAttr(reason)}</p>`
        + `</div>`;
    document.getElementById('hold-popover-body').innerHTML =
        holdLine
        + section('LLM', d.llmAct, d.llmReason)
        + section('Raw', d.rawAct, d.rawReason);
    positionHoldPopover(el);
}

function closeHoldPopover() {
    document.getElementById('hold-popover').classList.add('hidden');
}

// Mock reasoning sentences for a history row — LLM (narrative) vs Raw (rule-based).
function llmReasonFor(act, s, hold) {
    if (act === 'HOLD') return (hold && hold.reason)
        ? hold.reason
        : 'Signals are mixed with no high-conviction setup — existing holders can stay put.';
    if (act === 'BUY')  return 'Bias bullish: technicals, fundamentals and news flow align, with entry near support offering favourable risk-reward.';
    if (act === 'SELL') return 'Bias bearish: price below key EMAs, momentum weak, and analyst targets being revised lower.';
    return 'Conflicting signals across technicals and fundamentals — no clear directional edge.';
}
function rawReasonFor(act, s) {
    if (act === 'HOLD') return 'Rule engine neutral: price hovering around the 20D EMA, RSI near 50, leverage moderate — no threshold crossed.';
    if (act === 'BUY')  return 'Rule engine bullish: price above the 20/50/200D EMAs, RSI in the 55–70 band, healthy ROCE and low debt.';
    if (act === 'SELL') return 'Rule engine bearish: price below the 20D & 50D EMA, RSI under 40, margins compressing.';
    return 'Rule thresholds give no decisive signal.';
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

// Synthetic hold metadata for a *past* history row (mock). Deterministic per row index
// so the pill stays stable within a single render; index 3 exercises the undetermined case.
function mockRowHold(s, i) {
    const opts = [
        { days: 3,    label: '~3 days',      reason: `Holding above the ₹${Math.round(s.price*0.97).toLocaleString('en-IN')} 20D EMA; re-check if it breaks.` },
        { days: 5,    label: '~5 days',      reason: `Range-bound below ₹${Math.round(s.price*1.05).toLocaleString('en-IN')} resistance; wait for a breakout.` },
        { days: 2,    label: '~2 days',      reason: 'Momentum fading into expiry; reassess after weekly settlement.' },
        { days: null, label: 'Undetermined', reason: 'Undetermined — no near-term catalyst; re-evaluate in ~5 sessions.' },
        { days: 7,    label: '~1 week',      reason: 'Hold into the next earnings print, then re-evaluate.' },
    ];
    return opts[i % opts.length];
}

// ============================================================
// Ranking model — one scoring pass, three ways of reading it
// ============================================================
// The home Top Picks list, the rankings modal and the Recommendations view all
// rank the same stocks, so the LLM/raw/combined derivation lives here once.
// Returned best-combined-first.
const TOP_PICKS_COUNT = 10;

function scoredStocks() {
    return stocks.map(s => {
        const llmScore100 = Math.round(s.llmScore * 100);
        const llmAct = s.llmAction === 'BUY' ? 'BUY' : llmScore100 > 65 ? 'BUY' : 'HOLD';
        const pyAct  = s.pythonScore > 65 ? 'BUY' : s.pythonScore < 35 ? 'SELL' : 'HOLD';
        const combined = combineDecisions(pyAct, s.pythonScore, llmAct, llmScore100);
        return {
            ...s, llmScore100, llmAct, pyAct,
            combinedAction: combined.action,
            combinedScore:  combined.score,
            combinedMixed:  combined.mixed,
        };
    }).sort((a, b) => b.combinedScore - a.combinedScore);
}

// The hold window mock-data.js already attached, in the shape comboChip expects.
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
    return [...new Set(stocks.map(s => s.sector).filter(Boolean))].sort();
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
    const picks = picksUniverse().slice(0, TOP_PICKS_COUNT);
    const scope = picksSector ? `in ${picksSector}` : 'overall';
    const lead  = picks.length === 1 ? '1 pick' : `Top ${picks.length}`;
    document.getElementById('top-picks-sub').textContent =
        `${lead} ${scope} — LLM conviction and raw signals combined`;
    document.getElementById('top-picks-list').innerHTML = picks.map(topPickCard).join('');
}

function topPickCard(s, idx) {
    return `
        <div onclick="openDrawer('${s.symbol}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-sm rounded-xl p-4 cursor-pointer transition group">
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
                        ${comboChip(s.combinedAction, s.llmAct, s.pyAct, s, holdOf(s))}
                        <span class="text-xs text-slate-500">LLM ${s.llmScore100} · Raw ${s.pythonScore}</span>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <div class="text-sm font-semibold text-slate-900">${s.combinedScore}/100</div>
                    <div class="text-xs ${changeColor(s.change)} mt-1">${changeSign(s.change)}${s.change}%</div>
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
function rankingRowsFor(tab) {
    const scored = picksUniverse();
    if (tab === 'llm') return [...scored].sort((a, b) => b.llmScore100 - a.llmScore100).slice(0, TOP_PICKS_COUNT);
    if (tab === 'raw') return [...scored].sort((a, b) => b.pythonScore - a.pythonScore).slice(0, TOP_PICKS_COUNT);
    return scored;
}

function rankingRow(s, idx, tab) {
    // Detail modal opens on the method the tab is about; 'all' defaults to the LLM narrative.
    const source = tab === 'raw' ? 'raw' : 'llm';
    const score  = tab === 'llm' ? s.llmScore100 : tab === 'raw' ? s.pythonScore : s.combinedScore;

    let chip, note;
    if (tab === 'all') {
        chip = comboChip(s.combinedAction, s.llmAct, s.pyAct, s, holdOf(s));
        note = s.combinedMixed ? 'Methods diverge' : 'Both methods agree';
    } else if (tab === 'llm') {
        chip = `<span class="text-xs font-semibold px-2.5 py-1 rounded-md border ${actionColor(s.llmAction)}">${s.llmAction}</span>`;
        note = `${s.llmBias} · Raw ${s.pythonScore}`;
    } else {
        chip = `<span class="text-xs font-semibold px-2.5 py-1 rounded-md border ${actionColor(s.pyAct)}">${s.pyAct}</span>`;
        note = `Rule-based · LLM ${s.llmScore100}`;
    }

    return `
        <div onclick="openDrawer('${s.symbol}', '${source}')" class="grid grid-cols-12 gap-3 items-center px-3 py-3 rounded-lg border border-transparent hover:border-sky-300 hover:bg-slate-100 cursor-pointer transition">
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
            <div class="col-span-2 text-right text-sm font-semibold text-slate-900">${score}<span class="text-xs text-slate-400 font-normal">/100</span></div>
            <div class="col-span-2 text-right">
                <div class="text-sm font-semibold text-slate-900">₹${s.price.toLocaleString('en-IN')}</div>
                <div class="text-xs ${changeColor(s.change)} mt-0.5">${changeSign(s.change)}${s.change}%</div>
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

// API row (snake_case, from SQL) → the camelCase shape the render code expects.
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
        llmBias:      r.llm_bias   || 'Neutral',
        llmScore:     r.llm_score,
        llmAction:    r.llm_action || 'NEUTRAL',
        pythonScore:  r.python_score,
        pythonAction: r.python_action,
        // Raw-pipeline detail. Null until the raw analysis writes stock_analysis
        // and the endpoint selects these columns — renderRawDrawer falls back.
        techScore:    r.tech_score,
        fundScore:    r.fund_score,
        flowScore:    r.flow_score,
        rawSignals:   r.raw_signals,
        pythonReasoning: r.python_reasoning,
        combinedAction: r.combined_action,
        combinedScore:  r.combined_score,
        analysisDate: r.analysis_date,
        // Column the `stocks` table carries but the list query only uses in the dialog.
        summary:   r.business_summary || 'No business summary available.',
    };
}

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
    } catch (err) {
        console.warn('Stock fetch failed — falling back to mock data:', err.message);
        allStocksLive = false;
    }
}

// The list the view renders from: live rows when the API answered, mocks otherwise.
const stocksSource = () => allStocksLive ? allStocks : stocks;

function stockCard(s) {
    return `
        <div onclick="openDialog('${s.symbol}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md rounded-xl p-5 cursor-pointer transition">
            <div class="flex items-start justify-between mb-3">
                <div class="min-w-0 flex-1">
                    <div class="font-semibold text-slate-900 truncate">${s.name}</div>
                    <div class="text-xs text-slate-400 mt-0.5">${s.symbol.replace('.NS','')}</div>
                </div>
                <span class="text-xs font-medium px-2 py-0.5 rounded-full ${biasColor(s.llmBias)} shrink-0 ml-2">${s.llmBias}</span>
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
    document.getElementById('all-stocks-grid')
        .insertAdjacentHTML('beforeend', next.map(stockCard).join(''));
    allStocksShown += next.length;
    updateLoadMore();
}

// Reveals the next batch; pulls another page from the API first if we've
// run out of locally-buffered rows and the server still has more.
async function loadMoreStocks() {
    if (allStocksLive && allStocksShown >= allStocks.length && allStocksMore) {
        await fetchStocksPage();
    }
    appendStockPage();
}

// Keep the counter honest and hide the button once the list is exhausted.
function updateLoadMore() {
    const total = stocksSource().length;
    const btn = document.getElementById('load-more-btn');
    const done = allStocksShown >= total && !(allStocksLive && allStocksMore);
    document.getElementById('all-stocks-count').textContent =
        `Showing ${allStocksShown} of ${total}${allStocksLive && allStocksMore ? '+' : ''} stocks`;
    btn.classList.toggle('hidden', done);
}

// Sector dropdown → refetch from the server, then re-render from page one.
async function onSectorChange(value) {
    currentSector = value || '';
    await fetchStocksPage(true);
    renderAllStocks();
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

    if (tab === 'top-picks') {
        tabTop.className    = activeCls;
        tabActive.className = inactiveCls;
        // re-append the count span on top picks tab
        tabTop.innerHTML    = `Today's Top Picks <span class="ml-1 text-xs text-slate-400">10</span>`;
        tabActive.innerHTML = `Active Calls <span id="active-count" class="ml-1 text-xs text-slate-400">${document.querySelectorAll('#active-recs-list > div').length}</span>`;
        contTop.classList.remove('hidden');
        contActive.classList.add('hidden');
    } else {
        tabTop.className    = inactiveCls;
        tabActive.className = activeCls;
        tabTop.innerHTML    = `Today's Top Picks <span class="ml-1 text-xs text-slate-400">10</span>`;
        tabActive.innerHTML = `Active Calls <span id="active-count" class="ml-1 text-xs text-slate-400">${document.querySelectorAll('#active-recs-list > div').length}</span>`;
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

// ----- Render Top Recommendations -----
// Top picks where Combined score > 65 with both Python and LLM agreeing on BUY
function renderTopRecs() {
    // Filter stocks with high combined conviction and bullish action
    const candidates = scoredStocks().filter(s =>
        (s.combinedAction === 'BUY' || s.combinedAction === 'MIXED-BUY') &&
        s.combinedScore >= 60
    ).slice(0, TOP_PICKS_COUNT);

    document.getElementById('top-recs-list').innerHTML = candidates.map((s, idx) => `
        <div onclick="openDrawer('${s.symbol}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-sm rounded-xl p-5 cursor-pointer transition">
            <div class="grid grid-cols-12 gap-4 items-start">
                <!-- Rank + Stock -->
                <div class="col-span-1">
                    <div class="w-9 h-9 bg-gradient-to-br from-sky-100 to-teal-100 rounded-lg flex items-center justify-center text-sm font-bold text-sky-700">
                        #${idx + 1}
                    </div>
                </div>
                <div class="col-span-4">
                    <div class="font-semibold text-slate-900">${s.name}</div>
                    <div class="text-xs text-slate-400 mt-0.5">${s.symbol.replace('.NS','')} · ${s.sector}</div>
                    <div class="text-xs text-slate-500 mt-2 leading-relaxed">
                        ${topRecNewsByStock[s.symbol] || 'Latest news: positive coverage across major outlets'}
                    </div>
                </div>
                <!-- Combined chip -->
                <div class="col-span-3 flex flex-col items-start gap-1">
                    <div class="flex items-center gap-1.5">
                        <span class="text-xs font-semibold px-2.5 py-1 rounded-md border ${combinedColor(s.combinedAction)}">${s.combinedAction}</span>
                        <span class="text-xs text-slate-600 font-semibold">${s.combinedScore}</span>
                    </div>
                    <span class="text-[10px] text-slate-400 uppercase tracking-wide">${s.combinedMixed ? 'Methods diverge' : 'Both methods agree'}</span>
                </div>
                <!-- Price -->
                <div class="col-span-2 text-right">
                    <div class="text-lg font-semibold">₹${s.price.toLocaleString('en-IN')}</div>
                    <div class="text-xs ${changeColor(s.change)} mt-0.5">${changeSign(s.change)}${s.change}%</div>
                </div>
                <!-- Quick add -->
                <div class="col-span-2 text-right">
                    <button onclick="event.stopPropagation(); openAddToWatchlist('${s.symbol}', '${s.name}', ${s.price})" class="text-xs font-medium text-sky-700 hover:text-sky-900 hover:bg-sky-50 px-3 py-1.5 rounded-md transition">
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
    const s = stocks.find(x => x.symbol === symbol);
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
function renderLlmDrawer(s) {
    // Mock LLM-derived "expected price" for the next 7-10 days
    const expectedLo = Math.round(s.price * (1 + (s.llmScore - 0.5) * 0.08 - 0.02));
    const expectedHi = Math.round(s.price * (1 + (s.llmScore - 0.5) * 0.08 + 0.03));
    return `
        <div class="text-xs text-slate-400 mb-2">${s.symbol}</div>
        <h2 class="text-2xl font-bold tracking-tight">${s.name}</h2>
        <p class="text-sm text-slate-500 mt-1 mb-6">${s.sector} · ${s.industry}</p>

        <!-- Price + expected range -->
        <div class="flex items-baseline gap-3 mb-2">
            <span class="text-3xl font-bold">₹${s.price.toLocaleString('en-IN')}</span>
            <span class="text-sm font-medium ${changeColor(s.change)}">${changeSign(s.change)}${s.change}% today</span>
        </div>
        <p class="text-xs text-slate-500 mb-6">Expected range (7–10d): <span class="font-semibold text-slate-700">₹${expectedLo.toLocaleString('en-IN')} – ₹${expectedHi.toLocaleString('en-IN')}</span></p>

        <!-- LLM Analysis card -->
        <div class="bg-gradient-to-br from-sky-50 to-teal-50 border border-sky-100 rounded-2xl p-5 mb-4">
            <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-semibold text-sky-700 uppercase tracking-wide">LLM Analysis</span>
                <span class="text-xs text-slate-500">Qwen3-32B · 21 Jun</span>
            </div>
            <div class="flex items-center gap-3 mb-4 flex-wrap">
                <span class="text-xs font-medium px-2.5 py-1 rounded-full ${biasColor(s.llmBias)}">${s.llmBias}</span>
                <span class="text-xs font-medium px-2.5 py-1 rounded border ${actionColor(s.llmAction)}">${s.llmAction}</span>
                ${s.llmAction === 'HOLD' ? holdPill(s.hold_duration_days, s.hold_duration_label, s.hold_duration_reason, 'card') : ''}
                <span class="text-xs text-slate-500">Conviction <span class="font-semibold text-slate-900">${(s.llmScore*100).toFixed(0)}/100</span></span>
            </div>
            <p class="text-sm text-slate-700 leading-relaxed">${reasoningFor(s)}</p>
        </div>

        <!-- Key risks -->
        <div class="mb-5">
            <h3 class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Key risks</h3>
            <ul class="space-y-2 text-sm text-slate-700">
                <li class="flex gap-2"><span class="text-slate-400">•</span><span>Earnings due in ${20 + Math.floor(Math.random()*40)} days; surprise history is mixed</span></li>
                <li class="flex gap-2"><span class="text-slate-400">•</span><span>${s.sector} sector facing margin pressure from input costs</span></li>
                <li class="flex gap-2"><span class="text-slate-400">•</span><span>FII flows have been net negative in the last 5 sessions</span></li>
            </ul>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="openAddToWatchlist('${s.symbol}', '${s.name}', ${s.price})" class="flex-1 px-4 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 font-medium rounded-lg transition">
                + Add to watchlist
            </button>
            <button onclick="openDrawer('${s.symbol}', 'raw')" class="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition">
                View raw data →
            </button>
        </div>
    `;
}

// ===== Raw drawer: deterministic numbers + rule-based interpretation =====
function renderRawDrawer(s) {
    const py = s.pythonScore;

    // raw_signals / sub-scores come from stock_analysis once the raw pipeline has
    // written a row. Until then every field is null and we fall back to the old
    // derived-from-pythonScore mock, flagged below so it's never mistaken for real.
    const sig  = s.rawSignals || {};
    const live = sig.rsi_14 != null;
    const pick = (real, mock) => real != null ? real : mock;

    const rsi    = pick(sig.rsi_14,  Math.max(28, Math.min(78, Math.round(40 + (py - 50) * 0.6 + (Math.random() * 6 - 3)))));
    const ema20  = pick(sig.ema_20,  +(s.price * (1 - (75 - py)/2000)).toFixed(2));
    const ema50  = pick(sig.ema_50,  +(s.price * (1 - (75 - py)/1200)).toFixed(2));
    const ema200 = pick(sig.ema_200, +(s.price * (1 - (75 - py)/700)).toFixed(2));
    const atr    = pick(sig.atr,     +(s.price * 0.022).toFixed(2));
    const pe     = pick(sig.pe,      +(15 + (py - 50) * 0.4 + Math.random() * 4).toFixed(1));
    const roce   = pick(sig.roce,    +(8 + (py - 50) * 0.4).toFixed(1));
    const de     = pick(sig.debt_to_equity,   +(0.2 + (75 - py) * 0.012).toFixed(2));
    const margin = pick(sig.operating_margin, +(6 + (py - 50) * 0.2).toFixed(1));
    const revGrowth = pick(sig.revenue_growth, +(4 + (py - 50) * 0.4).toFixed(1));

    // Component sub-scores. Third component is institutional flow, not news
    // sentiment — news sentiment is scored by the LLM pass, not the rule engine.
    const mockSub   = () => Math.max(30, Math.min(95, py + (Math.random() * 12 - 6) | 0));
    const techScore = pick(s.techScore, mockSub());
    const fundScore = pick(s.fundScore, mockSub());
    const flowScore = pick(s.flowScore, mockSub());

    // Helpers for interpretation badges
    const interp = (text, kind = 'neutral') => {
        const colors = {
            bull: 'text-emerald-700 bg-emerald-50',
            bear: 'text-rose-700 bg-rose-50',
            neutral: 'text-slate-600 bg-slate-100',
        };
        return `<span class="text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[kind]}">${text}</span>`;
    };

    // Build interpretation tags
    const rsiInterp = rsi > 70 ? interp('Overbought', 'bear')
                    : rsi < 30 ? interp('Oversold', 'bear')
                    : rsi >= 55 ? interp('Bullish', 'bull')
                    : interp('Neutral', 'neutral');
    const ema20Interp = s.price > ema20 ? interp('Above · Bullish', 'bull') : interp('Below · Bearish', 'bear');
    const ema50Interp = s.price > ema50 ? interp('Above · Bullish', 'bull') : interp('Below · Bearish', 'bear');
    const ema200Interp = s.price > ema200 ? interp('Long-term up', 'bull') : interp('Long-term down', 'bear');
    const peInterp = pe < 20 ? interp('Cheap', 'bull') : pe < 30 ? interp('Fair', 'neutral') : interp('Expensive', 'bear');
    const roceInterp = roce > 15 ? interp('High quality', 'bull') : roce > 8 ? interp('Moderate', 'neutral') : interp('Weak', 'bear');
    const deInterp = de < 0.5 ? interp('Low leverage', 'bull') : de < 1.0 ? interp('Moderate', 'neutral') : interp('Leveraged', 'bear');
    const marginInterp = margin > 12 ? interp('Strong', 'bull') : margin > 6 ? interp('Average', 'neutral') : interp('Weak', 'bear');
    const revInterp = revGrowth > 12 ? interp('Strong', 'bull') : revGrowth > 4 ? interp('Average', 'neutral') : interp('Weak', 'bear');

    // Reasoning: python_reasoning from the DB when the row exists, else assembled here.
    const reasoning = s.pythonReasoning || [
        techScore > 65 ? 'Price trades above key EMAs (20/50/200) with positive momentum.' : null,
        roce > 15 ? `ROCE of ${roce}% signals high-quality capital allocation.` : null,
        de < 0.5 ? 'Low debt-to-equity supports financial flexibility.' : null,
        margin > 12 ? `Operating margins of ${margin}% suggest pricing power.` : null,
        revGrowth > 12 ? `Revenue growth at ${revGrowth}% YoY indicates expansion.` : null,
        pe < 20 ? `PE of ${pe} is attractive relative to growth.` : null,
    ].filter(Boolean).slice(0, 3).join(' ');

    const rowHTML = (label, value, badge) => `
        <div class="grid grid-cols-12 items-center py-2.5 border-b border-slate-100 last:border-0">
            <span class="col-span-5 text-sm text-slate-600">${label}</span>
            <span class="col-span-3 text-sm font-semibold text-slate-900">${value}</span>
            <span class="col-span-4 text-right">${badge}</span>
        </div>
    `;

    return `
        <div class="text-xs text-slate-400 mb-2">${s.symbol}</div>
        <h2 class="text-2xl font-bold tracking-tight">${s.name}</h2>
        <p class="text-sm text-slate-500 mt-1 mb-6">${s.sector} · ${s.industry}</p>

        <div class="flex items-baseline gap-3 mb-6">
            <span class="text-3xl font-bold">₹${s.price.toLocaleString('en-IN')}</span>
            <span class="text-sm font-medium ${changeColor(s.change)}">${changeSign(s.change)}${s.change}% today</span>
        </div>

        <!-- Raw Analysis card -->
        <div class="bg-white border-2 border-sky-100 rounded-2xl p-5 mb-4">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-semibold text-sky-700 uppercase tracking-wide">Raw Analysis</span>
                <span class="text-xs ${live ? 'text-slate-500' : 'text-amber-600'}">${live ? `Rule-based · ${s.analysisDate || '—'}` : 'Rule-based · [mock]'}</span>
            </div>

            <!-- Technical signals -->
            <h4 class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Technical Signals</h4>
            <div class="mb-4">
                ${rowHTML('RSI (14)', rsi, rsiInterp)}
                ${rowHTML('20D EMA', '₹' + ema20.toLocaleString('en-IN'), ema20Interp)}
                ${rowHTML('50D EMA', '₹' + ema50.toLocaleString('en-IN'), ema50Interp)}
                ${rowHTML('200D EMA', '₹' + ema200.toLocaleString('en-IN'), ema200Interp)}
                ${rowHTML('ATR (14)', '₹' + atr, interp('Normal vol', 'neutral'))}
            </div>

            <!-- Fundamental signals -->
            <h4 class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Fundamental Signals</h4>
            <div class="mb-4">
                ${rowHTML('PE Ratio', pe + 'x', peInterp)}
                ${rowHTML('ROCE', roce + '%', roceInterp)}
                ${rowHTML('Debt / Equity', de + 'x', deInterp)}
                ${rowHTML('Operating Margin', margin + '%', marginInterp)}
                ${rowHTML('Revenue Growth YoY', revGrowth + '%', revInterp)}
            </div>
        </div>

        <!-- Score breakdown -->
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Score Breakdown</span>
                <span class="text-xs text-slate-500">Composite</span>
            </div>
            <div class="space-y-3">
                <div>
                    <div class="flex items-center justify-between text-xs mb-1"><span class="text-slate-600">Technical</span><span class="font-semibold text-slate-900">${techScore}/100</span></div>
                    <div class="h-1.5 bg-white rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-sky-400 to-teal-400" style="width:${techScore}%"></div></div>
                </div>
                <div>
                    <div class="flex items-center justify-between text-xs mb-1"><span class="text-slate-600">Fundamental</span><span class="font-semibold text-slate-900">${fundScore}/100</span></div>
                    <div class="h-1.5 bg-white rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-sky-400 to-teal-400" style="width:${fundScore}%"></div></div>
                </div>
                <div>
                    <div class="flex items-center justify-between text-xs mb-1"><span class="text-slate-600">Flow</span><span class="font-semibold text-slate-900">${flowScore}/100</span></div>
                    <div class="h-1.5 bg-white rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-sky-400 to-teal-400" style="width:${flowScore}%"></div></div>
                </div>
                <div class="pt-3 mt-2 border-t border-slate-200 flex items-center justify-between">
                    <span class="text-sm font-semibold text-slate-900">Total</span>
                    <span class="text-lg font-bold text-sky-700">${py}/100</span>
                </div>
            </div>
        </div>

        <!-- Rule-based reasoning -->
        <div class="mb-5">
            <h3 class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Why this scores ${py}/100</h3>
            <p class="text-sm text-slate-700 leading-relaxed">${reasoning || 'Moderate signals across categories — no single factor dominates the score.'}</p>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="openAddToWatchlist('${s.symbol}', '${s.name}', ${s.price})" class="flex-1 px-4 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 font-medium rounded-lg transition">
                + Add to watchlist
            </button>
            <button onclick="openDrawer('${s.symbol}', 'llm')" class="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition">
                View LLM analysis →
            </button>
        </div>
    `;
}

// Generate a plausible reasoning string for the mock
function reasoningFor(s) {
    const phrases = {
        'Bullish': `Technicals are constructive — price trades above 20D and 50D EMAs with RSI in the 60s. Fundamentals support the move with ROCE above 15% and healthy debt levels. Sentiment is broadly positive with FII flows turning supportive over the last week.`,
        'Bearish': `Trend is weak across timeframes with price below all major moving averages. Fundamentals show margin compression and below-average ROCE. News sentiment leans negative on sector headwinds.`,
        'Mixed': `Technicals and fundamentals point in opposite directions — momentum is fading while valuation remains attractive. Recommend waiting for clearer signals before adding exposure.`,
        'Neutral': `Signals are weak across categories. Price is range-bound with no clear directional bias. Neither fundamentals nor sentiment offer a compelling case in either direction right now.`,
    };
    return phrases[s.llmBias] || phrases['Neutral'];
}

// ----- Dialog (all-stocks card detail) -----
function openDialog(symbol) {
    const s = stocksSource().find(x => x.symbol === symbol);
    document.getElementById('dialog-content').innerHTML = `
        <div class="flex justify-between items-start mb-6">
            <div>
                <h2 class="text-2xl font-bold tracking-tight">${s.name}</h2>
                <p class="text-sm text-slate-500 mt-1">${s.symbol} · ${s.sector} · ${s.industry}</p>
            </div>
            <button onclick="closeDialog()" class="text-slate-400 hover:text-slate-900 text-xl leading-none">✕</button>
        </div>

        <!-- Metadata grid -->
        <div class="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
            <div>
                <div class="text-xs text-slate-400 uppercase tracking-wide mb-1">Market Cap</div>
                <div class="font-semibold">₹${s.marketCap}</div>
            </div>
            <div>
                <div class="text-xs text-slate-400 uppercase tracking-wide mb-1">Current Price</div>
                <div class="font-semibold">${fmtPrice(s.price)} <span class="text-xs font-medium ${changeColor(s.change)}">${fmtChange(s.change)}</span></div>
            </div>
            <div>
                <div class="text-xs text-slate-400 uppercase tracking-wide mb-1">ISIN</div>
                <div class="font-medium text-slate-700 text-xs">${s.isin}</div>
            </div>
        </div>

        <!-- Business summary -->
        <div class="mb-6">
            <div class="text-xs text-slate-400 uppercase tracking-wide mb-2">About</div>
            <p class="text-sm text-slate-700 leading-relaxed">${s.summary}</p>
        </div>

        <!-- Analysis history (mocked) -->
        <div class="mb-6">
            <div class="text-xs text-slate-400 uppercase tracking-wide mb-3">Recent Analysis History</div>
            <div class="space-y-2">
                ${mockHistoryRows(s)}
            </div>
        </div>

        <div class="flex gap-3 pt-4 border-t border-slate-100">
            <button id="dialog-expand-btn" onclick="toggleDialogExpansion('${s.symbol}')" class="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition">
                View full analysis ▼
            </button>
            <button onclick="openAddToWatchlist('${s.symbol}', '${s.name}', ${s.price})" class="px-4 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-lg transition">
                Add to watchlist
            </button>
        </div>

        <!-- Expansion target — full analysis renders inline here when expanded -->
        <div id="dialog-expanded" class="hidden mt-6 pt-6 border-t-2 border-dashed border-slate-200 space-y-6"></div>
    `;
    document.getElementById('dialog-overlay').classList.remove('hidden');
    document.getElementById('dialog-overlay').classList.add('flex');
}

// ----- Inline full-analysis expansion within the dialog -----
function toggleDialogExpansion(symbol) {
    const s = stocksSource().find(x => x.symbol === symbol);
    const expanded = document.getElementById('dialog-expanded');
    const btn = document.getElementById('dialog-expand-btn');
    if (expanded.classList.contains('hidden')) {
        expanded.innerHTML = renderFullAnalysisExpansion(demoAnalysis(s));
        expanded.classList.remove('hidden');
        btn.innerHTML = 'Hide full analysis ▲';
        setTimeout(() => expanded.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } else {
        expanded.classList.add('hidden');
        expanded.innerHTML = '';
        btn.innerHTML = 'View full analysis ▼';
    }
}

// Live rows carry no analysis yet (stock_analysis is empty), so price/scores come
// back null and the whole expansion renders as ₹0 / 0-100. Fill the gaps with
// values derived from the symbol — deterministic, so re-opening shows the same
// numbers and the /card/{stock}/full_analysis response can be mapped against it.
function demoAnalysis(s) {
    if (s.price != null && s.llmScore != null) return s;

    let h = 0;
    for (const ch of s.symbol) h = (h * 31 + ch.charCodeAt(0)) % 9973;

    const biases  = ['Bullish', 'Bearish', 'Neutral', 'Mixed'];
    const actions = { Bullish: 'BUY', Bearish: 'SELL', Neutral: 'HOLD', Mixed: 'HOLD' };
    const bias    = biases[h % 4];
    const action  = actions[bias];

    return {
        ...s,
        _demo:        true,
        price:        s.price        ?? 500 + (h % 3500),
        change:       s.change       ?? ((h % 400) - 200) / 100,
        llmBias:      bias,
        llmAction:    action,
        llmScore:     s.llmScore     ?? (30 + (h % 55)) / 100,
        pythonScore:  s.pythonScore  ?? 30 + (h % 55),
        pythonAction: s.pythonAction ?? action,
        hold_duration_days:   action === 'HOLD' ? 5 + (h % 15) : null,
        hold_duration_label:  action === 'HOLD' ? `~${5 + (h % 15)} days` : null,
        hold_duration_reason: action === 'HOLD'
            ? 'Demo value — holding above 20D EMA support; re-evaluate at the next earnings print.'
            : null,
    };
}

function renderFullAnalysisExpansion(s) {
    // Mock-derived trade setup numbers
    const buyLo = Math.round(s.price * 0.985);
    const buyHi = Math.round(s.price * 1.012);
    const sellShortLo = Math.round(s.price * 1.04);
    const sellShortHi = Math.round(s.price * 1.07);
    const sellPosLo = Math.round(s.price * 1.10);
    const sellPosHi = Math.round(s.price * 1.18);
    const stopLoss = Math.round(s.price * 0.955);
    const horizonDays = s.llmAction === 'BUY' ? 10 : s.llmAction === 'SELL' ? 1 : 5;

    // Reasoning paragraphs (mocked per bias)
    const reasoning = {
        technical: s.llmBias === 'Bullish'
            ? `Price trades above 20D, 50D, and 200D EMAs in a stacked bullish formation. RSI sits in the upper-50s — momentum positive without being overextended. ATR is at normal levels suggesting controlled volatility. Volume confirmed the recent breakout, with above-average turnover on up-days.`
            : s.llmBias === 'Bearish'
            ? `Price has broken below the 20D and 50D EMAs with the 200D acting as overhead resistance. RSI in the low-40s suggests weak momentum. Volume on down-days has been elevated, confirming distribution rather than accumulation.`
            : `Price is range-bound between the 20D and 50D EMAs with no clear directional bias. RSI hovers near 50, volume has been below average. Wait for a breakout in either direction with volume confirmation.`,
        fundamental: s.llmBias === 'Bullish'
            ? `ROCE above 15% signals strong capital efficiency. Debt-to-equity under 0.5x means the balance sheet supports growth investment. Operating margins are above sector average, and revenue growth of 12% YoY indicates the business is in an expansion phase. Trailing PE of 22x is reasonable for the growth rate.`
            : s.llmBias === 'Bearish'
            ? `ROCE has slipped below 10% over the last 4 quarters. Debt-to-equity has crept up to 0.8x. Operating margins are compressing on input cost pressure. Revenue growth has decelerated to single digits. Current PE of 28x looks expensive given the deteriorating fundamentals.`
            : `Fundamentals are mixed — ROCE is reasonable but not exceptional, margins are flat YoY, and revenue growth tracks the sector average. Valuation at 22x PE is fair but doesn't offer a margin of safety.`,
        sentiment: s.llmBias === 'Bullish'
            ? `News flow over the last 7 days has been broadly positive, with multiple brokerages raising target prices. FII flows have turned net buyer in this name. Analyst recommendations skew towards BUY, with mean target implying ${(((s.price * 1.15) / s.price - 1) * 100).toFixed(0)}% upside.`
            : s.llmBias === 'Bearish'
            ? `News flow has been mixed-to-negative, with sector-wide concerns dominating coverage. FII selling pressure in this name has been persistent over the last 5 sessions. Analyst sentiment has softened, with target prices revised downward.`
            : `News coverage has been factual without strong directional bias. FII flows are mixed. Analyst views are split between HOLD and BUY with no strong consensus emerging.`,
        synthesis: s.llmBias === 'Bullish'
            ? `All three pillars — technicals, fundamentals, and sentiment — are aligned bullish, giving a high-conviction BUY setup. Entry in the ₹${buyLo}–${buyHi} zone offers favorable risk-reward. Watch for the earnings event as the next catalyst.`
            : s.llmBias === 'Bearish'
            ? `Bearish across all three categories. Recommend exiting existing positions or holding off on new entries. Wait for a clear basing pattern with improving fundamentals before reconsidering.`
            : `Mixed signals across categories with no high-conviction setup. Holders can continue holding; new entries should wait for clearer signals.`,
    };

    const newsArticles = generateMockNews(s);
    const topNews = newsArticles.slice(0, 3);
    const otherNews = newsArticles.slice(3);

    return `
        ${s._demo ? `
        <div class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <span class="text-amber-500 shrink-0">⚠</span>
            <div class="text-xs text-slate-700">
                <span class="font-semibold">Demo data.</span>
                No row in <code class="text-[11px]">stock_analysis</code> for ${s.symbol} yet — every number below is
                generated from the symbol to show the layout. This is the shape
                <code class="text-[11px]">GET /v1/all_stocks/card/${s.symbol}/full_analysis</code> needs to return.
            </div>
        </div>` : ''}

        <!-- LLM Analysis (full reasoning) -->
        <div>
            <h3 class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">LLM Analysis</h3>
            <div class="bg-gradient-to-br from-sky-50 to-teal-50 border border-sky-100 rounded-2xl p-5">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold text-sky-700 uppercase tracking-wide">Decision</span>
                    <span class="text-xs text-slate-500">Qwen3-32B · 21 Jun</span>
                </div>
                <div class="flex items-center gap-3 mb-5 flex-wrap">
                    <span class="text-xs font-medium px-2.5 py-1 rounded-full ${biasColor(s.llmBias)}">${s.llmBias}</span>
                    <span class="text-xs font-medium px-2.5 py-1 rounded border ${actionColor(s.llmAction)}">${s.llmAction}</span>
                    ${s.llmAction === 'HOLD' ? holdPill(s.hold_duration_days, s.hold_duration_label, s.hold_duration_reason, 'card') : ''}
                    <span class="text-xs text-slate-500">Conviction <span class="font-semibold text-slate-900">${(s.llmScore*100).toFixed(0)}/100</span></span>
                    <span class="text-xs text-slate-500">Valid for ${horizonDays}d</span>
                </div>

                <h4 class="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">Technical</h4>
                <p class="text-sm text-slate-700 leading-relaxed mb-4">${reasoning.technical}</p>

                <h4 class="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">Fundamental</h4>
                <p class="text-sm text-slate-700 leading-relaxed mb-4">${reasoning.fundamental}</p>

                <h4 class="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">Sentiment & News</h4>
                <p class="text-sm text-slate-700 leading-relaxed mb-4">${reasoning.sentiment}</p>

                <h4 class="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">Synthesis</h4>
                <p class="text-sm text-slate-700 leading-relaxed">${reasoning.synthesis}</p>
            </div>
        </div>

        <!-- Trade Setup -->
        <div>
            <h3 class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Trade Setup</h3>
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <div class="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">Buy range</div>
                    <div class="text-sm font-semibold text-slate-900">₹${buyLo.toLocaleString('en-IN')} – ₹${buyHi.toLocaleString('en-IN')}</div>
                    <div class="text-[10px] text-slate-500 mt-1">Near nearest support · ATR-adjusted</div>
                </div>
                <div class="bg-rose-50 border border-rose-100 rounded-lg p-3">
                    <div class="text-[10px] font-bold text-rose-700 uppercase tracking-widest mb-1">Sell range (short)</div>
                    <div class="text-sm font-semibold text-slate-900">₹${sellShortLo.toLocaleString('en-IN')} – ₹${sellShortHi.toLocaleString('en-IN')}</div>
                    <div class="text-[10px] text-slate-500 mt-1">First resistance · 1-2 week target</div>
                </div>
                <div class="bg-sky-50 border border-sky-100 rounded-lg p-3">
                    <div class="text-[10px] font-bold text-sky-700 uppercase tracking-widest mb-1">Sell range (positional)</div>
                    <div class="text-sm font-semibold text-slate-900">₹${sellPosLo.toLocaleString('en-IN')} – ₹${sellPosHi.toLocaleString('en-IN')}</div>
                    <div class="text-[10px] text-slate-500 mt-1">Analyst target ±5% · 1-3 month</div>
                </div>
                <div class="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <div class="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Stop loss</div>
                    <div class="text-sm font-semibold text-slate-900">₹${stopLoss.toLocaleString('en-IN')}</div>
                    <div class="text-[10px] text-slate-500 mt-1">Below 20D support · 1×ATR</div>
                </div>
            </div>
        </div>

        <!-- Key Risks (full list) -->
        <div>
            <h3 class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Key Risks</h3>
            <ul class="space-y-2 text-sm text-slate-700">
                <li class="flex gap-2"><span class="text-amber-500 shrink-0">⚠</span><span>Earnings due in ${20 + Math.floor(Math.random()*40)} days; surprise history mixed (missed 2/4)</span></li>
                <li class="flex gap-2"><span class="text-amber-500 shrink-0">⚠</span><span>${s.sector} sector facing margin pressure from input costs</span></li>
                <li class="flex gap-2"><span class="text-amber-500 shrink-0">⚠</span><span>FII flows have been net negative across sector in the last 5 sessions</span></li>
                <li class="flex gap-2"><span class="text-amber-500 shrink-0">⚠</span><span>USD/INR volatility could impact reported margins for export-oriented business</span></li>
            </ul>
        </div>

        <!-- News Sources -->
        <div>
            <h3 class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">News Sources Analyzed (${newsArticles.length})</h3>
            <p class="text-xs text-slate-500 mb-3">Top 3 articles were used with full markdown weight in the analysis. Remaining articles contributed via headlines only.</p>

            <div class="text-[10px] font-bold text-sky-700 uppercase tracking-widest mb-2">Top 3 — Full content</div>
            <div class="space-y-2 mb-5">
                ${topNews.map(n => `
                    <a href="${n.url}" target="_blank" rel="noopener" class="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-sky-300 hover:shadow-sm transition group">
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium text-slate-900 group-hover:text-sky-700 leading-snug">${n.title}</div>
                            <div class="text-xs text-slate-500 mt-1">${n.source} · ${n.date}</div>
                        </div>
                        <span class="text-xs text-slate-400 group-hover:text-sky-600 shrink-0 mt-1">↗</span>
                    </a>
                `).join('')}
            </div>

            <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Other articles — Headlines only</div>
            <ul class="space-y-2">
                ${otherNews.map(n => `
                    <li>
                        <a href="${n.url}" target="_blank" rel="noopener" class="flex items-start gap-2 text-sm hover:text-sky-600 transition group">
                            <span class="text-slate-400 group-hover:text-sky-500 mt-0.5">•</span>
                            <div class="flex-1">
                                <span class="text-slate-700 group-hover:text-sky-700">${n.title}</span>
                                <span class="text-xs text-slate-400 ml-1">— ${n.source} · ${n.date}</span>
                            </div>
                        </a>
                    </li>
                `).join('')}
            </ul>
        </div>

        <!-- Data Provenance -->
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Data Provenance</h3>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div><span class="text-slate-400">Financials:</span> <span class="text-slate-700">yfinance + nsepython</span></div>
                <div><span class="text-slate-400">Pulled at:</span> <span class="text-slate-700">21 Jun 17:32 IST</span></div>
                <div><span class="text-slate-400">News:</span> <span class="text-slate-700">${newsArticles.length} articles · Google News RSS</span></div>
                <div><span class="text-slate-400">Scraped at:</span> <span class="text-slate-700">21 Jun 17:35 IST</span></div>
                <div><span class="text-slate-400">LLM:</span> <span class="text-slate-700">Qwen3-32B (local)</span></div>
                <div><span class="text-slate-400">Analysis run:</span> <span class="text-slate-700">21 Jun 18:42 IST</span></div>
            </div>
        </div>
    `;
}

// Mock news article generator (placeholder URLs)
function generateMockNews(s) {
    const sources = ['Moneycontrol', 'Economic Times', 'Bloomberg', 'BusinessLine', 'Mint', 'Reuters', 'Hindustan Times', 'BusinessStandard', 'CNBC TV18', 'NDTV Profit'];
    const dates = ['21 Jun', '21 Jun', '20 Jun', '20 Jun', '19 Jun', '19 Jun', '18 Jun', '17 Jun', '16 Jun', '15 Jun', '14 Jun', '13 Jun'];
    const slug = s.symbol.replace('.NS', '').toLowerCase();
    const titles = [
        `${s.name} Q1 results beat estimates; revenue up 12% YoY`,
        `${s.name} announces strategic partnership; analyst targets raised`,
        `Why ${s.name} is on every analyst's buy list this week`,
        `${s.sector} sector update: ${s.name} leads on strong margins`,
        `${s.name} stock breakout: technical levels to watch`,
        `${s.name} earnings preview: what to expect from upcoming results`,
        `FII flows into ${s.name} spike; positioning turns bullish`,
        `${s.name}: brokerage upgrades on improved guidance`,
        `Insider buying in ${s.name} signals confidence`,
        `${s.name} board approves capex expansion plan`,
        `${s.name} hits 52-week high; momentum continues`,
        `Quarterly update: ${s.name} delivers across business segments`,
    ];
    const urlByName = {
        'Moneycontrol':      `https://www.moneycontrol.com/news/business/stocks/${slug}-${Math.floor(Math.random()*9000000+1000000)}.html`,
        'Economic Times':    `https://economictimes.indiatimes.com/markets/stocks/news/${slug}/articleshow/${Math.floor(Math.random()*9000000+1000000)}.cms`,
        'Bloomberg':         `https://www.bloomberg.com/news/articles/2026-06-21/${slug}-update`,
        'BusinessLine':      `https://www.thehindubusinessline.com/markets/stock-markets/${slug}/`,
        'Mint':              `https://www.livemint.com/market/stock-market-news/${slug}-${Math.floor(Math.random()*900+100)}`,
        'Reuters':           `https://www.reuters.com/markets/asia/${slug}-q1`,
        'Hindustan Times':   `https://www.hindustantimes.com/business/${slug}-news/`,
        'BusinessStandard':  `https://www.business-standard.com/markets/news/${slug}`,
        'CNBC TV18':         `https://www.cnbctv18.com/market/stocks/${slug}/`,
        'NDTV Profit':       `https://www.ndtvprofit.com/markets/${slug}-update`,
    };
    return titles.map((title, i) => ({
        title,
        source: sources[i % sources.length],
        date: dates[i],
        url: urlByName[sources[i % sources.length]] || '#',
    }));
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
// Clickable Combined chip — embeds the LLM + Raw reasoning so a click can explain the call.
// `hold` (optional) carries the LLM hold window; it surfaces only when the LLM action was HOLD.
function comboChip(comboAction, llmAct, rawAct, s, hold) {
    const llmReason = llmReasonFor(llmAct, s, hold);
    const rawReason = rawReasonFor(rawAct, s);
    const holdLabel = (llmAct === 'HOLD' && hold && hold.reason)
        ? (hold.label || (hold.days != null ? `~${hold.days} days` : 'Undetermined'))
        : '';
    const holdAttr = holdLabel ? ` data-hold-label="${escAttr(holdLabel)}"` : '';
    return `<span class="combo-chip text-xs font-semibold px-2.5 py-1 rounded-md border ${combinedColor(comboAction)}" `
         + `onclick="openComboPopover(event, this)" title="Why ${comboAction}? — tap for reasoning" `
         + `data-combo-action="${escAttr(comboAction)}" `
         + `data-llm-act="${escAttr(llmAct)}" data-llm-reason="${escAttr(llmReason)}" `
         + `data-raw-act="${escAttr(rawAct)}" data-raw-reason="${escAttr(rawReason)}"${holdAttr}>${comboAction}</span>`;
}
function checkCombinedMatch(combinedAct, actualPct) {
    const T = 0.5;                                       // flat-tolerance band (±%)
    const bullish = actualPct > T, bearish = actualPct < -T;
    // HOLD means "keep your position", so it's judged asymmetrically: a flat OR
    // rising stock is a good outcome (you took no loss) — only a drop past −T means
    // you'd have been better off selling. BUY/SELL stay symmetric (must move as called).
    const heldWithoutLoss = actualPct >= -T;
    return ((combinedAct === 'BUY'  || combinedAct === 'MIXED-BUY')  && bullish) ||
           ((combinedAct === 'SELL' || combinedAct === 'MIXED-SELL') && bearish) ||
           ((combinedAct === 'HOLD' || combinedAct === 'MIXED')      && heldWithoutLoss);
}

// Human-readable explanation for the ✓/✗ badge tooltip.
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

// History table with Combined decision column
function mockHistoryRows(s) {
    // ----- TODAY's row -----
    const todayLlmScore = Math.round(s.llmScore * 100);
    const todayPyScore  = s.pythonScore;
    const todayLlmAct = todayLlmScore > 65 ? 'BUY' : todayLlmScore < 35 ? 'SELL' : 'HOLD';
    const todayPyAct  = todayPyScore  > 65 ? 'BUY' : todayPyScore  < 35 ? 'SELL' : 'HOLD';
    const todayCombined = combineDecisions(todayPyAct, todayPyScore, todayLlmAct, todayLlmScore);
    const todayHold = (todayLlmAct === 'HOLD' && s.hold_duration_reason)
        ? { days: s.hold_duration_days, label: s.hold_duration_label, reason: s.hold_duration_reason }
        : null;

    const todayRow = `
        <div class="grid grid-cols-12 gap-2 items-center py-3 px-3 mb-2 bg-sky-50 border border-sky-200 rounded-lg">
            <div class="col-span-2 flex flex-col">
                <span class="text-xs font-semibold text-slate-900">21 Jun</span>
                <span class="text-[10px] font-bold text-sky-700 uppercase tracking-wider mt-0.5">Today</span>
            </div>
            <div class="col-span-2 flex items-center gap-1">
                <span class="text-xs font-medium px-2 py-0.5 rounded border ${actionColor(todayPyAct)}">${todayPyAct}</span>
                <span class="text-xs text-slate-400">${todayPyScore}</span>
            </div>
            <div class="col-span-2 flex items-center gap-1">
                <span class="text-xs font-medium px-2 py-0.5 rounded border ${actionColor(todayLlmAct)}">${todayLlmAct}</span>
                <span class="text-xs text-slate-400">${todayLlmScore}</span>
            </div>
            <div class="col-span-3 flex flex-col gap-0.5">
                <div class="flex items-center gap-1.5">
                    ${comboChip(todayCombined.action, todayLlmAct, todayPyAct, s, todayHold)}
                    <span class="text-xs text-slate-600 font-semibold">${todayCombined.score}</span>
                </div>
                ${todayCombined.mixed ? '<span class="text-[10px] text-slate-400">low conviction · methods disagree</span>' : ''}
            </div>
            <div class="col-span-2">
                <span class="text-xs font-medium px-2 py-0.5 rounded-full text-amber-700 bg-amber-50 inline-flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
                    Pending
                </span>
            </div>
            <div class="col-span-1 text-right">
                <span class="text-xs text-slate-400 italic">—</span>
            </div>
        </div>
    `;

    // ----- Past 5 days -----
    const dates = ['20 Jun', '19 Jun', '18 Jun', '17 Jun', '16 Jun'];
    const rows = dates.map((d, i) => {
        const llmScore = Math.max(20, Math.min(95, Math.round((s.llmScore*100) + (Math.random()*16 - 8))));
        const pyScore  = Math.max(20, Math.min(95, Math.round(s.pythonScore   + (Math.random()*16 - 8))));
        const llmAct = llmScore > 65 ? 'BUY' : llmScore < 35 ? 'SELL' : 'HOLD';
        const pyAct  = pyScore  > 65 ? 'BUY' : pyScore  < 35 ? 'SELL' : 'HOLD';
        const combined = combineDecisions(pyAct, pyScore, llmAct, llmScore);
        // LLM-only hold duration for this row (mock); Combined reuses it only when the LLM held with a window.
        const rowHold = llmAct === 'HOLD' ? mockRowHold(s, i) : null;

        const actualPct = +(Math.random()*4 - 2).toFixed(2);
        const actualColor = actualPct > 0.5 ? 'text-emerald-700 bg-emerald-50' :
                            actualPct < -0.5 ? 'text-rose-700 bg-rose-50' :
                            'text-slate-600 bg-slate-100';
        const matched = checkCombinedMatch(combined.action, actualPct);
        const matchTip = escAttr(matchTitle(combined.action, matched));
        const matchBadge = matched
            ? `<span class="text-sm font-bold text-emerald-600" title="${matchTip}">✓</span>`
            : `<span class="text-sm font-bold text-rose-500" title="${matchTip}">✗</span>`;

        return `
            <div class="grid grid-cols-12 gap-2 items-center py-2.5 px-3 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'} rounded-lg">
                <span class="col-span-2 text-xs font-medium text-slate-600">${d}</span>
                <div class="col-span-2 flex items-center gap-1">
                    <span class="text-xs font-medium px-2 py-0.5 rounded border ${actionColor(pyAct)}">${pyAct}</span>
                    <span class="text-xs text-slate-400">${pyScore}</span>
                </div>
                <div class="col-span-2 flex items-center gap-1">
                    <span class="text-xs font-medium px-2 py-0.5 rounded border ${actionColor(llmAct)}">${llmAct}</span>
                    <span class="text-xs text-slate-400">${llmScore}</span>
                </div>
                <div class="col-span-3 flex items-center gap-1.5">
                    ${comboChip(combined.action, llmAct, pyAct, s, rowHold)}
                    <span class="text-xs text-slate-600 font-semibold">${combined.score}</span>
                </div>
                <div class="col-span-2">
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full ${actualColor}">${actualPct > 0 ? '+' : ''}${actualPct}%</span>
                </div>
                <div class="col-span-1 text-right">${matchBadge}</div>
            </div>
        `;
    }).join('');

    // ----- Header -----
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
    return header + todayRow + rows;
}

// ----- Render Active Recommendations -----
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

// Live rows once /v1/commodities answers; the mock array until then.
let commodityData = commodities;
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
// clicking back and forth doesn't refetch. Keeps whatever is on screen if the
// request fails, so the view still works with the backend down.
async function loadCommodities(cat = commodityFilter) {
    const key = cat || 'all';
    if (commodityCache[key]) {
        commodityData = commodityCache[key];
        renderCommodities();
        return;
    }
    try {
        const { commodities: rows } = await api.commodities(key);
        commodityCache[key] = rows.map(toCommodityView);
        commodityData = commodityCache[key];
        renderCommodities();
    } catch (err) {
        console.warn('Commodities fetch failed — keeping current data:', err.message);
    }
}

function commodityStatTile(k, v) {
    return `<div class="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
                <div class="text-xs text-slate-400 font-semibold uppercase tracking-wide">${k}</div>
                <div class="text-sm font-semibold text-slate-900 mt-0.5">${v}</div>
            </div>`;
}

function renderCommodities() {
    const cats = commodityFilter === 'all' ? COMMODITY_CATS : [commodityFilter];
    document.getElementById('commodities-groups').innerHTML = cats.map(cat => {
        const items = commodityData.filter(d => d.cat === cat);
        if (!items.length) return '';
        const cards = items.map(d => {
            const up = d.chg >= 0;
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
                        <div class="text-xl font-bold text-slate-900">${commodityPrice(d.price)}<span class="text-xs font-medium text-slate-400 ml-1">${d.unit}</span></div>
                        <div class="text-sm font-semibold ${changeColor(d.chg)}">${up ? '▲' : '▼'} ${Math.abs(d.chg).toFixed(2)}%</div>
                    </div>
                    ${inrLine}
                    ${d.driver ? `<div class="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2.5">${d.driver}</div>` : ''}
                </div>`;
        }).join('');
        return `<div class="text-xs font-bold uppercase tracking-wider text-slate-400 mt-8 mb-3">${cat}</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">${cards}</div>`;
    }).join('');
}

// Reuses the shared #drawer-overlay centered modal (same one the stock cards use).
function openCommodity(sym) {
    const d = commodityData.find(x => x.sym === sym);
    if (!d) return;
    const up = d.chg >= 0;
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
            <div class="text-3xl font-bold text-slate-900">${commodityPrice(d.price)}<span class="text-sm font-medium text-slate-400 ml-1">USD${d.unit}</span></div>
            <div class="text-base font-semibold ${changeColor(d.chg)} pb-1">${up ? '▲' : '▼'} ${Math.abs(d.chg).toFixed(2)}%</div>
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
// The <select> in the All Stocks view has no id, so it's found by scope.
// If the backend isn't running the hardcoded <option>s in index.html stay
// as-is — the rest of the page still works off mock-data.js.
async function loadSectors() {
    const el = document.querySelector('#all-stocks-view select');
    if (!el) return;
    try {
        const sectors = await api.sectors();
        el.innerHTML = '<option value="">All sectors</option>'
            + sectors.map(s => `<option value="${escAttr(s)}">${escAttr(s)}</option>`).join('');
        el.onchange = (e) => onSectorChange(e.target.value);
    } catch (err) {
        console.warn('Sector fetch failed — keeping static options:', err.message);
    }
}

// ============================================================
// TOP BAR — live endpoint (GET /v1/home/basic_top_bar)
// ============================================================
// Renders every ticker the endpoint returns (indices, FX, VIX, oil) as a
// continuously scrolling strip. The four hardcoded rows in index.html are the
// fallback: if the backend isn't running they're simply left alone.

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
    const strip = document.querySelector('.overflow-x-auto');
    if (!strip) return;
    try {
        const { date, as_of, market_data } = await api.topBar();

        // Greeting's sibling row: [Today][date][·][Showing analysis for][as_of][(last NSE close)]
        const dateRow = document.querySelector('#home-view h1')?.nextElementSibling;
        if (dateRow) {
            const spans = dateRow.querySelectorAll('span');
            if (date) spans[1].textContent = date;
            if (as_of) spans[4].textContent = fmtAsOf(as_of);
        }

        if (!market_data.length) return;
        // Rendered twice: the ticker wraps from the end of copy 1 to the same
        // point in copy 2, which is pixel-identical, so the loop has no seam.
        const rows = market_data.map(topBarRow).join('');
        strip.innerHTML = rows + rows;
        strip.classList.add('market-strip');
        startTopBarTicker(strip, market_data.length);
    } catch (err) {
        console.warn('Top bar fetch failed — keeping static values:', err.message);
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
renderHomePicks();
loadSectors();
loadTopBar();
loadPicksSectors();
