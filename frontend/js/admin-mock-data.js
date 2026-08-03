// ============================================================
// ADMIN MOCK DATA
// Stand-in for the admin API. Same idea as mock-data.js: this is
// the layer that gets deleted once the backend serves real rows.
// ============================================================

// ----- Top-of-page pipeline health -----
const adminStats = {
    stocksTracked:   2381,   // rows in the SQLite `stocks` table
    stocksActive:    487,    // subset actually analysed each night
    analysedToday:   461,
    failedToday:     7,
    pendingToday:    19,
    lastRunStarted:  '21 Jun 2026, 18:02 IST',
    lastRunDuration: '41m 18s',
    llmCallsToday:   461,
    tokensToday:     '3.42M',
    newsArticles:    5_412,
    dbSize:          '3.1 MB',
};

// ----- Tracked stocks (the analysis universe) -----
// `status`: active | paused | error   ·   `stage` is where the last run stopped.
const adminStocks = [
    {symbol:'RELIANCE',   name:'Reliance Industries',       sector:'Energy',             status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:1358,  articles:12, note:''},
    {symbol:'TCS',        name:'Tata Consultancy Services', sector:'IT',                 status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:3987,  articles:14, note:''},
    {symbol:'HDFCBANK',   name:'HDFC Bank',                 sector:'Financial Services', status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:1672,  articles:9,  note:''},
    {symbol:'INFY',       name:'Infosys',                   sector:'IT',                 status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:1782,  articles:11, note:''},
    {symbol:'ICICIBANK',  name:'ICICI Bank',                sector:'Financial Services', status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:1245,  articles:8,  note:''},
    {symbol:'ITC',        name:'ITC Limited',               sector:'FMCG',               status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:472,   articles:7,  note:''},
    {symbol:'BHARTIARTL', name:'Bharti Airtel',             sector:'Telecom',            status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:1567,  articles:10, note:''},
    {symbol:'GCHOTELS',   name:'Grand Continent Hotels',    sector:'Consumer',           status:'error',  lastAnalysis:'19 Jun 2026', stage:'financial', price:112,   articles:2,  note:'yfinance returned no fundamentals (SME listing)'},
    {symbol:'WIPRO',      name:'Wipro',                     sector:'IT',                 status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:524,   articles:6,  note:''},
    {symbol:'MARUTI',     name:'Maruti Suzuki',             sector:'Auto',               status:'error',  lastAnalysis:'20 Jun 2026', stage:'llm',       price:11842, articles:9,  note:'LLM returned malformed JSON (unterminated string) — retried 2×'},
    {symbol:'SUNPHARMA',  name:'Sun Pharmaceutical',        sector:'Pharma',             status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:1823,  articles:8,  note:''},
    {symbol:'ASIANPAINT', name:'Asian Paints',              sector:'Consumer',           status:'paused', lastAnalysis:'12 Jun 2026', stage:'done',      price:2734,  articles:5,  note:'Paused manually — thin news coverage'},
    {symbol:'TATAMOTORS', name:'Tata Motors',               sector:'Auto',               status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:782,   articles:13, note:''},
    {symbol:'KOTAKBANK',  name:'Kotak Mahindra Bank',       sector:'Financial Services', status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:1748,  articles:7,  note:''},
    {symbol:'LT',         name:'Larsen & Toubro',           sector:'Construction',       status:'active', lastAnalysis:'21 Jun 2026', stage:'news',      price:3562,  articles:0,  note:'Google News RSS timed out — headlines only'},
    {symbol:'AXISBANK',   name:'Axis Bank',                 sector:'Financial Services', status:'active', lastAnalysis:'21 Jun 2026', stage:'done',      price:1138,  articles:6,  note:''},
];

// ----- Nightly pipeline runs -----
const adminRuns = [
    {id:'run_20260621', date:'21 Jun 2026', started:'18:02', duration:'41m 18s', ok:461, failed:7,  pending:19, status:'completed'},
    {id:'run_20260620', date:'20 Jun 2026', started:'18:01', duration:'38m 04s', ok:479, failed:8,  pending:0,  status:'completed'},
    {id:'run_20260619', date:'19 Jun 2026', started:'18:03', duration:'52m 47s', ok:452, failed:35, pending:0,  status:'completed with errors'},
    {id:'run_20260618', date:'18 Jun 2026', started:'18:02', duration:'36m 55s', ok:484, failed:3,  pending:0,  status:'completed'},
    {id:'run_20260617', date:'17 Jun 2026', started:'18:02', duration:'39m 12s', ok:480, failed:7,  pending:0,  status:'completed'},
];

// ----- Per-stage breakdown of the latest run -----
// Mirrors the real pipeline: processed.py → Sentiments.py → LLM_analysis.py → SQLite write.
const adminRunStages = [
    {stage:'Financial data',  script:'Scripts/Generation/processed.py',   ok:481, failed:6,  duration:'18m 22s', note:'yfinance + nsepython'},
    {stage:'News + sentiment',script:'Scripts/Generation/Sentiments.py',  ok:468, failed:19, duration:'14m 51s', note:'Google News RSS → trafilatura → Mongo'},
    {stage:'LLM analysis',    script:'Scripts/Analysis/LLM_analysis.py',  ok:461, failed:7,  duration:'7m 44s',  note:'Qwen3-32B (local)'},
    {stage:'Raw analysis',    script:'Scripts/Analysis/RAW_analysis.py',  ok:0,   failed:0,  duration:'—',       note:'Not implemented yet — stub'},
    {stage:'DB write',        script:'stock_analysis (SQLite)',           ok:461, failed:0,  duration:'0m 21s',  note:'Table not created yet — schema only'},
];

// ----- User accounts -----
// `role: 'admin'` is the flag that gates this page (see the build note in admin.html).
const adminUsers = [
    {
        id: 1, email: 'admin@gmail.com', name: 'Aryan', role: 'admin',
        created: '02 Mar 2026', lastLogin: '21 Jun 2026, 19:40', status: 'active',
        holdings: [
            {symbol:'RELIANCE',   qty:5, entryPrice:1340, entryDate:'15 Jun 2026', currentPrice:1358},
            {symbol:'TCS',        qty:2, entryPrice:3850, entryDate:'12 Jun 2026', currentPrice:3987},
            {symbol:'BHARTIARTL', qty:3, entryPrice:1200, entryDate:'10 May 2026', currentPrice:1567},
        ],
    },
    {
        id: 2, email: 'meera.nair@example.com', name: 'Meera Nair', role: 'user',
        created: '18 Apr 2026', lastLogin: '21 Jun 2026, 09:12', status: 'active',
        holdings: [
            {symbol:'HDFCBANK',   qty:6, entryPrice:1700, entryDate:'05 Jun 2026', currentPrice:1672},
            {symbol:'TATAMOTORS', qty:8, entryPrice:720,  entryDate:'10 Jun 2026', currentPrice:782},
        ],
    },
    {
        id: 3, email: 'rahul.deshpande@example.com', name: 'Rahul Deshpande', role: 'user',
        created: '30 Apr 2026', lastLogin: '20 Jun 2026, 22:03', status: 'active',
        holdings: [
            {symbol:'MARUTI', qty:1, entryPrice:12000, entryDate:'01 Jun 2026', currentPrice:11842},
            {symbol:'INFY',   qty:12, entryPrice:1690, entryDate:'28 May 2026', currentPrice:1782},
            {symbol:'ITC',    qty:40, entryPrice:455,  entryDate:'14 Apr 2026', currentPrice:472},
        ],
    },
    {
        id: 4, email: 'sana.qureshi@example.com', name: 'Sana Qureshi', role: 'user',
        created: '11 May 2026', lastLogin: '19 Jun 2026, 17:48', status: 'active',
        holdings: [
            {symbol:'SUNPHARMA', qty:9, entryPrice:1740, entryDate:'03 Jun 2026', currentPrice:1823},
        ],
    },
    {
        id: 5, email: 'ops@stocksight.internal', name: 'Ops Bot', role: 'admin',
        created: '02 Mar 2026', lastLogin: '21 Jun 2026, 18:02', status: 'active',
        holdings: [],
    },
    {
        id: 6, email: 'karan.jain@example.com', name: 'Karan Jain', role: 'user',
        created: '02 Jun 2026', lastLogin: '08 Jun 2026, 11:20', status: 'suspended',
        holdings: [
            {symbol:'WIPRO', qty:25, entryPrice:560, entryDate:'04 Jun 2026', currentPrice:524},
        ],
    },
];

// ----- Model configuration -----
// Two models: the nightly batch analyst, and the small model that only fires
// for the divergent watchlist rows (see the Watchlist build notes on index.html).
const adminModelConfig = {
    analysis: {
        provider: 'local',            // local | anthropic | openai | groq
        model: 'Qwen3-32B',
        endpoint: 'http://127.0.0.1:8000/v1/chat/completions',
        temperature: 0.2,
        maxTokens: 2048,
        timeoutSec: 120,
        retries: 2,
        jsonMode: true,
    },
    personalization: {
        provider: 'local',
        model: 'Qwen2.5-7B-Instruct',
        endpoint: 'http://127.0.0.1:8000/v1/chat/completions',
        temperature: 0.3,
        maxTokens: 400,
        timeoutSec: 30,
        retries: 1,
        jsonMode: false,
    },
};

// ----- Prompt versions -----
// `body` is an abridged copy of ANALYSIS_PROMPT in Scripts/Analysis/LLM_analysis.py.
const adminPrompts = [
    {
        id: 'analysis_v3', name: 'Analysis prompt · v3', target: 'analysis',
        updated: '19 Jun 2026', active: true, chars: 6480,
        body: `You are an experienced equity analyst covering Indian stocks listed on NSE/BSE.
Your task: synthesize the structured financial data and news digest below into
a single stock analysis, following the exact JSON schema specified.

FIELD GLOSSARY (for the input financial JSON)
- All fields ending in "_pct" are already in percent units (e.g., 12 = 12%, NOT 0.12)
- "roce_quality": High >15%, Moderate 8-15%, Low <8%
- "trend_summary": EMA-based — short=close vs 20DMA, medium=20 vs 50 DMA, long=50 vs 200 DMA
- Null, "N/A", "No Data" mean unavailable — skip silently

RULES
1. Buy/Sell ranges and Stop-Loss must be derived from real technical levels in the JSON.
2. Bias scores must be floats 0.0-1.0 (0.0=strongly bearish, 0.5=neutral, 1.0=strongly bullish).
3. If a value cannot be confidently determined, use null. NEVER invent values.
4. Reasoning: exactly 4-6 sentences. Technical + fundamental + sentiment + flow.
5. Key risks: 2-3 concrete, stock-specific items.
7. Output JSON ONLY. No markdown fences, no preamble.
8. HOLD DURATION (only when short_term_action is HOLD): populate hold_duration_days
   and hold_duration_reason from a real, time-bound trigger.
9. UNDETERMINED HOLD: no catalyst → hold_duration_days = null, say so in the reason.
10. NON-HOLD actions: both duration fields null.

NOW ANALYZE THIS STOCK
Symbol: {symbol}
Trading Date: {trading_date}

FINANCIAL JSON:
{financial_json}

NEWS DIGEST (last 7 days, headline + excerpt per article):
{news_digest}

Output the JSON now.`,
    },
    {
        id: 'analysis_v2', name: 'Analysis prompt · v2', target: 'analysis',
        updated: '11 Jun 2026', active: false, chars: 5120,
        body: `[v2 — superseded by v3, which added the hold-duration rules 8-10]

You are an experienced equity analyst covering Indian stocks listed on NSE/BSE.
Synthesize the financial data and news digest into a single stock analysis
following the JSON schema. Output JSON only.

Symbol: {symbol}
Trading Date: {trading_date}
FINANCIAL JSON:
{financial_json}
NEWS DIGEST:
{news_digest}`,
    },
    {
        id: 'personalize_v1', name: 'Watchlist divergence · v1', target: 'personalization',
        updated: '20 Jun 2026', active: true, chars: 1180,
        body: `The global analysis for {symbol} says {llm_action}, but this user's position
suggests {personalized_action}.

User position: entry ₹{entry_price} on {entry_date}, qty {qty}, currently {pnl_pct}%.
Global reasoning: {synthesis_reasoning}
Top risk: {top_risk}
Rule-engine reason: {personalized_reason}

Write 2-3 sentences explaining why the general call is {llm_action} but this
specific holder should {personalized_action}. Reference their entry price and P&L.
Frame it as "the system suggests", never "you should". No financial-advice language.`,
    },
];

// ----- News / scraping configuration -----
const adminNewsConfig = {
    rssTemplate: 'https://news.google.com/rss/search?q={stock_name}&hl=en-IN&gl=IN&ceid=IN:en',
    articlesPerStock: 20,
    topNewsCount: 8,
    fullContentCount: 3,
    minContentChars: 300,
    delayMinSec: 0.5,
    delayMaxSec: 2.0,
    decoderInterval: 1,
    impersonate: 'chrome110',
    paywallSignals: [
        'click the box below',
        'you are not a robot',
        'subscribe now',
        'to continue reading',
        'sign in to continue',
    ],
    blockedSources: ['example-spam-aggregator.com', 'stocktipsdaily.in'],
};

// ----- Schedule / job configuration -----
const adminSchedule = {
    enabled: true,
    cron: '0 18 * * 1-5',
    timezone: 'Asia/Kolkata',
    concurrency: 4,
    stopOnError: false,
    nextRun: '22 Jun 2026, 18:00 IST',
};
