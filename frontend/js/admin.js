// ============================================================
// ADMIN — section routing, rendering and actions
// Reads from admin-mock-data.js. Every place that will eventually
// call the backend is marked with TODO(api); nothing here does I/O.
// ============================================================

const esc = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ----- Toast (stands in for a save confirmation) -----
let toastTimer = null;
function adminToast(msg) {
    const el = document.getElementById('admin-toast');
    document.getElementById('admin-toast-text').textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ----- Section routing -----
const ADMIN_SECTIONS = ['overview', 'stocks', 'runs', 'users', 'models', 'prompts', 'news', 'schedule'];
const sectionRenderers = {
    overview: renderOverview,
    stocks:   renderAdminStocks,
    runs:     renderRuns,
    users:    renderUsers,
    models:   renderModels,
    prompts:  renderPrompts,
    news:     renderNewsConfig,
    schedule: renderSchedule,
};

function showAdminSection(name) {
    ADMIN_SECTIONS.forEach(s => {
        document.getElementById(`section-${s}`).classList.toggle('hidden', s !== name);
    });
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === name);
    });
    (sectionRenderers[name] || (() => {}))();
    window.scrollTo(0, 0);
    // Keeps the section in the URL so a refresh lands back where you were.
    try { history.replaceState(null, '', `#${name}`); } catch (e) {}
}

// ----- Shared bits -----
function statCard(label, value, sub, tone) {
    const toneCls = {
        ok:    'text-emerald-600',
        warn:  'text-amber-600',
        error: 'text-rose-600',
    }[tone] || 'text-slate-900';
    return `
        <div class="bg-white border border-slate-200 rounded-xl px-5 py-4">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">${label}</div>
            <div class="text-2xl font-bold ${toneCls}">${value}</div>
            ${sub ? `<div class="text-xs text-slate-500 mt-1">${sub}</div>` : ''}
        </div>`;
}

const statusDot = (status) => ({
    active:  '<span class="dot dot-ok"></span>',
    paused:  '<span class="dot dot-idle"></span>',
    error:   '<span class="dot dot-error"></span>',
    running: '<span class="dot dot-running"></span>',
}[status] || '<span class="dot dot-idle"></span>');

const stageBadge = (stage) => {
    const map = {
        done:      ['Complete',   'text-emerald-700 bg-emerald-50 border-emerald-200'],
        financial: ['Financials', 'text-rose-700 bg-rose-50 border-rose-200'],
        news:      ['News',       'text-amber-700 bg-amber-50 border-amber-200'],
        llm:       ['LLM',        'text-rose-700 bg-rose-50 border-rose-200'],
        queued:    ['Queued',     'text-sky-700 bg-sky-50 border-sky-200'],
    };
    const [label, cls] = map[stage] || ['—', 'text-slate-600 bg-slate-50 border-slate-200'];
    return `<span class="text-[11px] font-medium px-2 py-0.5 rounded border ${cls}">${label}</span>`;
};

// ============================================================
// OVERVIEW
// ============================================================
function renderOverview() {
    const s = adminStats;
    document.getElementById('overview-stats').innerHTML = [
        statCard('Stocks tracked', s.stocksTracked.toLocaleString('en-IN'), `${s.stocksActive} in the nightly universe`),
        statCard('Analysed today', s.analysedToday, `last run ${s.lastRunStarted}`, 'ok'),
        statCard('Failed today', s.failedToday, `${s.pendingToday} still pending`, s.failedToday ? 'error' : 'ok'),
        statCard('LLM calls today', s.llmCallsToday, `${s.tokensToday} tokens · ${s.lastRunDuration}`),
    ].join('');

    document.getElementById('overview-stages').innerHTML = adminRunStages.map(st => {
        const tone = st.duration === '—' ? 'dot-idle' : st.failed > 10 ? 'dot-error' : st.failed ? 'dot-warn' : 'dot-ok';
        return `
            <div class="admin-row px-5 py-3.5 border-b border-slate-100 last:border-0">
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <span class="dot ${tone}"></span>
                        <div class="min-w-0">
                            <div class="text-sm font-medium text-slate-900 truncate">${st.stage}</div>
                            <div class="text-[11px] text-slate-400 truncate">${esc(st.script)}</div>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-xs"><span class="text-emerald-600 font-semibold">${st.ok}</span> <span class="text-slate-400">ok</span> · <span class="${st.failed ? 'text-rose-600 font-semibold' : 'text-slate-400'}">${st.failed}</span> <span class="text-slate-400">failed</span></div>
                        <div class="text-[11px] text-slate-400 mt-0.5">${st.duration}</div>
                    </div>
                </div>
                ${st.note ? `<div class="text-[11px] text-slate-500 mt-1.5 ml-5">${esc(st.note)}</div>` : ''}
            </div>`;
    }).join('');

    const problems = adminStocks.filter(s2 => s2.status === 'error' || s2.stage !== 'done');
    document.getElementById('overview-attention').innerHTML = problems.length ? problems.map(p => `
        <div class="admin-row px-5 py-3.5 border-b border-slate-100 last:border-0 flex items-start justify-between gap-3">
            <div class="min-w-0">
                <div class="flex items-center gap-2">
                    ${statusDot(p.status)}
                    <span class="text-sm font-semibold text-slate-900">${p.symbol}</span>
                    ${stageBadge(p.stage)}
                </div>
                <div class="text-[11px] text-slate-500 mt-1 ml-4">${esc(p.note || 'Stopped before the LLM stage')}</div>
            </div>
            <button onclick="retryStock('${p.symbol}')" class="shrink-0 text-xs font-medium text-sky-700 hover:text-sky-900 hover:bg-sky-50 px-2.5 py-1 rounded-md transition">Retry</button>
        </div>`).join('')
        : '<div class="px-5 py-8 text-center text-sm text-slate-400">Nothing failing — last run was clean.</div>';
}

// ============================================================
// STOCKS
// ============================================================
let stockFilter = 'all';
const STOCK_FILTERS = ['all', 'active', 'paused', 'error'];

function setStockFilter(f) {
    stockFilter = f;
    renderAdminStocks();
}

function renderStockFilters() {
    document.getElementById('stock-filters').innerHTML = STOCK_FILTERS.map(f => {
        const n = f === 'all' ? adminStocks.length : adminStocks.filter(s => s.status === f).length;
        const cls = f === stockFilter
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900';
        const label = f[0].toUpperCase() + f.slice(1);
        return `<button onclick="setStockFilter('${f}')" class="px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${cls}">${label} <span class="opacity-60">${n}</span></button>`;
    }).join('');
}

function renderAdminStocks() {
    renderStockFilters();
    const q = (document.getElementById('stock-search').value || '').trim().toUpperCase();
    const rows = adminStocks.filter(s =>
        (stockFilter === 'all' || s.status === stockFilter) &&
        (!q || s.symbol.includes(q) || s.name.toUpperCase().includes(q))
    );

    document.getElementById('admin-stocks-list').innerHTML = rows.length ? rows.map(s => `
        <div class="admin-row grid grid-cols-12 gap-3 items-center px-5 py-3 border-b border-slate-100 last:border-0">
            <div class="col-span-3 min-w-0">
                <div class="flex items-center gap-2">
                    ${statusDot(s.status)}
                    <span class="text-sm font-semibold text-slate-900">${s.symbol}</span>
                </div>
                <div class="text-[11px] text-slate-400 truncate ml-4">${esc(s.name)}</div>
            </div>
            <div class="col-span-2 text-xs text-slate-600 truncate">${esc(s.sector)}</div>
            <div class="col-span-2 text-xs text-slate-600">${s.lastAnalysis}</div>
            <div class="col-span-2">${stageBadge(s.stage)}</div>
            <div class="col-span-1 text-right text-xs ${s.articles ? 'text-slate-600' : 'text-rose-600 font-semibold'}">${s.articles}</div>
            <div class="col-span-2 text-right whitespace-nowrap">
                <button onclick="toggleStockStatus('${s.symbol}')" class="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 transition">${s.status === 'paused' ? 'Resume' : 'Pause'}</button>
                <button onclick="retryStock('${s.symbol}')" class="text-xs font-medium text-sky-700 hover:text-sky-900 px-2 py-1 rounded-md hover:bg-sky-50 transition">Re-run</button>
            </div>
        </div>`).join('')
        : '<div class="px-5 py-10 text-center text-sm text-slate-400">No stocks match this filter.</div>';

    document.getElementById('admin-stocks-count').textContent =
        `Showing ${rows.length} of ${adminStocks.length} loaded · ${adminStats.stocksTracked.toLocaleString('en-IN')} total in the stocks table`;
}

function addStocks() {
    const input = document.getElementById('add-stock-symbol');
    const symbols = (input.value || '').toUpperCase().split(/[\s,]+/).filter(Boolean);
    if (!symbols.length) { adminToast('Enter at least one NSE symbol'); return; }

    const added = [], dupes = [];
    symbols.forEach(sym => {
        if (adminStocks.some(s => s.symbol === sym)) { dupes.push(sym); return; }
        // TODO(api): POST /admin/stocks { symbol } → server runs the fetch_stock.py path
        adminStocks.unshift({
            symbol: sym, name: 'Fetching metadata…', sector: '—', status: 'active',
            lastAnalysis: 'never', stage: 'queued', price: null, articles: 0, note: 'Queued for the next run',
        });
        added.push(sym);
    });

    input.value = '';
    renderAdminStocks();
    const parts = [];
    if (added.length) parts.push(`Queued ${added.join(', ')}`);
    if (dupes.length) parts.push(`${dupes.join(', ')} already tracked`);
    adminToast(parts.join(' · '));
}

function toggleStockStatus(symbol) {
    const s = adminStocks.find(x => x.symbol === symbol);
    if (!s) return;
    // TODO(api): PATCH /admin/stocks/{symbol} { status }
    s.status = s.status === 'paused' ? 'active' : 'paused';
    renderAdminStocks();
    adminToast(`${symbol} ${s.status === 'paused' ? 'paused' : 'resumed'}`);
}

function retryStock(symbol) {
    const s = adminStocks.find(x => x.symbol === symbol);
    if (!s) return;
    // TODO(api): POST /admin/stocks/{symbol}/rerun
    s.stage = 'queued';
    s.status = 'active';
    s.note = 'Re-queued manually';
    renderAdminStocks();
    renderOverview();
    adminToast(`Re-queued ${symbol} for analysis`);
}

// ============================================================
// PIPELINE RUNS
// ============================================================
let selectedRunId = adminRuns[0].id;

function renderRuns() {
    document.getElementById('admin-runs-list').innerHTML = adminRuns.map(r => {
        const selected = r.id === selectedRunId;
        const tone = r.failed > 20 ? 'text-rose-600' : r.failed ? 'text-amber-600' : 'text-emerald-600';
        return `
            <div onclick="selectRun('${r.id}')" class="admin-row grid grid-cols-12 gap-3 items-center px-5 py-3 border-b border-slate-100 last:border-0 cursor-pointer ${selected ? 'bg-sky-50' : ''}">
                <div class="col-span-3">
                    <div class="text-sm font-semibold text-slate-900">${r.date}</div>
                    <div class="text-[11px] text-slate-400">${r.id}</div>
                </div>
                <div class="col-span-2 text-xs text-slate-600">${r.started}</div>
                <div class="col-span-2 text-xs text-slate-600">${r.duration}</div>
                <div class="col-span-4 text-xs">
                    <span class="text-emerald-600 font-semibold">${r.ok}</span> analysed ·
                    <span class="${tone} font-semibold">${r.failed}</span> failed
                    ${r.pending ? ` · <span class="text-amber-600 font-semibold">${r.pending}</span> pending` : ''}
                </div>
                <div class="col-span-1 text-right">
                    <button onclick="event.stopPropagation(); openRunLog('${r.id}')" class="text-xs font-medium text-sky-700 hover:text-sky-900 px-2 py-1 rounded-md hover:bg-sky-50 transition">View</button>
                </div>
            </div>`;
    }).join('');

    const run = adminRuns.find(r => r.id === selectedRunId);
    document.getElementById('runs-selected-label').textContent = `${run.date} (${run.id})`;
    document.getElementById('runs-stages').innerHTML = adminRunStages.map(st => `
        <div class="admin-row grid grid-cols-12 gap-3 items-center px-5 py-3.5 border-b border-slate-100 last:border-0">
            <div class="col-span-4 min-w-0">
                <div class="text-sm font-medium text-slate-900">${st.stage}</div>
                <div class="text-[11px] text-slate-400 truncate">${esc(st.script)}</div>
            </div>
            <div class="col-span-3 text-xs text-slate-500">${esc(st.note)}</div>
            <div class="col-span-3 text-xs">
                <span class="text-emerald-600 font-semibold">${st.ok}</span> ok ·
                <span class="${st.failed ? 'text-rose-600 font-semibold' : 'text-slate-400'}">${st.failed}</span> failed
            </div>
            <div class="col-span-2 text-right text-xs text-slate-600">${st.duration}</div>
        </div>`).join('');
}

function selectRun(id) {
    selectedRunId = id;
    renderRuns();
}

function openRunLog(id) {
    const run = adminRuns.find(r => r.id === id);
    const failures = adminStocks.filter(s => s.note);
    openAdminModal(`
        <h2 class="text-xl font-bold tracking-tight">${run.date}</h2>
        <p class="text-sm text-slate-500 mt-1 mb-5">${run.id} · started ${run.started} · ${run.duration} · ${esc(run.status)}</p>

        <div class="grid grid-cols-3 gap-3 mb-6">
            ${statCard('Analysed', run.ok, '', 'ok')}
            ${statCard('Failed', run.failed, '', run.failed ? 'error' : 'ok')}
            ${statCard('Pending', run.pending, '', run.pending ? 'warn' : 'ok')}
        </div>

        <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Failures in this run</div>
        <div class="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-5">
            ${failures.length ? failures.map(f => `
                <div class="px-4 py-3 border-b border-slate-200 last:border-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-semibold text-slate-900">${f.symbol}</span>
                        ${stageBadge(f.stage)}
                    </div>
                    <div class="text-xs text-slate-600">${esc(f.note)}</div>
                </div>`).join('')
                : '<div class="px-4 py-6 text-center text-sm text-slate-400">No failures recorded.</div>'}
        </div>
        <p class="admin-hint">TODO(api): GET /admin/runs/{id}/log — full stdout per stock, streamed.</p>
    `);
}

// ============================================================
// USERS
// ============================================================
function renderUsers() {
    const admins = adminUsers.filter(u => u.role === 'admin').length;
    const positions = adminUsers.reduce((n, u) => n + u.holdings.length, 0);
    const invested = adminUsers.reduce((sum, u) =>
        sum + u.holdings.reduce((s, h) => s + h.entryPrice * h.qty, 0), 0);

    document.getElementById('users-stats').innerHTML = [
        statCard('Accounts', adminUsers.length, `${admins} admin · ${adminUsers.length - admins} standard`),
        statCard('Active', adminUsers.filter(u => u.status === 'active').length, `${adminUsers.filter(u => u.status !== 'active').length} suspended`),
        statCard('Tracked positions', positions, 'across all watchlists'),
        statCard('Total invested', `₹${invested.toLocaleString('en-IN')}`, 'at entry price'),
    ].join('');

    document.getElementById('admin-users-list').innerHTML = adminUsers.map(u => {
        const roleCls = u.role === 'admin'
            ? 'text-rose-700 bg-rose-50 border-rose-200'
            : 'text-slate-600 bg-slate-50 border-slate-200';
        const suspended = u.status !== 'active';
        return `
            <div onclick="openUser(${u.id})" class="admin-row grid grid-cols-12 gap-3 items-center px-5 py-3 border-b border-slate-100 last:border-0 cursor-pointer">
                <div class="col-span-4 min-w-0">
                    <div class="text-sm font-medium text-slate-900 truncate">${esc(u.name)}${suspended ? ' <span class="text-[10px] font-bold uppercase text-amber-600">suspended</span>' : ''}</div>
                    <div class="text-[11px] text-slate-400 truncate">${esc(u.email)}</div>
                </div>
                <div class="col-span-2"><span class="text-[11px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wide ${roleCls}">${u.role}</span></div>
                <div class="col-span-2 text-xs text-slate-600">${u.created}</div>
                <div class="col-span-2 text-xs text-slate-600">${u.lastLogin}</div>
                <div class="col-span-2 text-right text-sm font-semibold text-slate-900">${u.holdings.length}</div>
            </div>`;
    }).join('');
}

function openUser(id) {
    const u = adminUsers.find(x => x.id === id);
    if (!u) return;
    const invested = u.holdings.reduce((s, h) => s + h.entryPrice * h.qty, 0);
    const current  = u.holdings.reduce((s, h) => s + h.currentPrice * h.qty, 0);
    const pnl = current - invested;
    const pnlPct = invested ? (pnl / invested) * 100 : 0;
    const pnlCls = pnl >= 0 ? 'text-emerald-600' : 'text-rose-600';

    openAdminModal(`
        <div class="flex items-start gap-3 mb-1">
            <h2 class="text-xl font-bold tracking-tight">${esc(u.name)}</h2>
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wide ${u.role === 'admin' ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-600 bg-slate-50 border-slate-200'}">${u.role}</span>
        </div>
        <p class="text-sm text-slate-500 mb-5">${esc(u.email)} · joined ${u.created} · last login ${u.lastLogin}</p>

        <div class="grid grid-cols-3 gap-3 mb-6">
            ${statCard('Invested', `₹${invested.toLocaleString('en-IN')}`)}
            ${statCard('Current', `₹${current.toLocaleString('en-IN')}`)}
            ${statCard('P&L', `${pnl >= 0 ? '+' : '−'}₹${Math.abs(pnl).toLocaleString('en-IN')}`, `${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`, pnl >= 0 ? 'ok' : 'error')}
        </div>

        <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Holdings</div>
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
            <div class="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                <div class="col-span-3">Symbol</div>
                <div class="col-span-2 text-right">Qty</div>
                <div class="col-span-2 text-right">Entry</div>
                <div class="col-span-2 text-right">Current</div>
                <div class="col-span-3 text-right">P&L</div>
            </div>
            ${u.holdings.length ? u.holdings.map(h => {
                const hp = (h.currentPrice - h.entryPrice) * h.qty;
                const hpPct = ((h.currentPrice - h.entryPrice) / h.entryPrice) * 100;
                const cls = hp >= 0 ? 'text-emerald-600' : 'text-rose-600';
                return `
                    <div class="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-slate-100 last:border-0 items-center">
                        <div class="col-span-3">
                            <div class="text-sm font-medium text-slate-900">${h.symbol}</div>
                            <div class="text-[10px] text-slate-400">${h.entryDate}</div>
                        </div>
                        <div class="col-span-2 text-right text-xs text-slate-600">${h.qty}</div>
                        <div class="col-span-2 text-right text-xs text-slate-600">₹${h.entryPrice.toLocaleString('en-IN')}</div>
                        <div class="col-span-2 text-right text-xs text-slate-600">₹${h.currentPrice.toLocaleString('en-IN')}</div>
                        <div class="col-span-3 text-right text-xs font-semibold ${cls}">${hp >= 0 ? '+' : '−'}₹${Math.abs(hp).toLocaleString('en-IN')} (${hp >= 0 ? '+' : ''}${hpPct.toFixed(1)}%)</div>
                    </div>`;
            }).join('') : '<div class="px-4 py-6 text-center text-sm text-slate-400">No positions.</div>'}
        </div>

        <div class="flex gap-3">
            <button onclick="adminToast('TODO(api): PATCH /admin/users/${u.id} { role }')" class="flex-1 px-4 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-lg transition">
                ${u.role === 'admin' ? 'Revoke admin' : 'Make admin'}
            </button>
            <button onclick="adminToast('TODO(api): PATCH /admin/users/${u.id} { status }')" class="flex-1 px-4 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-lg transition">
                ${u.status === 'active' ? 'Suspend account' : 'Reactivate account'}
            </button>
        </div>
    `);
}

// ============================================================
// LLM MODELS
// ============================================================
const PROVIDERS = ['local', 'anthropic', 'openai', 'groq'];

function modelForm(key, title, subtitle, cfg) {
    const num = (label, field, value, step, hint) => `
        <div>
            <label class="admin-label">${label}</label>
            <input class="admin-input" type="number" step="${step}" value="${value}"
                   onchange="updateModelConfig('${key}','${field}', this.value)">
            ${hint ? `<p class="admin-hint">${hint}</p>` : ''}
        </div>`;
    return `
        <div class="bg-white border border-slate-200 rounded-xl p-5">
            <div class="mb-4">
                <h2 class="text-sm font-semibold">${title}</h2>
                <p class="text-xs text-slate-500 mt-0.5">${subtitle}</p>
            </div>
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="admin-label">Provider</label>
                        <select class="admin-select" onchange="updateModelConfig('${key}','provider', this.value)">
                            ${PROVIDERS.map(p => `<option ${p === cfg.provider ? 'selected' : ''}>${p}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="admin-label">Model</label>
                        <input class="admin-input" value="${esc(cfg.model)}" onchange="updateModelConfig('${key}','model', this.value)">
                    </div>
                </div>
                <div>
                    <label class="admin-label">Endpoint</label>
                    <input class="admin-input" value="${esc(cfg.endpoint)}" onchange="updateModelConfig('${key}','endpoint', this.value)">
                    <p class="admin-hint">OpenAI-compatible chat completions URL.</p>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    ${num('Temperature', 'temperature', cfg.temperature, '0.05', 'Low = repeatable JSON')}
                    ${num('Max tokens', 'maxTokens', cfg.maxTokens, '64', '')}
                    ${num('Timeout (s)', 'timeoutSec', cfg.timeoutSec, '5', '')}
                    ${num('Retries', 'retries', cfg.retries, '1', 'On malformed JSON or timeout')}
                </div>
                <label class="flex items-center justify-between gap-3 pt-1">
                    <span class="text-sm text-slate-700">Force JSON output</span>
                    <span class="switch">
                        <input type="checkbox" ${cfg.jsonMode ? 'checked' : ''} onchange="updateModelConfig('${key}','jsonMode', this.checked)">
                        <span class="track"><span class="thumb"></span></span>
                    </span>
                </label>
            </div>
            <div class="flex gap-2 mt-5 pt-4 border-t border-slate-100">
                <button onclick="saveModelConfig('${key}')" class="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition">Save</button>
                <button onclick="testModel('${key}')" class="px-4 py-2 border border-slate-200 hover:border-sky-300 text-slate-700 text-sm font-medium rounded-lg transition">Test connection</button>
            </div>
        </div>`;
}

function renderModels() {
    document.getElementById('models-forms').innerHTML =
        modelForm('analysis', 'Nightly analysis model',
                  'Runs once per stock per trading day against the full financial JSON + news digest.',
                  adminModelConfig.analysis)
      + modelForm('personalization', 'Watchlist personalization model',
                  'Small model, fires only when a user\'s personalized action diverges from the global call.',
                  adminModelConfig.personalization);
}

function updateModelConfig(key, field, value) {
    const numeric = ['temperature', 'maxTokens', 'timeoutSec', 'retries'];
    adminModelConfig[key][field] = numeric.includes(field) ? Number(value) : value;
}

function saveModelConfig(key) {
    // TODO(api): PUT /admin/config/models/{key}
    adminToast(`${key} model config staged (no backend yet) — ${adminModelConfig[key].model}`);
}

function testModel(key) {
    // TODO(api): POST /admin/config/models/{key}/test — one-shot ping to the endpoint
    adminToast(`Would ping ${adminModelConfig[key].endpoint}`);
}

// ============================================================
// PROMPTS
// ============================================================
let selectedPromptId = adminPrompts.find(p => p.active).id;

function renderPrompts() {
    document.getElementById('prompt-versions').innerHTML = adminPrompts.map(p => {
        const selected = p.id === selectedPromptId;
        return `
            <button onclick="selectPrompt('${p.id}')" class="w-full text-left px-3.5 py-3 rounded-lg border transition ${selected ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'}">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-medium text-slate-900 truncate">${esc(p.name)}</span>
                    ${p.active ? '<span class="text-[9px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">Live</span>' : ''}
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">${p.target} · ${p.updated}</div>
            </button>`;
    }).join('');

    const p = adminPrompts.find(x => x.id === selectedPromptId);
    const placeholders = [...new Set((p.body.match(/\{[a-z_]+\}/g) || []))];
    document.getElementById('prompt-editor').innerHTML = `
        <div class="bg-white border border-slate-200 rounded-xl p-5">
            <div class="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                    <h2 class="text-sm font-semibold">${esc(p.name)}</h2>
                    <p class="text-xs text-slate-500 mt-0.5">Target: <b>${p.target}</b> · last edited ${p.updated}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span id="prompt-size" class="text-[11px] text-slate-400"></span>
                    ${p.active
                        ? '<span class="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">Active</span>'
                        : `<button onclick="activatePrompt('${p.id}')" class="text-xs font-medium px-3 py-1.5 border border-slate-200 hover:border-sky-300 rounded-md text-slate-700 transition">Make active</button>`}
                </div>
            </div>

            <textarea id="prompt-body" class="admin-code" rows="22" oninput="updatePromptSize()">${esc(p.body)}</textarea>

            <div class="mt-3 flex flex-wrap items-center gap-2">
                <span class="text-[11px] text-slate-400">Placeholders:</span>
                ${placeholders.map(ph => `<code class="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">${esc(ph)}</code>`).join('')}
            </div>

            <div class="flex gap-2 mt-5 pt-4 border-t border-slate-100">
                <button onclick="savePrompt('${p.id}')" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition">Save as new version</button>
                <button onclick="dryRunPrompt('${p.id}')" class="px-4 py-2 border border-slate-200 hover:border-sky-300 text-slate-700 text-sm font-medium rounded-lg transition">Dry run on RELIANCE</button>
                <button onclick="renderPrompts()" class="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-lg transition">Revert</button>
            </div>
            <p class="admin-hint mt-3">Prompts live in <code>Scripts/Analysis/LLM_analysis.py</code> today — editing here needs them moved into a config table the pipeline reads at run time.</p>
        </div>`;
    updatePromptSize();
}

function selectPrompt(id) {
    selectedPromptId = id;
    renderPrompts();
}

function updatePromptSize() {
    const body = document.getElementById('prompt-body').value;
    // Rough estimate — real token counts come from the model's tokenizer.
    document.getElementById('prompt-size').textContent =
        `${body.length.toLocaleString('en-IN')} chars · ~${Math.round(body.length / 4).toLocaleString('en-IN')} tokens`;
}

function savePrompt(id) {
    const p = adminPrompts.find(x => x.id === id);
    // TODO(api): POST /admin/prompts { target, body } → creates a new version row
    p.body = document.getElementById('prompt-body').value;
    p.chars = p.body.length;
    adminToast(`Saved ${p.name} (local only — no backend yet)`);
}

function activatePrompt(id) {
    const p = adminPrompts.find(x => x.id === id);
    // TODO(api): POST /admin/prompts/{id}/activate — one active version per target
    adminPrompts.filter(x => x.target === p.target).forEach(x => { x.active = false; });
    p.active = true;
    renderPrompts();
    adminToast(`${p.name} is now the active ${p.target} prompt`);
}

function dryRunPrompt(id) {
    // TODO(api): POST /admin/prompts/{id}/dry-run { symbol } → returns the filled prompt + LLM output
    adminToast('Would fill the prompt with RELIANCE data and show the raw LLM JSON');
}

// ============================================================
// NEWS SOURCES
// ============================================================
function renderNewsConfig() {
    const c = adminNewsConfig;
    const field = (label, field2, value, hint, type = 'text', step = '1') => `
        <div>
            <label class="admin-label">${label}</label>
            <input class="admin-input" type="${type}" step="${step}" value="${esc(value)}"
                   onchange="updateNewsConfig('${field2}', this.value)">
            ${hint ? `<p class="admin-hint">${hint}</p>` : ''}
        </div>`;

    document.getElementById('news-form').innerHTML = `
        <div class="grid lg:grid-cols-2 gap-6">
            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <h2 class="text-sm font-semibold mb-4">Feed</h2>
                <div class="space-y-4">
                    ${field('RSS template', 'rssTemplate', c.rssTemplate, 'Must contain {stock_name}.')}
                    <div class="grid grid-cols-3 gap-3">
                        ${field('Articles / stock', 'articlesPerStock', c.articlesPerStock, '', 'number')}
                        ${field('Top-news cutoff', 'topNewsCount', c.topNewsCount, 'is_top_news', 'number')}
                        ${field('Full content', 'fullContentCount', c.fullContentCount, 'Scraped in full', 'number')}
                    </div>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <h2 class="text-sm font-semibold mb-4">Scraping</h2>
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-3">
                        ${field('Min content chars', 'minContentChars', c.minContentChars, 'Below this = paywalled', 'number', '50')}
                        ${field('Impersonate', 'impersonate', c.impersonate, 'curl_cffi profile')}
                        ${field('Delay min (s)', 'delayMinSec', c.delayMinSec, '', 'number', '0.1')}
                        ${field('Delay max (s)', 'delayMaxSec', c.delayMaxSec, '', 'number', '0.1')}
                    </div>
                    ${field('Decoder interval', 'decoderInterval', c.decoderInterval, 'gnewsdecoder pacing', 'number')}
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <h2 class="text-sm font-semibold mb-1">Paywall signals</h2>
                <p class="text-xs text-slate-500 mb-3">Extracted text containing any of these is discarded; the RSS summary is used instead.</p>
                <textarea class="admin-code" rows="6" onchange="updateNewsList('paywallSignals', this.value)">${esc(c.paywallSignals.join('\n'))}</textarea>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <h2 class="text-sm font-semibold mb-1">Blocked sources</h2>
                <p class="text-xs text-slate-500 mb-3">Domains dropped before scraping. One per line.</p>
                <textarea class="admin-code" rows="6" onchange="updateNewsList('blockedSources', this.value)">${esc(c.blockedSources.join('\n'))}</textarea>
            </div>
        </div>

        <div class="flex gap-2 mt-5">
            <button onclick="saveNewsConfig()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition">Save</button>
            <button onclick="adminToast('Would fetch the RSS feed for RELIANCE and show what comes back')" class="px-4 py-2 border border-slate-200 hover:border-sky-300 text-slate-700 text-sm font-medium rounded-lg transition">Test feed</button>
        </div>`;
}

function updateNewsConfig(field, value) {
    const numeric = ['articlesPerStock', 'topNewsCount', 'fullContentCount', 'minContentChars', 'delayMinSec', 'delayMaxSec', 'decoderInterval'];
    adminNewsConfig[field] = numeric.includes(field) ? Number(value) : value;
}

function updateNewsList(field, value) {
    adminNewsConfig[field] = value.split('\n').map(s => s.trim()).filter(Boolean);
}

function saveNewsConfig() {
    // TODO(api): PUT /admin/config/news
    adminToast('News config staged (no backend yet)');
}

// ============================================================
// SCHEDULE
// ============================================================
function renderSchedule() {
    const s = adminSchedule;
    document.getElementById('schedule-form').innerHTML = `
        <div class="grid lg:grid-cols-2 gap-6">
            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <h2 class="text-sm font-semibold mb-4">Nightly batch</h2>
                <div class="space-y-4">
                    <label class="flex items-center justify-between gap-3">
                        <span class="text-sm text-slate-700">Schedule enabled</span>
                        <span class="switch">
                            <input type="checkbox" ${s.enabled ? 'checked' : ''} onchange="updateSchedule('enabled', this.checked)">
                            <span class="track"><span class="thumb"></span></span>
                        </span>
                    </label>
                    <div>
                        <label class="admin-label">Cron expression</label>
                        <input class="admin-input" value="${esc(s.cron)}" onchange="updateSchedule('cron', this.value)">
                        <p class="admin-hint">Weekdays at 18:00 — after the NSE close, before the news cycle turns over.</p>
                    </div>
                    <div>
                        <label class="admin-label">Timezone</label>
                        <input class="admin-input" value="${esc(s.timezone)}" onchange="updateSchedule('timezone', this.value)">
                    </div>
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-5">
                <h2 class="text-sm font-semibold mb-4">Execution</h2>
                <div class="space-y-4">
                    <div>
                        <label class="admin-label">Concurrency</label>
                        <input class="admin-input" type="number" value="${s.concurrency}" onchange="updateSchedule('concurrency', this.value)">
                        <p class="admin-hint">Parallel stocks. NSE and Google News both rate-limit — keep it low.</p>
                    </div>
                    <label class="flex items-center justify-between gap-3">
                        <span class="text-sm text-slate-700">Stop the whole run on first error</span>
                        <span class="switch">
                            <input type="checkbox" ${s.stopOnError ? 'checked' : ''} onchange="updateSchedule('stopOnError', this.checked)">
                            <span class="track"><span class="thumb"></span></span>
                        </span>
                    </label>
                    <div class="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                        <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Next run</div>
                        <div class="text-sm font-semibold text-slate-900 mt-0.5">${esc(s.nextRun)}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex gap-2 mt-5">
            <button onclick="saveSchedule()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition">Save</button>
            <button onclick="adminToast('TODO(api): POST /admin/runs — triggers the orchestrator now')" class="px-4 py-2 border border-slate-200 hover:border-sky-300 text-slate-700 text-sm font-medium rounded-lg transition">▶ Run now</button>
        </div>`;
}

function updateSchedule(field, value) {
    adminSchedule[field] = field === 'concurrency' ? Number(value) : value;
}

function saveSchedule() {
    // TODO(api): PUT /admin/config/schedule
    adminToast(`Schedule staged: ${adminSchedule.cron} (${adminSchedule.timezone})`);
}

// ============================================================
// MODAL
// ============================================================
function openAdminModal(html) {
    document.getElementById('admin-modal-content').innerHTML = html;
    const overlay = document.getElementById('admin-modal-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

function closeAdminModal() {
    const overlay = document.getElementById('admin-modal-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAdminModal(); });

// ============================================================
// INIT
// ============================================================
// TODO(api): GET /admin/me — the signed-in admin, used to gate this page server-side.
document.getElementById('admin-identity').textContent =
    `${adminUsers.find(u => u.role === 'admin').email} · admin`;

const initialSection = ADMIN_SECTIONS.includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : 'overview';
showAdminSection(initialSection);
