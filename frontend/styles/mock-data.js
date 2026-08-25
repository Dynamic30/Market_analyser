// ============================================================
// MOCK-DATA REFERENCE — backend-free render of the whole tracker
// ============================================================
// Pairs with mock-data.html. Every view renders from the MOCK object
// below, which is shaped to mirror the live /v1 endpoint responses so
// this file doubles as a spec for what each endpoint should return.
//
// Field notes (what the CURRENT endpoints do NOT return yet, so the live
// app shows "—" / empty for them — the mock fills them to show the target):
//   llm_reasoning, risks, hold_duration, price_ranges  — not in /all_stocks/stocks SELECT
//   tech_score, fund_score, flow_score, raw_signals, python_reasoning — not selected
//   combined_score / combined_action — columns exist, no pipeline writes them (derived client-side)
//   commodity analysis fields (bias, driver, trend, rsi, ranges, risks) — no columns yet
// ============================================================

// ----- Mirrors GET /v1/home/basic_top_bar → { date, as_of, market_data[] } -----
const MOCK_TOPBAR = {
    date: 'Monday, 23 Aug 2026',
    as_of: '2026-08-21',
    market_data: [
        { name: 'NIFTY 50',     ticker: '^NSEI',      price: 24812.45, p_change: 0.42, direction: 'up' },
        { name: 'SENSEX',       ticker: '^BSESN',      price: 81250.10, p_change: 0.38, direction: 'up' },
        { name: 'NIFTY BANK',   ticker: '^NSEBANK',    price: 52340.80, p_change: -0.21, direction: 'down' },
        { name: 'NIFTY IT',     ticker: '^CNXIT',      price: 41280.55, p_change: 1.12, direction: 'up' },
        { name: 'INDIA VIX',    ticker: '^INDIAVIX',   price: 13.42,    p_change: 2.30, direction: 'up' },
        { name: 'USD/INR',      ticker: 'INR=X',       price: 85.70,    p_change: 0.08, direction: 'up' },
        { name: 'CRUDE OIL',    ticker: 'CL=F',        price: 73.15,    p_change: -1.05, direction: 'down' },
        { name: 'GOLD',         ticker: 'GC=F',        price: 2510.30,  p_change: 0.55, direction: 'up' },
    ],
};

// ----- Mirrors GET /v1/all_stocks/sector and /v1/home/sector → string[] -----
const MOCK_SECTORS = ['Energy', 'IT', 'Financial Services', 'FMCG', 'Telecom', 'Construction', 'Auto', 'Pharma', 'Consumer'];

// ----- Mirrors GET /v1/all_stocks/stocks → row[] (snake_case, from SQL) -----
// Rows carry the FULL target field set. Live /all_stocks/stocks returns a
// subset today (see header note); the extra fields here are the spec for
// extending that SELECT.
const MOCK_STOCKS = [
    { nse_symbol:'RELIANCE.NS', company_name:'Reliance Industries', sector:'Energy', industry:'Oil & Gas Refining & Marketing', isin:'INE002A01018', market_cap:1840000000000, price:1358, day_change_pct:-1.4, overall_bias_label:'Mixed', overall_bias_score:0.52, short_term_action:'HOLD', python_score:58, python_action:'HOLD', analysis_date:'2026-08-21', business_summary:'Conglomerate spanning hydrocarbons, retail, digital services, and media. India’s largest private-sector company by revenue.', llm_reasoning:{technical:'Above 20D EMA but below 50D EMA — near-term momentum mixed.', fundamental:'ROCE healthy at 9.2%, retail/digital ramp offsetting O2C weakness.', sentiment:'News flow neutral; telecom ARPU tailwind priced in.', synthesis:'Technicals constructive with price above 20D EMA, ROCE healthy, FII flows turning supportive. Continue holding while support at ₹1,311 holds.'}, risks:['Earnings in 12 days; surprise history is mixed','Regulatory overhang on telecom AGR dues'], hold_duration:'1-2 weeks', hold_duration_days:11, hold_duration_label:'1–2 weeks', hold_duration_reason:'Hold through Q1 earnings on 3 Jul; re-evaluate the ₹1,434 breakout once the print lands.', price_ranges:{buy_range:[1320,1340], sell_range_short:[1420,1450], stop_loss:1295}, tech_score:54, fund_score:62, flow_score:58, raw_signals:{rsi_14:48, ema_20:1340, ema_50:1311, ema_200:1245, atr:28, pe:24.5, roce:9.2, debt_to_equity:0.42, operating_margin:14.1, revenue_growth:11.2}, python_reasoning:'Above 20D EMA with stable ROCE and improving delivery %. Momentum neutral; flows supportive. Score held back by elevated PE and modest revenue growth.' },
    { nse_symbol:'TCS.NS', company_name:'Tata Consultancy Services', sector:'IT', industry:'Information Technology Services', isin:'INE467B01029', market_cap:1440000000000, price:3987, day_change_pct:0.8, overall_bias_label:'Bullish', overall_bias_score:0.71, short_term_action:'BUY', python_score:74, python_action:'BUY', analysis_date:'2026-08-21', business_summary:'India’s largest IT services company, providing consulting, technology, and business solutions globally.', llm_reasoning:{technical:'Clean breakout above 200D EMA on rising volume.', fundamental:'Deal pipeline strong, margin resilience 24.8%.', sentiment:'Positive on US spend recovery commentary.', synthesis:'Bullish bias intact across timeframes. Revenue growth resilient, deal pipeline strong. Hold through Q1 results.'}, risks:['US tech spending slowdown could pressure FY revenue guidance'], tech_score:78, fund_score:72, flow_score:74, raw_signals:{rsi_14:62, ema_20:3920, ema_50:3810, ema_200:3680, atr:64, pe:28.1, roce:18.4, debt_to_equity:0.08, operating_margin:24.8, revenue_growth:9.4}, python_reasoning:'Breakout above 200D EMA with volume confirmation. High ROCE, low leverage, expanding margins. Strong composite.' },
    { nse_symbol:'HDFCBANK.NS', company_name:'HDFC Bank', sector:'Financial Services', industry:'Private Sector Bank', isin:'INE040A01034', market_cap:1270000000000, price:1672, day_change_pct:0.3, overall_bias_label:'Bullish', overall_bias_score:0.68, short_term_action:'BUY', python_score:71, python_action:'BUY', analysis_date:'2026-08-21', business_summary:'India’s largest private sector bank by assets, offering retail and corporate banking, loans, and credit cards.', llm_reasoning:{technical:'Holding above 50D EMA, accumulation visible.', fundamental:'Credit growth 16%, NIM stabilising.', sentiment:'Neutral post-merger integration.', synthesis:'Neutral signals across categories. NIM under pressure but credit growth steady. No urgent directional bias.'}, risks:['NIM compression from deposit competition'], tech_score:70, fund_score:74, flow_score:69, raw_signals:{rsi_14:55, ema_20:1655, ema_50:1620, ema_200:1580, atr:24, pe:19.2, roce:15.6, debt_to_equity:0.0, operating_margin:28.0, revenue_growth:16.1}, python_reasoning:'Stable ROCE, strong credit growth, low leverage. Technicals constructive above 50D EMA.' },
    { nse_symbol:'INFY.NS', company_name:'Infosys', sector:'IT', industry:'Information Technology Services', isin:'INE009A01021', market_cap:740000000000, price:1782, day_change_pct:1.4, overall_bias_label:'Bullish', overall_bias_score:0.66, short_term_action:'BUY', python_score:68, python_action:'BUY', analysis_date:'2026-08-21', business_summary:'Global IT services and consulting company. Second-largest Indian IT services exporter.', llm_reasoning:{technical:'Above all key EMAs, RSI in bullish zone.', fundamental:'Guidance raised, large deals signing.', sentiment:'Positive.', synthesis:'Bullish setup; large-deal momentum supports forward revenue.'}, risks:['Client-specific discretionary spend cuts'], tech_score:72, fund_score:66, flow_score:67, raw_signals:{rsi_14:60, ema_20:1760, ema_50:1720, ema_200:1660, atr:30, pe:26.0, roce:16.8, debt_to_equity:0.10, operating_margin:21.0, revenue_growth:7.8}, python_reasoning:'Above key EMAs with rising volume. Solid fundamentals, fair valuation.' },
    { nse_symbol:'ICICIBANK.NS', company_name:'ICICI Bank', sector:'Financial Services', industry:'Private Sector Bank', isin:'INE090A01021', market_cap:870000000000, price:1245, day_change_pct:0.7, overall_bias_label:'Bullish', overall_bias_score:0.64, short_term_action:'BUY', python_score:66, python_action:'BUY', analysis_date:'2026-08-21', business_summary:'Second largest private sector bank in India, providing retail, corporate, and rural banking services.', llm_reasoning:{technical:'Trend up, shallow pullbacks.', fundamental:'Asset quality improving, NPA declining.', sentiment:'Positive.', synthesis:'Strong franchise, improving asset quality — bias bullish.'}, risks:['Unsecured retail credit quality'], tech_score:66, fund_score:70, flow_score:62, raw_signals:{rsi_14:57, ema_20:1230, ema_50:1200, ema_200:1150, atr:18, pe:18.5, roce:14.2, debt_to_equity:0.0, operating_margin:26.0, revenue_growth:14.5}, python_reasoning:'Improving asset quality and steady credit growth. Technical trend intact.' },
    { nse_symbol:'ITC.NS', company_name:'ITC Limited', sector:'FMCG', industry:'Diversified FMCG', isin:'INE154A01025', market_cap:590000000000, price:472, day_change_pct:-0.2, overall_bias_label:'Mixed', overall_bias_score:0.54, short_term_action:'HOLD', python_score:55, python_action:'HOLD', analysis_date:'2026-08-21', business_summary:'Diversified conglomerate with leading positions in cigarettes, FMCG, hotels, paperboards, and agribusiness.', llm_reasoning:{technical:'Range-bound near 20D EMA.', fundamental:'Stable cash flows, FMCG growth steady.', sentiment:'Neutral.', synthesis:'Range-bound; hold above ₹465 support until a volume-backed breakout.'}, risks:['Cigarette taxation hike in Union Budget'], hold_duration:'~3 days', hold_duration_days:3, hold_duration_label:'~3 days', hold_duration_reason:'Holding above the 20D EMA near ₹468; re-check if it breaks ₹465 support.', tech_score:50, fund_score:60, flow_score:55, raw_signals:{rsi_14:49, ema_20:468, ema_50:460, ema_200:440, atr:8, pe:22.0, roce:28.0, debt_to_equity:0.0, operating_margin:31.0, revenue_growth:6.0}, python_reasoning:'High ROCE, zero leverage, but slow growth. Range-bound technically.' },
    { nse_symbol:'HINDUNILVR.NS', company_name:'Hindustan Unilever', sector:'FMCG', industry:'Personal Products', isin:'INE030A01027', market_cap:580000000000, price:2487, day_change_pct:0.4, overall_bias_label:'Neutral', overall_bias_score:0.51, short_term_action:'HOLD', python_score:52, python_action:'HOLD', analysis_date:'2026-08-21', business_summary:'India’s largest FMCG company, manufacturing personal care, home care, and food products.', llm_reasoning:{technical:'Range-bound between support and resistance.', fundamental:'Volume growth muted, margins under pressure.', sentiment:'Neutral.', synthesis:'Range-bound between ₹2,460 support and ₹2,540 resistance; wait for a volume-backed breakout.'}, risks:['Rural demand recovery slower than expected'], hold_duration:'~5 days', hold_duration_days:5, hold_duration_label:'~5 days', hold_duration_reason:'Range-bound between ₹2,460 support and ₹2,540 resistance; wait for a volume-backed breakout.', tech_score:48, fund_score:58, flow_score:50, raw_signals:{rsi_14:51, ema_20:2480, ema_50:2460, ema_200:2400, atr:34, pe:48.0, roce:20.5, debt_to_equity:0.0, operating_margin:18.0, revenue_growth:4.0}, python_reasoning:'Defensive name, expensive valuation. Slow growth caps upside.' },
    { nse_symbol:'BHARTIARTL.NS', company_name:'Bharti Airtel', sector:'Telecom', industry:'Telecom Services', isin:'INE397D01024', market_cap:910000000000, price:1567, day_change_pct:1.8, overall_bias_label:'Bullish', overall_bias_score:0.69, short_term_action:'BUY', python_score:70, python_action:'BUY', analysis_date:'2026-08-21', business_summary:'India’s second-largest telecom operator and a leading global player with operations in 17 countries.', llm_reasoning:{technical:'Strong uptrend, ARPU expansion.', fundamental:'Subscriber additions accelerating.', sentiment:'Positive.', synthesis:'Strong momentum with subscriber additions accelerating, ARPU expansion ongoing. Expected 10-day upside ~₹40 from current.'}, risks:['Already at +30.6% — risk-reward less favorable from here','Spectrum payment obligations'], tech_score:74, fund_score:66, flow_score:70, raw_signals:{rsi_14:64, ema_20:1540, ema_50:1490, ema_200:1380, atr:26, pe:32.0, roce:12.5, debt_to_equity:1.1, operating_margin:21.0, revenue_growth:13.0}, python_reasoning:'Strong momentum, improving ARPU. Elevated leverage and valuation temper the score.' },
    { nse_symbol:'KOTAKBANK.NS', company_name:'Kotak Mahindra Bank', sector:'Financial Services', industry:'Private Sector Bank', isin:'INE237A01028', market_cap:350000000000, price:1748, day_change_pct:-0.5, overall_bias_label:'Neutral', overall_bias_score:0.48, short_term_action:'HOLD', python_score:51, python_action:'HOLD', analysis_date:'2026-08-21', business_summary:'Private sector bank offering banking, investment banking, asset management, and broking services.', llm_reasoning:{technical:'Range-bound, no near-term catalyst.', fundamental:'Stable but growth modest.', sentiment:'Neutral.', synthesis:'Range-bound with no near-term catalyst — re-evaluate in ~5 sessions.'}, risks:['RBI restrictions on digital onboarding'], hold_duration:'Undetermined', hold_duration_days:null, hold_duration_label:'Undetermined', hold_duration_reason:'Range-bound with no near-term catalyst — re-evaluate in ~5 sessions.', tech_score:50, fund_score:56, flow_score:47, raw_signals:{rsi_14:47, ema_20:1740, ema_50:1730, ema_200:1700, atr:22, pe:20.5, roce:13.0, debt_to_equity:0.0, operating_margin:25.0, revenue_growth:8.0}, python_reasoning:'Stable but unexciting. Range-bound, no catalyst.' },
    { nse_symbol:'LT.NS', company_name:'Larsen & Toubro', sector:'Construction', industry:'Engineering, Construction & Infra', isin:'INE018A01030', market_cap:490000000000, price:3562, day_change_pct:0.6, overall_bias_label:'Bullish', overall_bias_score:0.62, short_term_action:'BUY', python_score:64, python_action:'BUY', analysis_date:'2026-08-21', business_summary:'India’s largest engineering and construction conglomerate. Operates across heavy engineering, infra, and IT services.', llm_reasoning:{technical:'Order book at record highs.', fundamental:'Infra capex cycle supportive.', sentiment:'Positive.', synthesis:'Order book strength and infra capex cycle support a bullish bias.'}, risks:['Working capital cyclicality'], tech_score:64, fund_score:66, flow_score:62, raw_signals:{rsi_14:58, ema_20:3520, ema_50:3450, ema_200:3300, atr:52, pe:30.0, roce:14.0, debt_to_equity:0.6, operating_margin:11.0, revenue_growth:15.0}, python_reasoning:'Record order book, infra cycle supportive. Leverage moderate.' },
    { nse_symbol:'MARUTI.NS', company_name:'Maruti Suzuki', sector:'Auto', industry:'Passenger Vehicles', isin:'INE585B01010', market_cap:370000000000, price:11842, day_change_pct:-0.9, overall_bias_label:'Mixed', overall_bias_score:0.46, short_term_action:'NEUTRAL', python_score:48, python_action:'NEUTRAL', analysis_date:'2026-08-21', business_summary:'India’s largest passenger car manufacturer. Subsidiary of Suzuki Motor Corporation, Japan.', llm_reasoning:{technical:'Below 20D and 50D EMAs, breakdown confirmed.', fundamental:'Margin pressure from commodity costs.', sentiment:'Cautious.', synthesis:'Trend has turned with price below 20D and 50D EMAs. Volume confirming the breakdown. Auto sector facing margin pressure.'}, risks:['EV competition intensifying in domestic market','Commodity cost inflation'], tech_score:42, fund_score:52, flow_score:44, raw_signals:{rsi_14:38, ema_20:12000, ema_50:12200, ema_200:11800, atr:140, pe:27.0, roce:10.0, debt_to_equity:0.0, operating_margin:9.0, revenue_growth:5.0}, python_reasoning:'Below key EMAs, RSI weak. Margin pressure weighs on fundamentals.' },
    { nse_symbol:'AXISBANK.NS', company_name:'Axis Bank', sector:'Financial Services', industry:'Private Sector Bank', isin:'INE238A01034', market_cap:350000000000, price:1138, day_change_pct:0.2, overall_bias_label:'Neutral', overall_bias_score:0.50, short_term_action:'HOLD', python_score:54, python_action:'HOLD', analysis_date:'2026-08-21', business_summary:'Third largest private sector bank in India, offering financial services to retail, corporate, and SME customers.', llm_reasoning:{technical:'Momentum fading into monthly expiry.', fundamental:'NIM improving, asset quality stable.', sentiment:'Neutral.', synthesis:'Neutral; reassess after F&O settlement.'}, risks:['Wholesale deposit competition'], hold_duration:'~2 days', hold_duration_days:2, hold_duration_label:'~2 days', hold_duration_reason:'Momentum fading into monthly expiry; reassess after F&O settlement on 26 Jun.', tech_score:52, fund_score:58, flow_score:52, raw_signals:{rsi_14:50, ema_20:1130, ema_50:1120, ema_200:1080, atr:16, pe:16.0, roce:13.5, debt_to_equity:0.0, operating_margin:24.0, revenue_growth:12.0}, python_reasoning:'Stable fundamentals, neutral technicals.' },
    { nse_symbol:'WIPRO.NS', company_name:'Wipro', sector:'IT', industry:'Information Technology Services', isin:'INE075A01022', market_cap:270000000000, price:524, day_change_pct:-1.2, overall_bias_label:'Bearish', overall_bias_score:0.32, short_term_action:'SELL', python_score:36, python_action:'SELL', analysis_date:'2026-08-21', business_summary:'Global IT, consulting, and business process services company. Part of the Azim Premji-led Wipro group.', llm_reasoning:{technical:'Below all key EMAs, downtrend.', fundamental:'Growth lagging peers.', sentiment:'Negative.', synthesis:'Structurally weak; growth lagging the IT pack.'}, risks:['Client concentration in BFSI'], tech_score:34, fund_score:42, flow_score:32, raw_signals:{rsi_14:34, ema_20:530, ema_50:545, ema_200:560, atr:9, pe:22.0, roce:10.0, debt_to_equity:0.05, operating_margin:17.0, revenue_growth:1.0}, python_reasoning:'Below all EMAs, weak RSI. Growth lagging peers.' },
    { nse_symbol:'SUNPHARMA.NS', company_name:'Sun Pharmaceutical', sector:'Pharma', industry:'Pharmaceuticals', isin:'INE044A01036', market_cap:440000000000, price:1823, day_change_pct:1.1, overall_bias_label:'Bullish', overall_bias_score:0.65, short_term_action:'BUY', python_score:67, python_action:'BUY', analysis_date:'2026-08-21', business_summary:'India’s largest pharmaceutical company and the world’s fifth-largest specialty generic pharma company.', llm_reasoning:{technical:'Breakout from consolidation.', fundamental:'Specialty pipeline ramping.', sentiment:'Positive.', synthesis:'Bullish; specialty franchise scaling.'}, risks:['US FDA observations on Halol plant'], tech_score:68, fund_score:64, flow_score:66, raw_signals:{rsi_14:61, ema_20:1800, ema_50:1760, ema_200:1680, atr:28, pe:26.0, roce:16.0, debt_to_equity:0.05, operating_margin:22.0, revenue_growth:11.0}, python_reasoning:'Breakout with strong specialty momentum. Solid fundamentals.' },
    { nse_symbol:'ASIANPAINT.NS', company_name:'Asian Paints', sector:'Consumer', industry:'Paints', isin:'INE021A01026', market_cap:260000000000, price:2734, day_change_pct:-0.3, overall_bias_label:'Neutral', overall_bias_score:0.49, short_term_action:'HOLD', python_score:52, python_action:'HOLD', analysis_date:'2026-08-21', business_summary:'India’s largest paint company and the world’s 10th largest. Markets decorative coatings, industrial coatings, and bath fittings.', llm_reasoning:{technical:'Above 50D EMA support.', fundamental:'Input cost pressure on margins.', sentiment:'Neutral.', synthesis:'Hold above ₹2,700 50D EMA support; re-check if input-cost news breaks the level.'}, risks:['Crude-derived input cost spike'], hold_duration:'~1 week', hold_duration_days:7, hold_duration_label:'~1 week', hold_duration_reason:'Hold above the ₹2,700 50D EMA support; re-check if input-cost news breaks the level.', tech_score:50, fund_score:54, flow_score:48, raw_signals:{rsi_14:49, ema_20:2720, ema_50:2700, ema_200:2620, atr:38, pe:55.0, roce:25.0, debt_to_equity:0.0, operating_margin:19.0, revenue_growth:6.0}, python_reasoning:'Defensive, expensive. Input costs pressure margins.' },
    { nse_symbol:'TATAMOTORS.NS', company_name:'Tata Motors', sector:'Auto', industry:'Commercial & Passenger Vehicles', isin:'INE155A01022', market_cap:290000000000, price:782, day_change_pct:2.1, overall_bias_label:'Bullish', overall_bias_score:0.72, short_term_action:'BUY', python_score:73, python_action:'BUY', analysis_date:'2026-08-21', business_summary:'India’s largest auto company by revenue. Owns Jaguar Land Rover and is a leader in EVs in India.', llm_reasoning:{technical:'Breakout above 200D EMA with volume.', fundamental:'JLR margins recovering, domestic EV share rising.', sentiment:'Positive.', synthesis:'Conviction strengthened to 73/100. Technical breakout above 200D EMA with strong volume. JLR margins recovering.'}, risks:['EV competition intensifying in domestic market'], tech_score:76, fund_score:70, flow_score:73, raw_signals:{rsi_14:66, ema_20:760, ema_50:720, ema_200:700, atr:14, pe:15.0, roce:11.0, debt_to_equity:1.0, operating_margin:10.0, revenue_growth:18.0}, python_reasoning:'Breakout above 200D EMA with volume. JLR recovery and domestic EV momentum.' },
];

// ----- Mirrors GET /v1/all_stocks/card/{stock} → { metadata, history[] } -----
// history rows mirror CardHistoryAnalysis (schemas.py). `matched` is the DB
// column ('true'/'false'/'pending'); combined_score/_action are null in the
// mock too (derived client-side) to match the real column gap.
const MOCK_CARDS = {
    'RELIANCE.NS': {
        metadata: { date:'2026-08-21', company_name:'Reliance Industries', nse_symbol:'RELIANCE.NS', sector:'Energy', market_cap:'18.4L Cr', current_price:1358, about:'Conglomerate spanning hydrocarbons, retail, digital services, and media. India’s largest private-sector company by revenue.', ISIN:'INE002A01018' },
        history: [
            { analysis_date:'2026-08-21', python_score:58, python_action:'HOLD', overall_bias_score:0.52, short_term_action:'HOLD', combined_score:null, combined_action:null, actual_close_pct:-1.4, matched:'pending' },
            { analysis_date:'2026-08-20', python_score:60, python_action:'HOLD', overall_bias_score:0.55, short_term_action:'HOLD', combined_score:null, combined_action:null, actual_close_pct:0.3, matched:'true' },
            { analysis_date:'2026-08-19', python_score:62, python_action:'BUY', overall_bias_score:0.61, short_term_action:'BUY', combined_score:null, combined_action:null, actual_close_pct:1.1, matched:'true' },
            { analysis_date:'2026-08-18', python_score:55, python_action:'HOLD', overall_bias_score:0.49, short_term_action:'HOLD', combined_score:null, combined_action:null, actual_close_pct:-0.6, matched:'false' },
        ],
    },
    'TCS.NS': {
        metadata: { date:'2026-08-21', company_name:'Tata Consultancy Services', nse_symbol:'TCS.NS', sector:'IT', market_cap:'14.4L Cr', current_price:3987, about:'India’s largest IT services company, providing consulting, technology, and business solutions globally.', ISIN:'INE467B01029' },
        history: [
            { analysis_date:'2026-08-21', python_score:74, python_action:'BUY', overall_bias_score:0.71, short_term_action:'BUY', combined_score:null, combined_action:null, actual_close_pct:0.8, matched:'pending' },
            { analysis_date:'2026-08-20', python_score:72, python_action:'BUY', overall_bias_score:0.69, short_term_action:'BUY', combined_score:null, combined_action:null, actual_close_pct:1.2, matched:'true' },
            { analysis_date:'2026-08-19', python_score:70, python_action:'BUY', overall_bias_score:0.67, short_term_action:'BUY', combined_score:null, combined_action:null, actual_close_pct:0.4, matched:'true' },
        ],
    },
};

// ----- Mirrors GET /v1/commodities/{sector}/commodity → { commodities[] } -----
// One flat list; the render code filters by category client-side (matches the
// live /commodities/{sector}/commodity shape per category).
const MOCK_COMMODITIES = [
    { ticker:'GC=F',  name:'Gold',           category:'Metals',      price:2510.30, p_change:0.55,  unit:'oz', as_of:'2026-08-21' },
    { ticker:'SI=F',  name:'Silver',         category:'Metals',      price:29.40,   p_change:1.10,  unit:'oz', as_of:'2026-08-21' },
    { ticker:'HG=F',  name:'Copper',         category:'Metals',      price:4.18,    p_change:-0.40, unit:'lb', as_of:'2026-08-21' },
    { ticker:'CL=F',  name:'Crude Oil',      category:'Energy',      price:73.15,   p_change:-1.05, unit:'bbl', as_of:'2026-08-21' },
    { ticker:'NG=F',  name:'Natural Gas',    category:'Energy',      price:2.34,    p_change:2.10,  unit:'MMBtu', as_of:'2026-08-21' },
    { ticker:'ZC=F',  name:'Corn',           category:'Agriculture', price:412.50,  p_change:0.30,  unit:'bu', as_of:'2026-08-21' },
    { ticker:'ZS=F',  name:'Soybeans',       category:'Agriculture', price:1010.20, p_change:-0.60, unit:'bu', as_of:'2026-08-21' },
    { ticker:'KC=F',  name:'Coffee',         category:'Agriculture', price:245.80,  p_change:1.80,  unit:'lb', as_of:'2026-08-21' },
    { ticker:'LE=F',  name:'Live Cattle',    category:'Livestock',   price:185.40,  p_change:0.20,  unit:'lb', as_of:'2026-08-21' },
    { ticker:'HE=F',  name:'Lean Hogs',      category:'Livestock',   price:92.10,   p_change:-0.50, unit:'lb', as_of:'2026-08-21' },
];

// ----- Mirrors GET /v1/all_stocks/card/{stock}/full_analysis → object -----
// Full expanded analysis: reasoning, ranges, risks, and raw signals. Used by
// the dialog's "View full analysis" section. Shaped like the real endpoint
// target so this mock acts as the spec.
const MOCK_FULL_ANALYSIS = {
    'RELIANCE.NS': {
        date: '2026-08-21',
        overall_bias_label: 'Mixed',
        overall_bias_score: 0.52,
        short_term_action: 'HOLD',
        long_term_action: 'BUY',
        python_score: 58,
        python_action: 'HOLD',
        combined_score: 55,
        combined_action: 'HOLD',
        python_reasoning: 'Above 20D EMA with stable ROCE and improving delivery %. Momentum neutral; flows supportive. Score held back by elevated PE and modest revenue growth.',
        llm_reasoning: {
            technical: 'Price above 20D EMA but below 50D EMA — near-term momentum mixed.',
            fundamental: 'ROCE healthy at 9.2%, retail/digital ramp offsetting O2C weakness.',
            sentiment: 'News flow neutral; telecom ARPU tailwind priced in.',
            synthesis: 'Technicals constructive with price above 20D EMA, ROCE healthy, FII flows turning supportive. Continue holding while support at ₹1,311 holds.'
        },
        risks: ['Earnings in 12 days; surprise history is mixed', 'Regulatory overhang on telecom AGR dues'],
        hold_duration: '1–2 weeks',
        hold_duration_days: 11,
        hold_duration_reason: 'Hold through Q1 earnings on 3 Jul; re-evaluate the ₹1,434 breakout once the print lands.',
        price_ranges: { buy_range: [1320, 1340], sell_range_short: [1420, 1450], sell_range_positional: [1480, 1520], stop_loss: 1295 },
        raw_signals: { rsi_14: 48, ema_20: 1340, ema_50: 1311, ema_200: 1245, atr: 28, pe: 24.5, roce: 9.2, debt_to_equity: 0.42, operating_margin: 14.1, revenue_growth: 11.2 }
    },
    'TCS.NS': {
        date: '2026-08-21',
        overall_bias_label: 'Bullish',
        overall_bias_score: 0.71,
        short_term_action: 'BUY',
        long_term_action: 'BUY',
        python_score: 74,
        python_action: 'BUY',
        combined_score: 73,
        combined_action: 'BUY',
        python_reasoning: 'Breakout above 200D EMA with volume confirmation. High ROCE, low leverage, expanding margins. Strong composite.',
        llm_reasoning: {
            technical: 'Clean breakout above 200D EMA on rising volume.',
            fundamental: 'Deal pipeline strong, margin resilience 24.8%.',
            sentiment: 'Positive on US spend recovery commentary.',
            synthesis: 'Bullish bias intact across timeframes. Revenue growth resilient, deal pipeline strong. Hold through Q1 results.'
        },
        risks: ['US tech spending slowdown could pressure FY revenue guidance'],
        hold_duration: '2–3 weeks',
        hold_duration_days: 18,
        hold_duration_reason: 'Momentum breakout; reassess if price closes back below the 200D EMA.',
        price_ranges: { buy_range: [3900, 3950], sell_range_short: [4150, 4200], sell_range_positional: [4300, 4400], stop_loss: 3820 },
        raw_signals: { rsi_14: 62, ema_20: 3920, ema_50: 3810, ema_200: 3680, atr: 64, pe: 28.1, roce: 18.4, debt_to_equity: 0.08, operating_margin: 24.8, revenue_growth: 9.4 }
    },
    'HDFCBANK.NS': {
        date: '2026-08-21',
        overall_bias_label: 'Bullish',
        overall_bias_score: 0.68,
        short_term_action: 'BUY',
        long_term_action: 'BUY',
        python_score: 71,
        python_action: 'BUY',
        combined_score: 70,
        combined_action: 'BUY',
        python_reasoning: 'Stable ROCE, strong credit growth, low leverage. Technicals constructive above 50D EMA.',
        llm_reasoning: {
            technical: 'Holding above 50D EMA, accumulation visible.',
            fundamental: 'Credit growth 16%, NIM stabilising.',
            sentiment: 'Neutral post-merger integration.',
            synthesis: 'Neutral signals across categories. NIM under pressure but credit growth steady. No urgent directional bias.'
        },
        risks: ['NIM compression from deposit competition'],
        hold_duration: '2–4 weeks',
        hold_duration_days: 21,
        hold_duration_reason: 'Hold while the stock stays above the 50D EMA; reassess if NIM trends worsen.',
        price_ranges: { buy_range: [1640, 1660], sell_range_short: [1720, 1750], sell_range_positional: [1780, 1820], stop_loss: 1600 },
        raw_signals: { rsi_14: 55, ema_20: 1655, ema_50: 1620, ema_200: 1580, atr: 24, pe: 19.2, roce: 15.6, debt_to_equity: 0, operating_margin: 28, revenue_growth: 16.1 }
    }
};

// ----- Watchlist (no live endpoint yet — mirrors mock-data.js) -----
const MOCK_WATCHLIST = [
    { symbol:'RELIANCE.NS', name:'Reliance Industries', entryPrice:1340, entryDate:'15 Jun', currentPrice:1358, qty:5, llmAction:'HOLD', actionDaysTotal:7, actionDaysRemaining:4, llmSynthesis:'Technicals constructive with price above 20D EMA, ROCE healthy, FII flows turning supportive. Continue holding while support at ₹1,311 holds.', topRisk:'Earnings in 12 days; surprise history is mixed', personalizedAction:'HOLD', personalizedReason:'Bias supports your +1.3% position. Continue holding.' },
    { symbol:'TCS.NS', name:'Tata Consultancy Services', entryPrice:3850, entryDate:'12 Jun', currentPrice:3987, qty:2, llmAction:'HOLD', actionDaysTotal:10, actionDaysRemaining:6, llmSynthesis:'Bullish bias intact across timeframes. Revenue growth resilient, deal pipeline strong. Hold through Q1 results.', topRisk:'US tech spending slowdown could pressure FY revenue guidance', personalizedAction:'HOLD', personalizedReason:'Strong thesis intact, +3.6% on the right side. Continue holding.' },
    { symbol:'HDFCBANK.NS', name:'HDFC Bank', entryPrice:1700, entryDate:'05 Jun', currentPrice:1672, qty:6, llmAction:'HOLD', actionDaysTotal:14, actionDaysRemaining:2, llmSynthesis:'Neutral signals across categories. NIM under pressure but credit growth steady. No urgent directional bias.', topRisk:'Approaching re-evaluation window — only 2 days of conviction left', personalizedAction:'WAIT', personalizedReason:'At −1.6% with no exit signal. Hold for recovery, but re-evaluation due in 2 days.' },
    { symbol:'BHARTIARTL.NS', name:'Bharti Airtel', entryPrice:1200, entryDate:'10 May', currentPrice:1567, qty:3, llmAction:'BUY', actionDaysTotal:10, actionDaysRemaining:8, llmSynthesis:'Strong momentum with subscriber additions accelerating, ARPU expansion ongoing. Expected 10-day upside ~₹40 from current.', topRisk:'Already at +30.6% — risk-reward less favorable from here', personalizedAction:'TRIM', personalizedReason:'Captured +30.6% — bias still bullish but consider partial exit (sell 30-50%) for risk-adjusted returns.' },
    { symbol:'MARUTI.NS', name:'Maruti Suzuki', entryPrice:12000, entryDate:'01 Jun', currentPrice:11842, qty:1, llmAction:'SELL', actionDaysTotal:1, actionDaysRemaining:0, llmSynthesis:'Trend has turned with price below 20D and 50D EMAs. Volume confirming the breakdown. Auto sector facing margin pressure.', topRisk:'Hold window expired; bias decisively bearish', personalizedAction:'CUT LOSSES', personalizedReason:'Trend confirmed against you at −1.3%. Cut losses before further drawdown.' },
    { symbol:'TATAMOTORS.NS', name:'Tata Motors', entryPrice:720, entryDate:'10 Jun', currentPrice:782, qty:8, llmAction:'BUY', actionDaysTotal:10, actionDaysRemaining:8, llmSynthesis:'Conviction strengthened to 73/100. Technical breakout above 200D EMA with strong volume. JLR margins recovering.', topRisk:'EV competition intensifying in domestic market', personalizedAction:'BUY MORE', personalizedReason:'At +8.6%, bias supports adding to position. Consider averaging up.' },
];

// ============================================================
// RENDER LOGIC — faithful copy of app.js, reading from MOCK_*.
// ============================================================
const biasColor = (b) => ({ 'Bullish':'text-emerald-700 bg-emerald-50','Bearish':'text-rose-700 bg-rose-50','Mixed':'text-amber-700 bg-amber-50','Neutral':'text-slate-600 bg-slate-100' }[b] || 'text-slate-600 bg-slate-100');
const actionColor = (a) => ({ 'BUY':'text-emerald-700 bg-emerald-50 border-emerald-200','SELL':'text-rose-700 bg-rose-50 border-rose-200','HOLD':'text-slate-600 bg-slate-50 border-slate-200','NEUTRAL':'text-slate-500 bg-slate-50 border-slate-200' }[a] || 'text-slate-500 bg-slate-50 border-slate-200');
const changeColor = (c) => c == null ? 'text-slate-400' : c >= 0 ? 'text-emerald-600' : 'text-rose-600';
const changeSign  = (c) => c == null ? '' : c >= 0 ? '+' : '';
const escAttr = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const fmtPrice  = (p) => p == null ? '—' : '₹' + p.toLocaleString('en-IN');
const fmtChange = (c) => c == null ? '' : `${changeSign(c)}${c}%`;
const fmtScore  = (v) => v == null ? '—' : (v * 100).toFixed(0);
const fmtMarketCap = (n) => { const num = Number(n); if (!num) return '—'; const cr = num/1e7; if (cr >= 1e5) return (cr/1e5).toFixed(1)+'L Cr'; if (cr >= 1e3) return (cr/1e3).toFixed(1)+'K Cr'; return cr.toFixed(0)+' Cr'; };
function fmtDateShort(iso) { if (!iso) return '—'; const [y,m,d] = iso.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}); }
function fmtAsOf(iso) { const [y,m,d] = iso.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'short',year:'numeric'}); }

function emptyState(message, spanCls = '') {
    return `<div class="${spanCls} bg-white border border-dashed border-slate-300 rounded-xl px-5 py-8 text-center"><p class="text-sm text-slate-500">${escAttr(message)}</p></div>`;
}

// llm_reasoning is JSONB {technical, fundamental, sentiment, synthesis} but a
// flat text column would arrive as a string — normalise so .synthesis resolves.
const normLlmReasoning = (r) => { if (r == null) return null; if (typeof r === 'string') return { synthesis: r }; return r; };
// One-line combined-verdict explanation (no stored verdict column yet).
function verdictText(action, score, mixed, llmAct, pyAct) {
    const s = score == null ? '—' : score;
    if (llmAct && pyAct) return mixed ? `Methods diverge — LLM says ${llmAct}, Python says ${pyAct}. Averaged conviction ${s}/100 → ${action}.` : `Both methods agree on ${action}. Averaged conviction ${s}/100.`;
    if (llmAct) return `Only the LLM has scored this stock — ${action} at ${s}/100. Python hasn't run yet.`;
    if (pyAct)  return `Only Python has scored this stock — ${action} at ${s}/100. The LLM hasn't run yet.`;
    return `${action}. No method has scored this stock yet.`;
}

// Maps the full target field set. The live /all_stocks/stocks SELECT now returns
// llm_reasoning + python_reasoning; the fields still unique to this demo
// (hold_duration, raw_signals, tech/fund/flow scores, price_ranges) aren't listed yet.
function mapStockRow(r) {
    return {
        symbol: r.nse_symbol, name: r.company_name, sector: r.sector || 'Undefined',
        industry: r.industry || '—', isin: r.isin, marketCap: fmtMarketCap(r.market_cap),
        price: r.price, change: r.day_change_pct,
        llmBias: r.overall_bias_label ?? null, llmScore: r.overall_bias_score ?? null,
        llmAction: r.short_term_action ?? null, pythonScore: r.python_score ?? null,
        pythonAction: r.python_action ?? null,
        techScore: r.tech_score ?? null, fundScore: r.fund_score ?? null, flowScore: r.flow_score ?? null,
        rawSignals: r.raw_signals ?? null, pythonReasoning: r.python_reasoning ?? null,
        llmReasoning: normLlmReasoning(r.llm_reasoning),
        hold_duration_days: r.hold_duration_days ?? null, hold_duration_label: r.hold_duration_label ?? null,
        hold_duration_reason: r.hold_duration_reason ?? null,
        combinedAction: r.combined_action ?? null, combinedScore: r.combined_score ?? null,
        analysisDate: r.analysis_date, summary: r.business_summary || 'No business summary available.',
    };
}

// ----- Combined-decision derivation (same as app.js) -----
function combineDecisions(pyAct, pyScore, llmAct, llmScore) {
    const avgScore = Math.round((pyScore + llmScore) / 2);
    if ((pyAct==='BUY'&&llmAct==='SELL')||(pyAct==='SELL'&&llmAct==='BUY')) return { action:'MIXED', mixed:true, score:avgScore };
    if (pyAct === llmAct) return { action: pyAct, mixed:false, score:avgScore };
    if (avgScore > 65) return { action:'MIXED-BUY', mixed:true, score:avgScore };
    if (avgScore < 35) return { action:'MIXED-SELL', mixed:true, score:avgScore };
    return { action:'HOLD', mixed:true, score:avgScore };
}
const combinedColor = (a) => ({ 'BUY':'text-emerald-700 bg-emerald-50 border-emerald-300','SELL':'text-rose-700 bg-rose-50 border-rose-300','HOLD':'text-slate-700 bg-slate-100 border-slate-300','MIXED-BUY':'text-emerald-700 bg-emerald-50/60 border-emerald-300 border-dashed','MIXED-SELL':'text-rose-700 bg-rose-50/60 border-rose-300 border-dashed','MIXED':'text-amber-700 bg-amber-50 border-amber-300 border-dashed' }[a] || 'text-slate-500 bg-slate-50 border-slate-200');
function combinedFor(pyAct, pyScore, llmAct, llmScore100, dbAction, dbScore) {
    if (dbScore != null && dbAction) return { action: dbAction, score: Math.round(dbScore), mixed: false };
    if (pyAct && llmAct && pyScore != null && llmScore100 != null) return combineDecisions(pyAct, pyScore, llmAct, llmScore100);
    return { action: llmAct || pyAct || null, score: llmScore100 ?? pyScore ?? null, mixed: false };
}

// ----- Hold pill + popovers (same as app.js) -----
function holdPill(days, label, reason, variant) {
    if (!reason) return '';
    const text = variant === 'mini' ? (days != null ? `· ${days}d` : '· ?') : (days != null ? `Hold · ~${days}d` : 'Hold · Undetermined');
    const subtitle = label || (days != null ? `~${days} days` : 'Undetermined');
    const cls = variant === 'mini' ? 'hold-pill hold-pill-mini' : 'hold-pill';
    return `<span class="${cls}" onclick="openHoldPopover(event, this)" data-hold-label="${escAttr(subtitle)}" data-hold-reason="${escAttr(reason)}" title="Why hold this long?">${text}</span>`;
}
function positionHoldPopover(el) {
    const pop = document.getElementById('hold-popover'); pop.classList.remove('hidden');
    const r = el.getBoundingClientRect(), pad = 12, pw = pop.offsetWidth, ph = pop.offsetHeight;
    const left = Math.max(pad, Math.min(r.left, window.innerWidth - pw - pad));
    let top = r.bottom + 8; if (top + ph > window.innerHeight - pad) top = r.top - ph - 8; top = Math.max(pad, top);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
}
function openHoldPopover(ev, el) {
    ev.stopPropagation();
    document.getElementById('hold-popover-title').textContent = 'Why hold this long?';
    const label = el.dataset.holdLabel || '';
    document.getElementById('hold-popover-body').innerHTML = (label ? `<div class="hp-label text-[11px] font-semibold mb-1">${escAttr(label)}</div>` : '') + `<p class="text-xs leading-relaxed">${escAttr(el.dataset.holdReason || '')}</p>`;
    positionHoldPopover(el);
}
function openComboPopover(ev, el) {
    ev.stopPropagation(); const d = el.dataset;
    document.getElementById('hold-popover-title').textContent = `Why ${d.comboAction}?`;
    const holdLine = d.holdLabel ? `<div class="hp-label text-[11px] font-semibold mb-2">Suggested hold · ${escAttr(d.holdLabel)}</div>` : '';
    const score = d.comboScore === '' || d.comboScore == null ? null : d.comboScore;
    const verdict = verdictText(d.comboAction, score, d.comboMixed === '1', d.llmAct, d.pyAct);
    const verdictLine = `<div class="mb-2.5 pb-2.5 border-b border-slate-200/60"><div class="hp-label text-[10px] font-bold uppercase tracking-widest mb-0.5">Overall verdict · ${escAttr(d.comboAction)}${score != null ? ` · ${score}/100` : ''}</div><p class="text-xs leading-relaxed">${escAttr(verdict)}</p></div>`;
    const section = (tag, act, reason) => `<div class="mb-2.5 last:mb-0"><div class="hp-label text-[10px] font-bold uppercase tracking-widest mb-0.5">${tag} · ${escAttr(act || '—')}</div><p class="text-xs leading-relaxed">${escAttr(reason)}</p></div>`;
    document.getElementById('hold-popover-body').innerHTML = holdLine + verdictLine + (d.llmReason ? section('LLM', d.llmAct, d.llmReason) : '') + (d.pyReason ? section('Python', d.pyAct, d.pyReason) : '') + (!d.llmReason && !d.pyReason ? `<p class="text-xs leading-relaxed">${escAttr([d.llmAct?`LLM: ${d.llmAct}`:'', d.pyAct?`Python: ${d.pyAct}`:''].filter(Boolean).join(' · '))}. No stored reasoning for this call yet.</p>` : '');
    positionHoldPopover(el);
}
function closeHoldPopover() { document.getElementById('hold-popover').classList.add('hidden'); }
document.addEventListener('click', (e) => { const pop = document.getElementById('hold-popover'); if (pop.classList.contains('hidden')) return; if (pop.contains(e.target) || e.target.closest('.hold-pill, .combo-chip')) return; closeHoldPopover(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeHoldPopover(); });

function comboChip(comboAction, llmAct, pyAct, s, hold, comboScore, comboMixed) {
    const llmReason = s.llmReasoning?.synthesis || null;
    const pyReason  = s.pythonReasoning || null;
    const holdLabel = (llmAct === 'HOLD' && hold && hold.reason) ? (hold.label || (hold.days != null ? `~${hold.days} days` : 'Undetermined')) : '';
    const holdAttr = holdLabel ? ` data-hold-label="${escAttr(holdLabel)}"` : '';
    return `<span class="combo-chip text-xs font-semibold px-2.5 py-1 rounded-md border ${combinedColor(comboAction)}" onclick="openComboPopover(event, this)" title="Why ${comboAction}? — tap for reasoning" data-combo-action="${escAttr(comboAction)}" data-combo-score="${comboScore ?? ''}" data-combo-mixed="${comboMixed ? '1' : ''}" data-llm-act="${escAttr(llmAct)}" data-llm-reason="${escAttr(llmReason)}" data-py-act="${escAttr(pyAct)}" data-py-reason="${escAttr(pyReason)}"${holdAttr}>${comboAction}</span>`;
}

// ============================================================
// Ranking model — same as app.js, reading mapped MOCK_STOCKS
// ============================================================
const TOP_PICKS_COUNT = 10;
let rankRows = MOCK_STOCKS.map(mapStockRow);
let picksSector = '';
const PICKS_UNIVERSE_LABEL = 'All sectors';
const universeLabel = () => picksSector || PICKS_UNIVERSE_LABEL;
function pickSectors() { return [...new Set(rankRows.map(s => s.sector).filter(Boolean))].sort(); }
function populateSectorSelects(sectors = pickSectors()) {
    const opts = `<option value="">${PICKS_UNIVERSE_LABEL} · universe</option>` + sectors.map(sec => `<option value="${escAttr(sec)}">${escAttr(sec)}</option>`).join('');
    ['picks-sector','rankings-sector'].forEach(id => { const el = document.getElementById(id); if (!el) return; el.innerHTML = opts; el.value = picksSector; });
}
function setPicksSector(sector) {
    picksSector = sector || ''; closeHoldPopover();
    ['picks-sector','rankings-sector'].forEach(id => { const el = document.getElementById(id); if (el) el.value = picksSector; });
    renderHomePicks(); if (!document.getElementById('rankings-overlay').classList.contains('hidden')) renderRankings();
}
function scoredStocks() {
    return rankRows.map(s => {
        const llmScore100 = s.llmScore == null ? null : Math.round(s.llmScore * 100);
        const pyScore = s.pythonScore == null ? null : Math.round(s.pythonScore);
        if (llmScore100 == null && pyScore == null) return null;
        const llmAct = s.llmAction || null, pyAct = s.pythonAction || null;
        let combinedAction, combinedScore, combinedMixed = false;
        if (s.combinedScore != null && s.combinedAction) { combinedAction = s.combinedAction; combinedScore = Math.round(s.combinedScore); }
        else if (llmScore100 != null && pyScore != null && llmAct && pyAct) { const c = combineDecisions(pyAct, pyScore, llmAct, llmScore100); combinedAction = c.action; combinedScore = c.score; combinedMixed = c.mixed; }
        else { combinedScore = llmScore100 ?? pyScore; combinedAction = llmAct || pyAct || null; }
        return { ...s, llmScore100, pythonScore: pyScore, llmAct, pyAct, combinedAction, combinedScore, combinedMixed };
    }).filter(Boolean).sort((a,b) => b.combinedScore - a.combinedScore);
}
const holdOf = (s) => s.hold_duration_reason ? { days: s.hold_duration_days, label: s.hold_duration_label, reason: s.hold_duration_reason } : null;
const picksUniverse = () => scoredStocks().filter(s => !picksSector || s.sector === picksSector);

function topPickCard(s, idx) {
    const scoreNote = [s.llmScore100 == null ? null : `LLM ${s.llmScore100}`, s.pythonScore == null ? null : `Raw ${s.pythonScore}`].filter(Boolean).join(' · ');
    return `<div onclick="openDrawer('${escAttr(s.symbol)}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-sm rounded-xl p-4 cursor-pointer transition group">
        <div class="flex items-start gap-3">
            <div class="w-8 h-8 shrink-0 bg-gradient-to-br from-sky-100 to-teal-100 rounded-lg flex items-center justify-center text-xs font-bold text-sky-700">#${idx + 1}</div>
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2"><span class="font-semibold text-slate-900 truncate">${s.name}</span><span class="text-xs text-slate-400 shrink-0">${s.symbol.replace('.NS','')}</span></div>
                <div class="flex items-center gap-2 mt-2 flex-wrap">${comboChip(s.combinedAction, s.llmAct, s.pyAct, s, holdOf(s), s.combinedScore, s.combinedMixed)}<span class="text-xs text-slate-500">${scoreNote}</span></div>
            </div>
            <div class="text-right shrink-0"><div class="text-sm font-semibold text-slate-900">${s.combinedScore ?? '—'}/100</div><div class="text-xs ${changeColor(s.change)} mt-1">${fmtChange(s.change)}</div></div>
        </div></div>`;
}

function renderHomePicks() {
    const list = document.getElementById('top-picks-list'), sub = document.getElementById('top-picks-sub');
    if (!list || !sub) return;
    const universe = picksUniverse(), picks = universe.slice(0, TOP_PICKS_COUNT);
    if (!picks.length) { sub.textContent = ''; list.innerHTML = emptyState('No analysed stocks yet.', 'sm:col-span-2'); return; }
    const scope = picksSector ? `in ${picksSector}` : 'overall';
    const lead = picks.length === 1 ? '1 pick' : `Top ${picks.length}`;
    sub.textContent = `${lead} ${scope} of ${universe.length} analysed — LLM conviction and raw signals combined`;
    list.innerHTML = picks.map(topPickCard).join('');
}

// ============================================================
// All Stocks — paginated client-side over MOCK_STOCKS
// ============================================================
const ALL_STOCKS_PAGE_SIZE = 50;
let allStocks = rankRows.slice();
let allStocksShown = 0;
let stockSearchTerm = '';
let currentSector = '';
function stocksSource() {
    let src = allStocks;
    if (currentSector) src = src.filter(s => s.sector === currentSector);
    if (!stockSearchTerm) return src;
    const q = stockSearchTerm.toLowerCase();
    return src.filter(s => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q));
}
function onStockSearch(value) { stockSearchTerm = value.trim(); allStocksShown = 0; document.getElementById('all-stocks-grid').innerHTML = ''; appendStockPage(); }
function onSectorChange(value) { currentSector = value || ''; allStocksShown = 0; document.getElementById('all-stocks-grid').innerHTML = ''; appendStockPage(); }
function stockCard(s) {
    const biasBadge = s.llmBias ? `<span class="text-xs font-medium px-2 py-0.5 rounded-full ${biasColor(s.llmBias)} shrink-0 ml-2">${s.llmBias}</span>` : `<span class="text-xs font-medium px-2 py-0.5 rounded-full text-slate-400 bg-slate-50 shrink-0 ml-2">No analysis</span>`;
    return `<div onclick="openDialog('${escAttr(s.symbol)}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md rounded-xl p-5 cursor-pointer transition">
        <div class="flex items-start justify-between mb-3"><div class="min-w-0 flex-1"><div class="font-semibold text-slate-900 truncate">${s.name}</div><div class="text-xs text-slate-400 mt-0.5">${s.symbol.replace('.NS','')}</div></div>${biasBadge}</div>
        <div class="text-xs text-slate-500 mb-3">${s.sector} · ${s.industry}</div>
        <div class="flex items-baseline justify-between pt-3 border-t border-slate-100"><div><div class="text-lg font-semibold text-slate-900">${fmtPrice(s.price)}</div><div class="text-xs ${changeColor(s.change)} mt-0.5">${fmtChange(s.change)}</div></div><div class="text-right"><div class="text-xs text-slate-400">Conviction</div><div class="text-sm font-semibold text-sky-600">${fmtScore(s.llmScore)}</div></div></div></div>`;
}
function appendStockPage() {
    const src = stocksSource(), next = src.slice(allStocksShown, allStocksShown + ALL_STOCKS_PAGE_SIZE), grid = document.getElementById('all-stocks-grid');
    if (!src.length) grid.innerHTML = emptyState(stockSearchTerm ? `No stock matches "${stockSearchTerm}".` : 'No active stocks found.');
    else grid.insertAdjacentHTML('beforeend', next.map(stockCard).join(''));
    allStocksShown += next.length; updateLoadMore();
}
function renderAllStocks() { allStocksShown = 0; document.getElementById('all-stocks-grid').innerHTML = ''; appendStockPage(); }
function loadMoreStocks() { appendStockPage(); }
function updateLoadMore() {
    const total = stocksSource().length, btn = document.getElementById('load-more-btn'), done = allStocksShown >= total;
    const sub = document.getElementById('all-stocks-subtitle'); if (sub) sub.textContent = `${total} stocks tracked`;
    document.getElementById('all-stocks-count').textContent = `Showing ${allStocksShown} of ${total} stocks`;
    btn.classList.toggle('hidden', done);
}

// ============================================================
// Rankings modal
// ============================================================
const RANKING_TABS = {
    all: { label:'All rankings',  sub:(n) => `All ${n} stock${n===1?'':'s'} in ${universeLabel()} ranked by combined score — LLM conviction and raw signals together.` },
    llm: { label:'Top LLM picks', sub:(n) => `${n===1?'1 pick':'Top '+n} in ${universeLabel()} by LLM conviction alone (Qwen3-32B) — bias, narrative and news flow.` },
    raw: { label:'Top raw picks', sub:(n) => `${n===1?'1 pick':'Top '+n} in ${universeLabel()} by the rule engine alone — technical and fundamental thresholds, no LLM.` },
};
let rankingsTab = 'all';
function openRankings(tab) { rankingsTab = RANKING_TABS[tab] ? tab : 'all'; renderRankings(); const o = document.getElementById('rankings-overlay'); o.classList.remove('hidden'); o.classList.add('flex'); }
function closeRankings() { closeHoldPopover(); const o = document.getElementById('rankings-overlay'); o.classList.add('hidden'); o.classList.remove('flex'); }
function showRankingsTab(tab) { rankingsTab = tab; closeHoldPopover(); renderRankings(); document.getElementById('rankings-body').scrollTop = 0; }
function rankingRowsFor(tab) {
    const scored = picksUniverse();
    if (tab === 'llm') return scored.filter(s => s.llmScore100 != null).sort((a,b) => b.llmScore100 - a.llmScore100).slice(0, TOP_PICKS_COUNT);
    if (tab === 'raw') return scored.filter(s => s.pythonScore != null).sort((a,b) => b.pythonScore - a.pythonScore).slice(0, TOP_PICKS_COUNT);
    return scored;
}
function rankingRow(s, idx, tab) {
    const source = tab === 'raw' ? 'raw' : 'llm';
    const score = tab === 'llm' ? s.llmScore100 : tab === 'raw' ? s.pythonScore : s.combinedScore;
    let chip, note;
    if (tab === 'all') { chip = comboChip(s.combinedAction, s.llmAct, s.pyAct, s, holdOf(s), s.combinedScore, s.combinedMixed); note = (s.llmAct && s.pyAct) ? (s.combinedMixed ? 'Methods diverge' : 'Both methods agree') : (s.llmAct ? 'LLM only' : s.pyAct ? 'Rule engine only' : ''); }
    else if (tab === 'llm') { chip = s.llmAct ? `<span class="text-xs font-semibold px-2.5 py-1 rounded-md border ${actionColor(s.llmAct)}">${s.llmAct}</span>` : '<span class="text-xs text-slate-400">—</span>'; note = [s.llmBias, s.pythonScore == null ? null : `Raw ${s.pythonScore}`].filter(Boolean).join(' · '); }
    else { chip = s.pyAct ? `<span class="text-xs font-semibold px-2.5 py-1 rounded-md border ${actionColor(s.pyAct)}">${s.pyAct}</span>` : '<span class="text-xs text-slate-400">—</span>'; note = ['Rule-based', s.llmScore100 == null ? null : `LLM ${s.llmScore100}`].filter(Boolean).join(' · '); }
    return `<div onclick="openDrawer('${escAttr(s.symbol)}', '${source}')" class="grid grid-cols-12 gap-3 items-center px-3 py-3 rounded-lg border border-transparent hover:border-sky-300 hover:bg-slate-100 cursor-pointer transition">
        <div class="col-span-5 flex items-center gap-3 min-w-0"><span class="text-xs font-bold text-slate-400 w-6 shrink-0">#${idx + 1}</span><div class="min-w-0"><div class="font-semibold text-slate-900 text-sm truncate">${s.name}</div><div class="text-xs text-slate-400 mt-0.5 truncate">${s.symbol.replace('.NS','')} · ${s.sector}</div></div></div>
        <div class="col-span-3">${chip}<div class="text-[10px] text-slate-400 uppercase tracking-wide mt-1">${note}</div></div>
        <div class="col-span-2 text-right text-sm font-semibold text-slate-900">${score ?? '—'}<span class="text-xs text-slate-400 font-normal">/100</span></div>
        <div class="col-span-2 text-right"><div class="text-sm font-semibold text-slate-900">${fmtPrice(s.price)}</div><div class="text-xs ${changeColor(s.change)} mt-0.5">${fmtChange(s.change)}</div></div></div>`;
}
function renderRankings() {
    const tab = rankingsTab, meta = RANKING_TABS[tab], rows = rankingRowsFor(tab);
    document.getElementById('rankings-title').textContent = meta.label;
    document.getElementById('rankings-sub').textContent = meta.sub(rows.length);
    document.getElementById('rankings-sector').value = picksSector;
    const activeCls = 'px-3.5 py-2.5 text-sm font-medium border-b-2 border-sky-500 text-sky-600 -mb-px transition';
    const inactiveCls = 'px-3.5 py-2.5 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 -mb-px transition';
    const universeSize = picksUniverse().length;
    const tabCount = (key) => key === 'all' ? universeSize : Math.min(TOP_PICKS_COUNT, universeSize);
    document.getElementById('rankings-tabs').innerHTML = Object.entries(RANKING_TABS).map(([key, t]) => `<button onclick="showRankingsTab('${key}')" class="${key === tab ? activeCls : inactiveCls}">${t.label}<span class="ml-1 text-xs text-slate-400">${tabCount(key)}</span></button>`).join('');
    if (!rows.length) { document.getElementById('rankings-body').innerHTML = emptyState('No analysed stocks in this universe yet.'); return; }
    document.getElementById('rankings-body').innerHTML = `<div class="grid grid-cols-12 gap-3 px-3 pb-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide"><div class="col-span-5">Stock</div><div class="col-span-3">${tab === 'all' ? 'Combined call' : 'Call'}</div><div class="col-span-2 text-right">${tab === 'all' ? 'Combined' : tab === 'llm' ? 'LLM score' : 'Raw score'}</div><div class="col-span-2 text-right">Price</div></div><div class="space-y-1">${rows.map((s, i) => rankingRow(s, i, tab)).join('')}</div>`;
}

// ============================================================
// Centered drawer (LLM vs Raw)
// ============================================================
const findStock = (symbol) => rankRows.find(x => x.symbol === symbol) || null;
function openDrawer(symbol, source) {
    source = source || 'llm'; const s = findStock(symbol); if (!s) return;
    document.getElementById('drawer-content').innerHTML = (source === 'raw' || source === 'python') ? renderRawDrawer(s) : renderLlmDrawer(s);
    const o = document.getElementById('drawer-overlay'); o.classList.remove('hidden'); o.classList.add('flex');
}
function closeDrawer() { closeHoldPopover(); const o = document.getElementById('drawer-overlay'); o.classList.add('hidden'); o.classList.remove('flex'); }

function renderLlmDrawer(s) {
    const hasBias = s.llmBias != null && s.llmScore != null;
    return `<div class="text-xs text-slate-400 mb-2">${s.symbol}</div>
        <h2 class="text-2xl font-bold tracking-tight">${s.name}</h2>
        <p class="text-sm text-slate-500 mt-1 mb-6">${s.sector} · ${s.industry}</p>
        <div class="flex items-baseline gap-3 mb-6"><span class="text-3xl font-bold">${fmtPrice(s.price)}</span><span class="text-sm font-medium ${changeColor(s.change)}">${fmtChange(s.change)} today</span></div>
        <div class="bg-gradient-to-br from-sky-50 to-teal-50 border border-sky-100 rounded-2xl p-5 mb-4">
            <div class="flex items-center justify-between mb-3"><span class="text-xs font-semibold text-sky-700 uppercase tracking-wide">LLM Analysis</span>${s.analysisDate ? `<span class="text-xs text-slate-500">${escAttr(s.analysisDate)}</span>` : ''}</div>
            ${hasBias ? `<div class="flex items-center gap-3 mb-4 flex-wrap"><span class="text-xs font-medium px-2.5 py-1 rounded-full ${biasColor(s.llmBias)}">${s.llmBias}</span><span class="text-xs font-medium px-2.5 py-1 rounded border ${actionColor(s.llmAction)}">${s.llmAction}</span>${s.llmAction === 'HOLD' ? holdPill(s.hold_duration_days, s.hold_duration_label, s.hold_duration_reason, 'card') : ''}<span class="text-xs text-slate-500">Conviction <span class="font-semibold text-slate-900">${(s.llmScore*100).toFixed(0)}/100</span></span></div><p class="text-sm text-slate-700 leading-relaxed">${s.llmReasoning?.synthesis || 'No stored synthesis for this call yet.'}</p>` : `<p class="text-sm text-slate-500">No LLM analysis for this stock yet.</p>`}
        </div>
        <div class="flex gap-3 mt-6"><button onclick="openAddToWatchlist('${escAttr(s.symbol)}', '${escAttr(s.name)}', ${s.price ?? 'null'})" class="flex-1 px-4 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 font-medium rounded-lg transition">+ Add to watchlist</button><button onclick="openDrawer('${escAttr(s.symbol)}', 'raw')" class="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition">View raw data →</button></div>`;
}

function renderRawDrawer(s) {
    const py = s.pythonScore, sig = s.rawSignals || {};
    const interp = (text, kind = 'neutral') => { const colors = { bull:'text-emerald-700 bg-emerald-50', bear:'text-rose-700 bg-rose-50', neutral:'text-slate-600 bg-slate-100' }; return `<span class="text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[kind]}">${text}</span>`; };
    const rsiInterp = sig.rsi_14 == null ? '' : sig.rsi_14 > 70 ? interp('Overbought','bear') : sig.rsi_14 < 30 ? interp('Oversold','bear') : sig.rsi_14 >= 55 ? interp('Bullish','bull') : interp('Neutral','neutral');
    const emaInterp = (ema) => (ema == null || s.price == null) ? '' : s.price > ema ? interp('Above · Bullish','bull') : interp('Below · Bearish','bear');
    const peInterp = sig.pe == null ? '' : sig.pe < 20 ? interp('Cheap','bull') : sig.pe < 30 ? interp('Fair','neutral') : interp('Expensive','bear');
    const roceInterp = sig.roce == null ? '' : sig.roce > 15 ? interp('High quality','bull') : sig.roce > 8 ? interp('Moderate','neutral') : interp('Weak','bear');
    const deInterp = sig.debt_to_equity == null ? '' : sig.debt_to_equity < 0.5 ? interp('Low leverage','bull') : sig.debt_to_equity < 1.0 ? interp('Moderate','neutral') : interp('Leveraged','bear');
    const marginInterp = sig.operating_margin == null ? '' : sig.operating_margin > 12 ? interp('Strong','bull') : sig.operating_margin > 6 ? interp('Average','neutral') : interp('Weak','bear');
    const revInterp = sig.revenue_growth == null ? '' : sig.revenue_growth > 12 ? interp('Strong','bull') : sig.revenue_growth > 4 ? interp('Average','neutral') : interp('Weak','bear');
    const rowHTML = (label, value, badge) => `<div class="grid grid-cols-12 items-center py-2.5 border-b border-slate-100 last:border-0"><span class="col-span-5 text-sm text-slate-600">${label}</span><span class="col-span-3 text-sm font-semibold text-slate-900">${value ?? '—'}</span><span class="col-span-4 text-right">${badge}</span></div>`;
    const scoreBar = (label, v) => `<div><div class="flex items-center justify-between text-xs mb-1"><span class="text-slate-600">${label}</span><span class="font-semibold text-slate-900">${v == null ? '—' : v + '/100'}</span></div><div class="h-1.5 bg-white rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-sky-400 to-teal-400" style="width:${v ?? 0}%"></div></div></div>`;
    return `<div class="text-xs text-slate-400 mb-2">${s.symbol}</div>
        <h2 class="text-2xl font-bold tracking-tight">${s.name}</h2>
        <p class="text-sm text-slate-500 mt-1 mb-6">${s.sector} · ${s.industry}</p>
        <div class="flex items-baseline gap-3 mb-6"><span class="text-3xl font-bold">${fmtPrice(s.price)}</span><span class="text-sm font-medium ${changeColor(s.change)}">${fmtChange(s.change)} today</span></div>
        <div class="bg-white border-2 border-sky-100 rounded-2xl p-5 mb-4">
            <div class="flex items-center justify-between mb-4"><span class="text-xs font-semibold text-sky-700 uppercase tracking-wide">Raw Analysis</span><span class="text-xs text-slate-500">Rule-based · ${s.analysisDate || 'no analysis yet'}</span></div>
            <h4 class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Technical Signals</h4>
            <div class="mb-4">${rowHTML('RSI (14)', sig.rsi_14, rsiInterp)}${rowHTML('20D EMA', sig.ema_20 == null ? null : '₹' + sig.ema_20.toLocaleString('en-IN'), emaInterp(sig.ema_20))}${rowHTML('50D EMA', sig.ema_50 == null ? null : '₹' + sig.ema_50.toLocaleString('en-IN'), emaInterp(sig.ema_50))}${rowHTML('200D EMA', sig.ema_200 == null ? null : '₹' + sig.ema_200.toLocaleString('en-IN'), emaInterp(sig.ema_200))}${rowHTML('ATR (14)', sig.atr == null ? null : '₹' + sig.atr, sig.atr == null ? '' : interp('Normal vol','neutral'))}</div>
            <h4 class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Fundamental Signals</h4>
            <div class="mb-4">${rowHTML('PE Ratio', sig.pe == null ? null : sig.pe + 'x', peInterp)}${rowHTML('ROCE', sig.roce == null ? null : sig.roce + '%', roceInterp)}${rowHTML('Debt / Equity', sig.debt_to_equity == null ? null : sig.debt_to_equity + 'x', deInterp)}${rowHTML('Operating Margin', sig.operating_margin == null ? null : sig.operating_margin + '%', marginInterp)}${rowHTML('Revenue Growth YoY', sig.revenue_growth == null ? null : sig.revenue_growth + '%', revInterp)}</div>
        </div>
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4">
            <div class="flex items-center justify-between mb-4"><span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Score Breakdown</span><span class="text-xs text-slate-500">Composite</span></div>
            <div class="space-y-3">${scoreBar('Technical', s.techScore)}${scoreBar('Fundamental', s.fundScore)}${scoreBar('Flow', s.flowScore)}<div class="pt-3 mt-2 border-t border-slate-200 flex items-center justify-between"><span class="text-sm font-semibold text-slate-900">Total</span><span class="text-lg font-bold text-sky-700">${py == null ? '—' : py + '/100'}</span></div></div>
        </div>
        <div class="mb-5"><h3 class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">${py == null ? 'Why this scores what it does' : `Why this scores ${py}/100`}</h3><p class="text-sm text-slate-700 leading-relaxed">${s.pythonReasoning || 'No stored reasoning for this call yet.'}</p></div>
        <div class="flex gap-3 mt-6"><button onclick="openAddToWatchlist('${escAttr(s.symbol)}', '${escAttr(s.name)}', ${s.price ?? 'null'})" class="flex-1 px-4 py-3 border border-slate-200 hover:border-slate-300 text-slate-700 font-medium rounded-lg transition">+ Add to watchlist</button><button onclick="openDrawer('${escAttr(s.symbol)}', 'llm')" class="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition">View LLM analysis →</button></div>`;
}

// ============================================================
// Dialog (all-stocks card detail) — reads MOCK_CARDS synchronously
// ============================================================
function dialogHeader(symbol, name, sector, industry) {
    return `<div class="flex justify-between items-start mb-6"><div><h2 class="text-2xl font-bold tracking-tight">${escAttr(name)}</h2><p class="text-sm text-slate-500 mt-1">${escAttr(symbol)}${sector ? ` · ${escAttr(sector)} · ${escAttr(industry)}` : ''}</p></div><button onclick="closeDialog()" class="text-slate-400 hover:text-slate-900 text-xl leading-none">✕</button></div>`;
}
function openDialog(symbol) {
    const cached = findStock(symbol);
    const card = MOCK_CARDS[symbol] || { metadata: { date: cached?.analysisDate, company_name: cached?.name || symbol, nse_symbol: symbol, sector: cached?.sector || '', market_cap: cached?.marketCap || '—', current_price: cached?.price ?? null, about: cached?.summary || 'No business summary available.', ISIN: cached?.isin || null }, history: [] };
    const m = card.metadata, history = card.history || [];
    document.getElementById('dialog-content').innerHTML = `${dialogHeader(m.nse_symbol, m.company_name, m.sector, cached?.industry)}
        <div class="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
            <div><div class="text-xs text-slate-400 uppercase tracking-wide mb-1">Market Cap</div><div class="font-semibold">${escAttr(m.market_cap)}</div></div>
            <div><div class="text-xs text-slate-400 uppercase tracking-wide mb-1">Current Price</div><div class="font-semibold">${fmtPrice(m.current_price)}</div></div>
            <div><div class="text-xs text-slate-400 uppercase tracking-wide mb-1">ISIN</div><div class="font-medium text-slate-700 text-xs">${m.ISIN || '—'}</div></div>
            <div><div class="text-xs text-slate-400 uppercase tracking-wide mb-1">Latest analysis</div><div class="font-medium text-slate-700 text-xs">${m.date || 'None yet'}</div></div>
        </div>
        <div class="mb-6"><div class="text-xs text-slate-400 uppercase tracking-wide mb-2">About</div><p class="text-sm text-slate-700 leading-relaxed">${m.about || 'No business summary available.'}</p></div>
        <div class="mb-6"><div class="text-xs text-slate-400 uppercase tracking-wide mb-3">Recent Analysis History</div><div class="space-y-2">${renderHistoryRows(history)}</div></div>
        <div class="flex gap-3 pt-4 border-t border-slate-100"><button id="dialog-expand-btn" onclick="toggleDialogExpansion('${escAttr(m.nse_symbol)}')" class="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition">View full analysis ▼</button><button onclick="openAddToWatchlist('${escAttr(m.nse_symbol)}', '${escAttr(m.company_name)}', ${m.current_price ?? 'null'})" class="px-4 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-lg transition">Add to watchlist</button></div>
        <div id="dialog-expanded" class="hidden mt-6 pt-6 border-t-2 border-dashed border-slate-200 space-y-6"></div>`;
    const o = document.getElementById('dialog-overlay'); o.classList.remove('hidden'); o.classList.add('flex');
}
function matchTitle(combinedAct, matched) {
    if (combinedAct === 'HOLD' || combinedAct === 'MIXED') return matched ? 'Held through a gain/flat — no loss taken' : 'Held into a decline — should have exited';
    if (combinedAct === 'BUY' || combinedAct === 'MIXED-BUY') return matched ? 'Bought ahead of a gain — call paid off' : 'Bought ahead of a decline — call missed';
    return matched ? 'Sold ahead of a decline — avoided the drop' : 'Sold ahead of a gain — exited too early';
}
function renderHistoryRows(history) {
    if (!history.length) return emptyState('No analysis history yet for this stock.');
    const header = `<div class="grid grid-cols-12 gap-2 px-3 pb-2 mb-1 border-b border-slate-100"><span class="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</span><span class="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Python</span><span class="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">LLM</span><span class="col-span-3 text-xs font-semibold text-sky-600 uppercase tracking-wide">Combined</span><span class="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Actual</span><span class="col-span-1 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">✓/✗</span></div>`;
    const rows = history.map((r, i) => {
        const pyAct = r.python_action, pyScore = r.python_score == null ? null : Math.round(r.python_score);
        const llmAct = r.short_term_action, llmScore100 = r.overall_bias_score == null ? null : Math.round(r.overall_bias_score * 100);
        const combined = combinedFor(pyAct, pyScore, llmAct, llmScore100, r.combined_action, r.combined_score);
        const matchBadge = r.matched === 'true' ? `<span class="text-sm font-bold text-emerald-600" title="${escAttr(matchTitle(combined.action, true))}">✓</span>` : r.matched === 'false' ? `<span class="text-sm font-bold text-rose-500" title="${escAttr(matchTitle(combined.action, false))}">✗</span>` : `<span class="text-xs font-medium px-2 py-0.5 rounded-full text-amber-700 bg-amber-50 inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>Pending</span>`;
        const actualPct = r.actual_close_pct;
        const actualColor = actualPct == null ? 'text-slate-400 bg-slate-50' : actualPct > 0.5 ? 'text-emerald-700 bg-emerald-50' : actualPct < -0.5 ? 'text-rose-700 bg-rose-50' : 'text-slate-600 bg-slate-100';
        return `<div class="grid grid-cols-12 gap-2 items-center py-2.5 px-3 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'} rounded-lg">
            <span class="col-span-2 text-xs font-medium text-slate-600">${fmtDateShort(r.analysis_date)}</span>
            <div class="col-span-2 flex items-center gap-1">${pyAct ? `<span class="text-xs font-medium px-2 py-0.5 rounded border ${actionColor(pyAct)}">${pyAct}</span><span class="text-xs text-slate-400">${pyScore ?? '—'}</span>` : '<span class="text-xs text-slate-300">—</span>'}</div>
            <div class="col-span-2 flex items-center gap-1">${llmAct ? `<span class="text-xs font-medium px-2 py-0.5 rounded border ${actionColor(llmAct)}">${llmAct}</span><span class="text-xs text-slate-400">${llmScore100 ?? '—'}</span>` : '<span class="text-xs text-slate-300">—</span>'}</div>
            <div class="col-span-3 flex items-center gap-1.5">${combined.action ? comboChip(combined.action, llmAct, pyAct, {}, null, combined.score, combined.mixed) : '<span class="text-xs text-slate-300">—</span>'}<span class="text-xs text-slate-600 font-semibold">${combined.score ?? ''}</span></div>
            <div class="col-span-2"><span class="text-xs font-medium px-2 py-0.5 rounded-full ${actualColor}">${actualPct == null ? '—' : `${actualPct > 0 ? '+' : ''}${actualPct}%`}</span></div>
            <div class="col-span-1 text-right">${matchBadge}</div></div>`;
    }).join('');
    return header + rows;
}
function toggleDialogExpansion(symbol) {
    const expanded = document.getElementById('dialog-expanded'), btn = document.getElementById('dialog-expand-btn');
    if (expanded.classList.contains('hidden')) {
        expanded.innerHTML = renderFullAnalysis(symbol);
        expanded.classList.remove('hidden'); btn.innerHTML = 'Hide full analysis ▲';
        setTimeout(() => expanded.scrollIntoView({ behavior:'smooth', block:'start' }), 60);
    } else { expanded.classList.add('hidden'); expanded.innerHTML = ''; btn.innerHTML = 'View full analysis ▼'; }
}

function renderFullAnalysis(symbol) {
    const fa = MOCK_FULL_ANALYSIS[symbol];
    if (!fa) return emptyState(`Full analysis isn't available yet — GET /v1/all_stocks/card/${symbol}/full_analysis is not implemented on the backend.`);
    const sig = fa.raw_signals || {};
    const py = fa.python_score;
    const llmScore100 = fa.overall_bias_score == null ? null : Math.round(fa.overall_bias_score * 100);
    const combined = combinedFor(fa.python_action, py, fa.short_term_action, llmScore100, fa.combined_action, fa.combined_score);
    const ranges = fa.price_ranges || {};
    const fmtRange = (arr) => (arr && arr.length === 2) ? `₹${arr[0].toLocaleString('en-IN')}–₹${arr[1].toLocaleString('en-IN')}` : '—';
    const badge = (a) => a ? `<span class="text-xs font-semibold px-2 py-0.5 rounded border ${actionColor(a)}">${a}</span>` : '—';
    const interp = (text, kind = 'neutral') => { const colors = { bull:'text-emerald-700 bg-emerald-50', bear:'text-rose-700 bg-rose-50', neutral:'text-slate-600 bg-slate-100' }; return `<span class="text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[kind]}">${text}</span>`; };
    const rsiInterp = sig.rsi_14 == null ? '' : sig.rsi_14 > 70 ? interp('Overbought','bear') : sig.rsi_14 < 30 ? interp('Oversold','bull') : sig.rsi_14 >= 55 ? interp('Bullish','bull') : interp('Neutral','neutral');
    const emaInterp = (ema) => (ema == null) ? '' : (symbol in { 'RELIANCE.NS':1358, 'TCS.NS':3987, 'HDFCBANK.NS':1672 } ? (({ 'RELIANCE.NS':1358, 'TCS.NS':3987, 'HDFCBANK.NS':1672 }[symbol] > ema) ? interp('Above · Bullish','bull') : interp('Below · Bearish','bear')) : interp('Neutral','neutral'));
    const peInterp = sig.pe == null ? '' : sig.pe < 20 ? interp('Cheap','bull') : sig.pe < 30 ? interp('Fair','neutral') : interp('Expensive','bear');
    const roceInterp = sig.roce == null ? '' : sig.roce > 15 ? interp('High quality','bull') : sig.roce > 8 ? interp('Moderate','neutral') : interp('Weak','bear');
    const deInterp = sig.debt_to_equity == null ? '' : sig.debt_to_equity < 0.5 ? interp('Low leverage','bull') : sig.debt_to_equity < 1.0 ? interp('Moderate','neutral') : interp('Leveraged','bear');
    const marginInterp = sig.operating_margin == null ? '' : sig.operating_margin > 12 ? interp('Strong','bull') : sig.operating_margin > 6 ? interp('Average','neutral') : interp('Weak','bear');
    const revInterp = sig.revenue_growth == null ? '' : sig.revenue_growth > 12 ? interp('Strong','bull') : sig.revenue_growth > 4 ? interp('Average','neutral') : interp('Weak','bear');
    const rowHTML = (label, value, badge) => `<div class="grid grid-cols-12 items-center py-2.5 border-b border-slate-100 last:border-0"><span class="col-span-5 text-sm text-slate-600">${label}</span><span class="col-span-3 text-sm font-semibold text-slate-900">${value ?? '—'}</span><span class="col-span-4 text-right">${badge}</span></div>`;
    const scoreBar = (label, v) => `<div><div class="flex items-center justify-between text-xs mb-1"><span class="text-slate-600">${label}</span><span class="font-semibold text-slate-900">${v == null ? '—' : v + '/100'}</span></div><div class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-sky-400 to-teal-400" style="width:${v ?? 0}%"></div></div></div>`;

    return `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full analysis</div>
                ${fa.date ? `<span class="text-xs text-slate-400">${escAttr(fa.date)}</span>` : ''}
            </div>

            <!-- Verdict header -->
            <div class="bg-gradient-to-br from-sky-50 to-teal-50 border border-sky-100 rounded-xl p-5">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold text-sky-700 uppercase tracking-wide">Combined verdict</span>
                    ${combined.action ? comboChip(combined.action, fa.short_term_action, fa.python_action, {}, null, combined.score, combined.mixed) : ''}
                </div>
                <div class="grid grid-cols-3 gap-4 text-center">
                    <div><div class="text-xs text-slate-500 mb-1">LLM</div><div class="text-sm font-semibold">${badge(fa.short_term_action)}</div><div class="text-xs text-slate-600 mt-1">${llmScore100 ?? '—'}/100</div></div>
                    <div><div class="text-xs text-slate-500 mb-1">Python</div><div class="text-sm font-semibold">${badge(fa.python_action)}</div><div class="text-xs text-slate-600 mt-1">${py ?? '—'}/100</div></div>
                    <div><div class="text-xs text-slate-500 mb-1">Combined</div><div class="text-sm font-semibold">${badge(fa.combined_action)}</div><div class="text-xs text-slate-600 mt-1">${combined.score ?? '—'}/100</div></div>
                </div>
                ${fa.hold_duration ? `<div class="mt-4 pt-3 border-t border-sky-100/60"><div class="flex items-center gap-2 text-xs text-slate-600"><span class="font-semibold">Suggested hold · ${escAttr(fa.hold_duration)}</span><span class="text-slate-400">·</span><span>${escAttr(fa.hold_duration_reason || '')}</span></div></div>` : ''}
            </div>

            <!-- Trade ranges -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="bg-white border border-slate-200 rounded-xl p-3"><div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Buy range</div><div class="text-sm font-semibold text-slate-900">${fmtRange(ranges.buy_range)}</div></div>
                <div class="bg-white border border-slate-200 rounded-xl p-3"><div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Short-term target</div><div class="text-sm font-semibold text-slate-900">${fmtRange(ranges.sell_range_short)}</div></div>
                <div class="bg-white border border-slate-200 rounded-xl p-3"><div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Positional target</div><div class="text-sm font-semibold text-slate-900">${fmtRange(ranges.sell_range_positional)}</div></div>
                <div class="bg-white border border-slate-200 rounded-xl p-3"><div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Stop loss</div><div class="text-sm font-semibold text-rose-600">${ranges.stop_loss ? '₹' + ranges.stop_loss.toLocaleString('en-IN') : '—'}</div></div>
            </div>

            <!-- Reasoning -->
            <div class="space-y-4">
                ${fa.llm_reasoning ? `
                    <div class="bg-white border border-slate-200 rounded-xl p-5">
                        <div class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">LLM reasoning</div>
                        <div class="space-y-3">
                            ${fa.llm_reasoning.technical ? `<div class="flex gap-3"><span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-20 shrink-0 pt-0.5">Technical</span><p class="text-sm text-slate-700 leading-relaxed">${escAttr(fa.llm_reasoning.technical)}</p></div>` : ''}
                            ${fa.llm_reasoning.fundamental ? `<div class="flex gap-3"><span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-20 shrink-0 pt-0.5">Fundamental</span><p class="text-sm text-slate-700 leading-relaxed">${escAttr(fa.llm_reasoning.fundamental)}</p></div>` : ''}
                            ${fa.llm_reasoning.sentiment ? `<div class="flex gap-3"><span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-20 shrink-0 pt-0.5">Sentiment</span><p class="text-sm text-slate-700 leading-relaxed">${escAttr(fa.llm_reasoning.sentiment)}</p></div>` : ''}
                            ${fa.llm_reasoning.synthesis ? `<div class="flex gap-3 pt-3 border-t border-slate-100"><span class="text-[10px] font-semibold text-sky-600 uppercase tracking-wide w-20 shrink-0 pt-0.5">Synthesis</span><p class="text-sm text-slate-700 leading-relaxed">${escAttr(fa.llm_reasoning.synthesis)}</p></div>` : ''}
                        </div>
                    </div>
                ` : ''}
                ${fa.python_reasoning ? `
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
                        <div class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Python reasoning</div>
                        <p class="text-sm text-slate-700 leading-relaxed">${escAttr(fa.python_reasoning)}</p>
                    </div>
                ` : ''}
            </div>

            <!-- Risks -->
            ${fa.risks?.length ? `
                <div>
                    <div class="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Key risks</div>
                    <ul class="space-y-2">
                        ${fa.risks.map(r => `<li class="text-sm text-slate-700 leading-snug flex gap-2"><span class="text-rose-500 shrink-0">⚠</span><span>${escAttr(r)}</span></li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <!-- Raw signals -->
            <div class="bg-white border-2 border-sky-100 rounded-2xl p-5">
                <div class="flex items-center justify-between mb-4"><span class="text-xs font-semibold text-sky-700 uppercase tracking-wide">Raw signals</span><span class="text-xs text-slate-500">Rule-based · ${fa.date || 'no analysis yet'}</span></div>
                <h4 class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Technical Signals</h4>
                <div class="mb-4">${rowHTML('RSI (14)', sig.rsi_14, rsiInterp)}${rowHTML('20D EMA', sig.ema_20 == null ? null : '₹' + sig.ema_20.toLocaleString('en-IN'), emaInterp(sig.ema_20))}${rowHTML('50D EMA', sig.ema_50 == null ? null : '₹' + sig.ema_50.toLocaleString('en-IN'), emaInterp(sig.ema_50))}${rowHTML('200D EMA', sig.ema_200 == null ? null : '₹' + sig.ema_200.toLocaleString('en-IN'), emaInterp(sig.ema_200))}${rowHTML('ATR (14)', sig.atr == null ? null : '₹' + sig.atr, sig.atr == null ? '' : interp('Normal vol','neutral'))}</div>
                <h4 class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1 mt-4">Fundamental Signals</h4>
                <div class="mb-4">${rowHTML('PE Ratio', sig.pe == null ? null : sig.pe + 'x', peInterp)}${rowHTML('ROCE', sig.roce == null ? null : sig.roce + '%', roceInterp)}${rowHTML('Debt / Equity', sig.debt_to_equity == null ? null : sig.debt_to_equity + 'x', deInterp)}${rowHTML('Operating Margin', sig.operating_margin == null ? null : sig.operating_margin + '%', marginInterp)}${rowHTML('Revenue Growth YoY', sig.revenue_growth == null ? null : sig.revenue_growth + '%', revInterp)}</div>
            </div>

            <!-- Score breakdown -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div class="flex items-center justify-between mb-4"><span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Score breakdown</span><span class="text-xs text-slate-500">Composite</span></div>
                <div class="space-y-3">${scoreBar('Technical', fa.raw_signals?.tech_score ?? null)}${scoreBar('Fundamental', fa.raw_signals?.fund_score ?? null)}${scoreBar('Flow', fa.raw_signals?.flow_score ?? null)}<div class="pt-3 mt-2 border-t border-slate-200 flex items-center justify-between"><span class="text-sm font-semibold text-slate-900">Python total</span><span class="text-lg font-bold text-sky-700">${py == null ? '—' : py + '/100'}</span></div></div>
            </div>
        </div>`;
}
function closeDialog() { closeHoldPopover(); document.getElementById('dialog-overlay').classList.add('hidden'); document.getElementById('dialog-overlay').classList.remove('flex'); }

// ============================================================
// Top Recommendations + Active Calls
// ============================================================
function renderTopRecs() {
    const list = document.getElementById('top-recs-list'), dateBadge = document.getElementById('top-recs-date');
    const candidates = scoredStocks().filter(s => (s.combinedAction === 'BUY' || s.combinedAction === 'MIXED-BUY') && s.combinedScore >= 60).slice(0, TOP_PICKS_COUNT);
    if (dateBadge) { const newest = rankRows.map(s => s.analysisDate).filter(Boolean).sort().at(-1); dateBadge.textContent = newest ? fmtAsOf(newest) : ''; dateBadge.classList.toggle('hidden', !newest); }
    document.getElementById('top-picks-count').textContent = candidates.length;
    if (!candidates.length) { list.innerHTML = emptyState('No stock currently meets the BUY + combined score ≥ 60 threshold.'); return; }
    list.innerHTML = candidates.map((s, idx) => `<div onclick="openDrawer('${escAttr(s.symbol)}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-sm rounded-xl p-5 cursor-pointer transition">
        <div class="grid grid-cols-12 gap-4 items-start">
            <div class="col-span-1"><div class="w-9 h-9 bg-gradient-to-br from-sky-100 to-teal-100 rounded-lg flex items-center justify-center text-sm font-bold text-sky-700">#${idx + 1}</div></div>
            <div class="col-span-5"><div class="font-semibold text-slate-900">${s.name}</div><div class="text-xs text-slate-400 mt-0.5">${s.symbol.replace('.NS','')} · ${s.sector}</div></div>
            <div class="col-span-2 flex flex-col items-start gap-1"><div class="flex items-center gap-1.5"><span class="text-xs font-semibold px-2.5 py-1 rounded-md border ${combinedColor(s.combinedAction)}">${s.combinedAction}</span><span class="text-xs text-slate-600 font-semibold">${s.combinedScore}</span></div><span class="text-[10px] text-slate-400 uppercase tracking-wide">${s.combinedMixed ? 'Methods diverge' : 'Both methods agree'}</span></div>
            <div class="col-span-2 text-right"><div class="text-lg font-semibold">${fmtPrice(s.price)}</div><div class="text-xs ${changeColor(s.change)} mt-0.5">${fmtChange(s.change)}</div></div>
            <div class="col-span-2 text-right"><button onclick="event.stopPropagation(); openAddToWatchlist('${escAttr(s.symbol)}', '${escAttr(s.name)}', ${s.price ?? 'null'})" class="text-xs font-medium text-sky-700 hover:text-sky-900 hover:bg-sky-50 px-3 py-1.5 rounded-md transition">+ Watchlist</button></div>
        </div></div>`).join('');
}

const horizonDays = { 'intraday':1, 'swing':10, 'positional':45, 'long':180 };
const horizonLabel = { 'intraday':'Intraday', 'swing':'Swing (5–10d)', 'positional':'Positional (1–3m)', 'long':'Long (3–12m)' };
// Deterministic active-calls mock (no Math.random — stable demo). Entry data
// mirrors what an /active_calls endpoint would return once it exists.
const MOCK_ACTIVE = [
    { symbol:'TATAMOTORS.NS', name:'Tata Motors', llmAction:'BUY',  horizon:'swing',      daysLeft:6,  sinceEntryPct:8.6,  entryStr:'11 Jun' },
    { symbol:'BHARTIARTL.NS', name:'Bharti Airtel', llmAction:'BUY', horizon:'positional', daysLeft:34, sinceEntryPct:30.6, entryStr:'10 May' },
    { symbol:'SUNPHARMA.NS',  name:'Sun Pharmaceutical', llmAction:'BUY', horizon:'swing',  daysLeft:4,  sinceEntryPct:3.2,  entryStr:'17 Jun' },
    { symbol:'WIPRO.NS',      name:'Wipro', llmAction:'SELL', horizon:'swing',             daysLeft:2,  sinceEntryPct:-4.1, entryStr:'19 Jun' },
    { symbol:'MARUTI.NS',     name:'Maruti Suzuki', llmAction:'SELL', horizon:'intraday',  daysLeft:0,  sinceEntryPct:-1.3, entryStr:'22 Jun' },
];
function renderActiveRecs() {
    const recs = MOCK_ACTIVE;
    document.getElementById('active-count').textContent = `${recs.length} active`;
    document.getElementById('active-recs-list').innerHTML = recs.map(r => {
        const daysColor = r.daysLeft <= 0 ? 'text-rose-600 font-semibold' : r.daysLeft <= 2 ? 'text-amber-600 font-semibold' : 'text-slate-700';
        const sign = r.sinceEntryPct >= 0 ? '+' : '';
        return `<div onclick="openDrawer('${r.symbol}')" class="grid grid-cols-12 gap-4 items-center px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition">
            <div class="col-span-4 min-w-0"><div class="font-medium text-slate-900 truncate">${r.name}</div><div class="text-xs text-slate-400 mt-0.5">${r.symbol.replace('.NS','')} · entered ${r.entryStr}</div></div>
            <div class="col-span-2"><span class="text-xs font-medium px-2.5 py-1 rounded border ${actionColor(r.llmAction)}">${r.llmAction}</span></div>
            <div class="col-span-2 text-sm text-slate-700">${horizonLabel[r.horizon]}</div>
            <div class="col-span-2 text-sm ${daysColor}">${r.daysLeft > 0 ? r.daysLeft + ' days' : 'Expires today'}</div>
            <div class="col-span-2 text-right"><div class="text-sm font-semibold ${changeColor(r.sinceEntryPct)}">${sign}${r.sinceEntryPct}%</div></div></div>`;
    }).join('');
}

// ============================================================
// Watchlist
// ============================================================
const personalizedActionColor = (a) => ({ 'HOLD':'text-slate-700 bg-slate-100 border-slate-200','WAIT':'text-amber-700 bg-amber-50 border-amber-200','BUY MORE':'text-emerald-700 bg-emerald-50 border-emerald-200','TRIM':'text-sky-700 bg-sky-50 border-sky-200','SELL':'text-rose-700 bg-rose-50 border-rose-200','CUT LOSSES':'text-rose-700 bg-rose-50 border-rose-200' }[a] || 'text-slate-600 bg-slate-50 border-slate-200');
function renderWatchlist() {
    document.getElementById('watchlist-list').innerHTML = MOCK_WATCHLIST.map(w => {
        const pnlAbs = (w.currentPrice - w.entryPrice) * w.qty, pnlPct = ((w.currentPrice - w.entryPrice) / w.entryPrice * 100);
        const pnlColor = pnlAbs >= 0 ? 'text-emerald-600' : 'text-rose-600', pnlSign = pnlAbs >= 0 ? '+' : '';
        const remaining = w.actionDaysRemaining, total = w.actionDaysTotal, elapsed = total - remaining, pct = (elapsed / total) * 100;
        const expired = remaining <= 0, urgent = remaining > 0 && remaining <= 2;
        let barColor = 'from-sky-400 to-teal-400';
        if (['SELL','CUT LOSSES'].includes(w.personalizedAction)) barColor = 'from-rose-400 to-rose-500';
        else if (['BUY MORE'].includes(w.personalizedAction)) barColor = 'from-emerald-400 to-emerald-500';
        else if (w.personalizedAction === 'TRIM') barColor = 'from-sky-400 to-sky-500';
        else if (expired) barColor = 'from-amber-400 to-amber-500';
        let daysLabel = expired ? `<span class="text-xs font-medium text-amber-600">Window expired</span>` : urgent ? `<span class="text-xs font-medium text-amber-600">${remaining} of ${total}d left</span>` : `<span class="text-xs text-slate-500">${remaining} of ${total}d left</span>`;
        const divergent = w.llmAction !== w.personalizedAction && !(w.llmAction === 'HOLD' && w.personalizedAction === 'HOLD') && !(w.llmAction === 'BUY' && w.personalizedAction === 'BUY MORE') && !(w.llmAction === 'SELL' && ['SELL','CUT LOSSES'].includes(w.personalizedAction));
        return `<div onclick="openDrawer('${w.symbol}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-sm rounded-xl p-5 cursor-pointer transition">
            <div class="flex items-start justify-between mb-4 pb-4 border-b border-slate-100">
                <div class="min-w-0 flex-1"><div class="flex items-center gap-2 mb-1"><span class="font-semibold text-slate-900 truncate">${w.name}</span><span class="text-xs text-slate-400">${w.symbol.replace('.NS','')}</span></div><div class="text-xs text-slate-500">${w.qty} shares · entered ${w.entryDate} @ ₹${w.entryPrice.toLocaleString('en-IN')}</div></div>
                <div class="text-right ml-4 mr-6"><div class="text-lg font-semibold">₹${w.currentPrice.toLocaleString('en-IN')}</div><div class="text-sm font-medium ${pnlColor}">${pnlSign}₹${Math.abs(pnlAbs).toLocaleString('en-IN')} (${pnlSign}${pnlPct.toFixed(1)}%)</div></div>
                <div class="text-right"><span class="text-xs font-semibold px-3 py-1.5 rounded-md border ${personalizedActionColor(w.personalizedAction)}">${w.personalizedAction}</span><div class="mt-1.5">${daysLabel}</div></div>
            </div>
            <div class="space-y-3">
                <div class="flex gap-3"><span class="text-xs font-semibold text-slate-500 uppercase tracking-wide w-20 shrink-0 pt-0.5">For you</span><p class="text-sm text-slate-700 leading-relaxed">${w.personalizedReason}</p></div>
                <div class="flex gap-3"><span class="text-xs font-semibold text-sky-600 uppercase tracking-wide w-20 shrink-0 pt-0.5">Analysis</span><p class="text-sm text-slate-600 leading-relaxed italic"><span class="font-medium not-italic px-2 py-0.5 rounded text-xs ${actionColor(w.llmAction)} mr-2">Global: ${w.llmAction}</span>${w.llmSynthesis}</p></div>
                <div class="flex gap-3"><span class="text-xs font-semibold text-amber-600 uppercase tracking-wide w-20 shrink-0 pt-0.5">⚠ Risk</span><p class="text-sm text-slate-600 leading-relaxed">${w.topRisk}</p></div>
            </div>
            ${divergent ? `<div class="mt-4 pt-3 border-t border-amber-100 flex items-center gap-2 text-xs text-amber-700 bg-amber-50/50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span><b>Your situation diverges from the global view.</b> The system suggests <b>${w.personalizedAction}</b> for your position even though the global call is <b>${w.llmAction}</b>.</span></div>` : ''}
            <div class="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r ${barColor}" style="width:${Math.min(100, pct)}%"></div></div>
        </div>`;
    }).join('');
}

// ============================================================
// Commodities
// ============================================================
const USDINR = 85.7, OZ_G = 31.1035;
const inrPer10gGold = usdOz => usdOz * USDINR / OZ_G * 10;
const inrPerKgSilver = usdOz => usdOz * USDINR / OZ_G * 1000;
const cmdFmt = n => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const COMMODITY_CATS = ['Metals','Energy','Agriculture','Livestock'];
let commodityFilter = 'all';
const COMMODITY_EMOJI = { 'GC=F':'🥇','SI=F':'🥈','HG=F':'🟠','CL=F':'🛢️','NG=F':'🔥','ZC=F':'🌽','ZS=F':'🫘','KC=F':'☕','LE=F':'🐄','HE=F':'🐖' };
function toCommodityView(r) { return { sym:r.ticker, name:r.name, cat:r.category, emoji:COMMODITY_EMOJI[r.ticker]||'•', price:r.price, chg:r.p_change, unit:r.unit ? (r.unit.includes('/') ? r.unit : `/${r.unit}`) : '', as_of:r.as_of }; }
const commodityPrice = (p) => p.toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
let commodityData = MOCK_COMMODITIES.map(toCommodityView);
function renderCommodityFilters() {
    const cats = ['all', ...COMMODITY_CATS];
    document.getElementById('commodities-filters').innerHTML = cats.map(cat => {
        const active = cat === commodityFilter, label = cat === 'all' ? 'All' : cat;
        const cls = active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900';
        return `<button onclick="setCommodityFilter('${cat}')" class="px-4 py-2 rounded-full text-sm font-medium border cursor-pointer transition ${cls}">${label}</button>`;
    }).join('');
}
function setCommodityFilter(cat) { commodityFilter = cat; renderCommodityFilters(); renderCommodities(); }
function commodityStatTile(k, v) { return `<div class="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5"><div class="text-xs text-slate-400 font-semibold uppercase tracking-wide">${k}</div><div class="text-sm font-semibold text-slate-900 mt-0.5">${v}</div></div>`; }
function renderCommodities() {
    const groups = document.getElementById('commodities-groups');
    const cats = commodityFilter === 'all' ? COMMODITY_CATS : [commodityFilter];
    const rendered = cats.map(cat => {
        const items = commodityData.filter(d => d.cat === cat); if (!items.length) return '';
        const cards = items.map(d => {
            const up = d.chg != null && d.chg >= 0;
            let inrLine = '';
            if (d.sym === 'GC=F') inrLine = `<div class="text-xs text-slate-500 mb-2">≈ ₹${cmdFmt(inrPer10gGold(d.price))} / 10g</div>`;
            if (d.sym === 'SI=F') inrLine = `<div class="text-xs text-slate-500 mb-2">≈ ₹${cmdFmt(inrPerKgSilver(d.price))} / kg</div>`;
            return `<div onclick="openCommodity('${d.sym}')" class="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md rounded-xl p-4 cursor-pointer transition">
                <div class="flex items-center justify-between mb-3"><div class="flex items-center gap-2.5 min-w-0"><div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0">${d.emoji}</div><div class="min-w-0"><div class="font-semibold text-slate-900 truncate leading-tight">${d.name}</div><div class="text-xs text-slate-400">${d.sym}</div></div></div></div>
                <div class="flex items-end justify-between mb-2"><div class="text-xl font-bold text-slate-900">${d.price == null ? '—' : commodityPrice(d.price)}<span class="text-xs font-medium text-slate-400 ml-1">${d.unit}</span></div><div class="text-sm font-semibold ${changeColor(d.chg)}">${d.chg == null ? '—' : `${up ? '▲' : '▼'} ${Math.abs(d.chg).toFixed(2)}%`}</div></div>
                ${inrLine}</div>`;
        }).join('');
        return `<div class="text-xs font-bold uppercase tracking-wider text-slate-400 mt-8 mb-3">${cat}</div><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">${cards}</div>`;
    }).join('');
    groups.innerHTML = rendered.trim() ? rendered : emptyState(`No ${commodityFilter === 'all' ? '' : commodityFilter + ' '}commodities in the database yet.`);
}
function openCommodity(sym) {
    const d = commodityData.find(x => x.sym === sym); if (!d) return;
    const up = d.chg != null && d.chg >= 0;
    let inrLine = '';
    if (d.sym === 'GC=F') inrLine = `≈ ₹${cmdFmt(inrPer10gGold(d.price))} / 10g (MCX-equivalent)`;
    if (d.sym === 'SI=F') inrLine = `≈ ₹${cmdFmt(inrPerKgSilver(d.price))} / kg (MCX-equivalent)`;
    document.getElementById('drawer-content').innerHTML = `
        <div class="flex items-center gap-3 mb-1"><div class="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">${d.emoji}</div><div><div class="text-xl font-bold text-slate-900">${d.name}</div><div class="text-xs text-slate-500">${d.sym} · ${d.cat}</div></div></div>
        <div class="flex items-end gap-3 mt-4 mb-1"><div class="text-3xl font-bold text-slate-900">${d.price == null ? '—' : commodityPrice(d.price)}<span class="text-sm font-medium text-slate-400 ml-1">USD${d.unit}</span></div><div class="text-base font-semibold ${changeColor(d.chg)} pb-1">${d.chg == null ? '—' : `${up ? '▲' : '▼'} ${Math.abs(d.chg).toFixed(2)}%`}</div></div>
        ${inrLine ? `<div class="text-sm text-slate-500 mb-4">${inrLine}</div>` : '<div class="h-2"></div>'}
        <div class="text-xs text-slate-400 text-center mt-5 leading-relaxed">Price data: Yahoo Finance futures (${d.sym}), USD${d.as_of ? ` · as of ${d.as_of}` : ''}. Commodity analysis is driven by macro factors (rates, USD, supply/demand, geopolitics) — not company fundamentals.</div>`;
    const o = document.getElementById('drawer-overlay'); o.classList.remove('hidden'); o.classList.add('flex');
}

// ============================================================
// Add-to-watchlist modal
// ============================================================
let pendingAddSymbol = null;
function openAddToWatchlist(symbol, name, currentPrice) {
    if (symbol) { pendingAddSymbol = symbol; document.getElementById('add-watchlist-stock').textContent = `${name} · ${symbol}`; document.getElementById('add-watchlist-price').value = currentPrice || ''; }
    else { pendingAddSymbol = null; document.getElementById('add-watchlist-stock').textContent = 'Select a stock from All Stocks first, then add it from there.'; }
    const o = document.getElementById('add-watchlist-overlay'); o.classList.remove('hidden'); o.classList.add('flex');
}
function closeAddToWatchlist() { const o = document.getElementById('add-watchlist-overlay'); o.classList.add('hidden'); o.classList.remove('flex'); }
function confirmAddToWatchlist() { const date = document.getElementById('add-watchlist-date').value, price = document.getElementById('add-watchlist-price').value, qty = document.getElementById('add-watchlist-qty').value; alert(`✓ Added to watchlist:\n${pendingAddSymbol}\nEntry: ${date} @ ₹${price}\nQty: ${qty}`); closeAddToWatchlist(); }

// ============================================================
// Top bar (scrolling ticker) — reads MOCK_TOPBAR
// ============================================================
function topBarRow(q) {
    const up = q.direction === 'up';
    const tone = q.ticker === '^INDIAVIX' ? 'text-slate-500' : up ? 'text-emerald-600' : 'text-rose-600';
    return `<div class="flex items-center gap-2 whitespace-nowrap"><span class="text-xs font-medium text-slate-500">${escAttr(q.name)}</span><span class="text-sm font-semibold">${q.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span><span class="text-xs font-medium ${tone}">${up ? '+' : '−'}${Math.abs(q.p_change).toFixed(2)}%</span></div>`;
}
function startTopBarTicker(strip, count) {
    const SPEED = 0.4; let pos = 0, hovering = false;
    let span = (strip.children[count]?.offsetLeft ?? 0) - (strip.children[0]?.offsetLeft ?? 0);
    window.addEventListener('resize', () => { span = (strip.children[count]?.offsetLeft ?? 0) - (strip.children[0]?.offsetLeft ?? 0); });
    strip.addEventListener('mouseenter', () => { hovering = true; }); strip.addEventListener('mouseleave', () => { hovering = false; });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const step = () => { if (span > 0 && !hovering) { pos += SPEED; if (pos >= span) pos -= span; strip.scrollLeft = pos; } requestAnimationFrame(step); };
    requestAnimationFrame(step);
}
function loadTopBar() {
    const strip = document.getElementById('market-strip');
    document.getElementById('home-date-today').textContent = MOCK_TOPBAR.date;
    document.getElementById('home-date-asof').textContent = fmtAsOf(MOCK_TOPBAR.as_of);
    const rows = MOCK_TOPBAR.market_data.map(topBarRow).join('');
    strip.innerHTML = rows + rows; strip.classList.add('market-strip');
    startTopBarTicker(strip, MOCK_TOPBAR.market_data.length);
}

// ============================================================
// View switching + init
// ============================================================
function hideAllViews() { ['home-view','all-stocks-view','top-recs-view','watchlist-view','commodities-view'].forEach(id => document.getElementById(id).classList.add('hidden')); }
function showHome() { hideAllViews(); document.getElementById('home-view').classList.remove('hidden'); window.scrollTo(0, 0); }
function showAllStocks() { hideAllViews(); document.getElementById('all-stocks-view').classList.remove('hidden'); window.scrollTo(0, 0); stockSearchTerm = ''; document.getElementById('all-stocks-search').value = ''; renderAllStocks(); }
function showTopRecs() { hideAllViews(); document.getElementById('top-recs-view').classList.remove('hidden'); renderTopRecs(); renderActiveRecs(); showTopRecsTab('top-picks'); window.scrollTo(0, 0); }
function showWatchlist() { hideAllViews(); document.getElementById('watchlist-view').classList.remove('hidden'); renderWatchlist(); window.scrollTo(0, 0); }
function showCommodities() { hideAllViews(); document.getElementById('commodities-view').classList.remove('hidden'); document.getElementById('commodities-fx').textContent = `USD/INR ≈ ${USDINR}.`; renderCommodityFilters(); renderCommodities(); window.scrollTo(0, 0); }
function showTopRecsTab(tab) {
    const tabTop = document.getElementById('tab-top-picks'), tabActive = document.getElementById('tab-active-calls');
    const contTop = document.getElementById('top-picks-content'), contActive = document.getElementById('active-calls-content');
    const inactiveCls = 'px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 -mb-px transition';
    const activeCls = 'px-4 py-2.5 text-sm font-medium border-b-2 border-sky-500 text-sky-600 -mb-px transition';
    const topPicksCount = document.getElementById('top-recs-list')?.children.length ?? 0;
    const activeCount = document.getElementById('active-recs-list')?.children.length ?? 0;
    tabTop.innerHTML = `Today's Top Picks <span id="top-picks-count" class="ml-1 text-xs text-slate-400">${topPicksCount}</span>`;
    tabActive.innerHTML = `Active Calls <span id="active-count" class="ml-1 text-xs text-slate-400">${activeCount}</span>`;
    if (tab === 'top-picks') { tabTop.className = activeCls; tabActive.className = inactiveCls; contTop.classList.remove('hidden'); contActive.classList.add('hidden'); }
    else { tabTop.className = inactiveCls; tabActive.className = activeCls; contTop.classList.add('hidden'); contActive.classList.remove('hidden'); }
}

// ----- Init -----
function init() {
    // All Stocks sector dropdown
    const secEl = document.getElementById('all-stocks-sector');
    secEl.innerHTML = '<option value="">All sectors</option>' + MOCK_SECTORS.map(s => `<option value="${escAttr(s)}">${escAttr(s)}</option>`).join('');
    secEl.onchange = (e) => onSectorChange(e.target.value);
    populateSectorSelects(MOCK_SECTORS);
    renderHomePicks();
    loadTopBar();
}
init();