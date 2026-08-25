// ============================================================
// MOCK DATA — Watchlist + Active Calls ONLY
// ============================================================
// Home, All Stocks and Commodities no longer read this file: they render
// exclusively from the API (see api.js) and show an empty state when a
// endpoint has no rows. Nothing in here reaches those three views.
//
// What still depends on it, and why:
//   watchlist          → Watchlist view. No /v1/watchlist router exists yet
//                        (backend/routers/watchlist.py is empty), so the view
//                        is built against this until the endpoint lands.
//   stocks             → buildActiveRecs() for the Active Calls tab, which has
//   holdDurations        no endpoint either. NOT used by Home/All Stocks.
//
// Deleting either constant breaks only those two surfaces.
// ============================================================

// ----- Mock stock data -----
const stocks = [
    {symbol:'RELIANCE.NS', name:'Reliance Industries', sector:'Energy', industry:'Oil & Gas Refining & Marketing', price:1358, change:-1.4, llmBias:'Mixed', llmScore:0.52, llmAction:'HOLD', pythonScore:58, summary:'Conglomerate spanning hydrocarbons, retail, digital services, and media. India’s largest private-sector company by revenue.', promoter:'Mukesh Ambani', employees:389000, founded:1966, marketCap:'18.4L Cr', isin:'INE002A01018'},
    {symbol:'TCS.NS', name:'Tata Consultancy Services', sector:'IT', industry:'Information Technology Services', price:3987, change:0.8, llmBias:'Bullish', llmScore:0.71, llmAction:'BUY', pythonScore:74, summary:'India’s largest IT services company, providing consulting, technology, and business solutions globally.', promoter:'Tata Group', employees:614000, founded:1968, marketCap:'14.4L Cr', isin:'INE467B01029'},
    {symbol:'HDFCBANK.NS', name:'HDFC Bank', sector:'Financial Services', industry:'Private Sector Bank', price:1672, change:0.3, llmBias:'Bullish', llmScore:0.68, llmAction:'BUY', pythonScore:71, summary:'India’s largest private sector bank by assets, offering retail and corporate banking, loans, and credit cards.', promoter:'Public (no promoter)', employees:177000, founded:1994, marketCap:'12.7L Cr', isin:'INE040A01034'},
    {symbol:'INFY.NS', name:'Infosys', sector:'IT', industry:'Information Technology Services', price:1782, change:1.4, llmBias:'Bullish', llmScore:0.66, llmAction:'BUY', pythonScore:68, summary:'Global IT services and consulting company. Second-largest Indian IT services exporter.', promoter:'Public (no promoter)', employees:336000, founded:1981, marketCap:'7.4L Cr', isin:'INE009A01021'},
    {symbol:'ICICIBANK.NS', name:'ICICI Bank', sector:'Financial Services', industry:'Private Sector Bank', price:1245, change:0.7, llmBias:'Bullish', llmScore:0.64, llmAction:'BUY', pythonScore:66, summary:'Second largest private sector bank in India, providing retail, corporate, and rural banking services.', promoter:'Public (no promoter)', employees:130000, founded:1994, marketCap:'8.7L Cr', isin:'INE090A01021'},
    {symbol:'ITC.NS', name:'ITC Limited', sector:'FMCG', industry:'Diversified FMCG', price:472, change:-0.2, llmBias:'Mixed', llmScore:0.54, llmAction:'HOLD', pythonScore:55, summary:'Diversified conglomerate with leading positions in cigarettes, FMCG, hotels, paperboards, and agribusiness.', promoter:'British American Tobacco (29%)', employees:36500, founded:1910, marketCap:'5.9L Cr', isin:'INE154A01025'},
    {symbol:'HINDUNILVR.NS', name:'Hindustan Unilever', sector:'FMCG', industry:'Personal Products', price:2487, change:0.4, llmBias:'Neutral', llmScore:0.51, llmAction:'HOLD', pythonScore:52, summary:'India’s largest FMCG company, manufacturing personal care, home care, and food products.', promoter:'Unilever PLC (61.9%)', employees:21000, founded:1933, marketCap:'5.8L Cr', isin:'INE030A01027'},
    {symbol:'BHARTIARTL.NS', name:'Bharti Airtel', sector:'Telecom', industry:'Telecom Services', price:1567, change:1.8, llmBias:'Bullish', llmScore:0.69, llmAction:'BUY', pythonScore:70, summary:'India’s second-largest telecom operator and a leading global player with operations in 17 countries.', promoter:'Sunil Bharti Mittal (35.8%)', employees:25000, founded:1995, marketCap:'9.1L Cr', isin:'INE397D01024'},
    {symbol:'KOTAKBANK.NS', name:'Kotak Mahindra Bank', sector:'Financial Services', industry:'Private Sector Bank', price:1748, change:-0.5, llmBias:'Neutral', llmScore:0.48, llmAction:'HOLD', pythonScore:51, summary:'Private sector bank offering banking, investment banking, asset management, and broking services.', promoter:'Uday Kotak (25.7%)', employees:108000, founded:2003, marketCap:'3.5L Cr', isin:'INE237A01028'},
    {symbol:'LT.NS', name:'Larsen & Toubro', sector:'Construction', industry:'Engineering, Construction & Infra', price:3562, change:0.6, llmBias:'Bullish', llmScore:0.62, llmAction:'BUY', pythonScore:64, summary:'India’s largest engineering and construction conglomerate. Operates across heavy engineering, infra, and IT services.', promoter:'Public (no promoter)', employees:84000, founded:1938, marketCap:'4.9L Cr', isin:'INE018A01030'},
    {symbol:'MARUTI.NS', name:'Maruti Suzuki', sector:'Auto', industry:'Passenger Vehicles', price:11842, change:-0.9, llmBias:'Mixed', llmScore:0.46, llmAction:'NEUTRAL', pythonScore:48, summary:'India’s largest passenger car manufacturer. Subsidiary of Suzuki Motor Corporation, Japan.', promoter:'Suzuki Motor Corp (56.4%)', employees:34000, founded:1981, marketCap:'3.7L Cr', isin:'INE585B01010'},
    {symbol:'AXISBANK.NS', name:'Axis Bank', sector:'Financial Services', industry:'Private Sector Bank', price:1138, change:0.2, llmBias:'Neutral', llmScore:0.50, llmAction:'HOLD', pythonScore:54, summary:'Third largest private sector bank in India, offering financial services to retail, corporate, and SME customers.', promoter:'Public (no promoter)', employees:91000, founded:1993, marketCap:'3.5L Cr', isin:'INE238A01034'},
    {symbol:'WIPRO.NS', name:'Wipro', sector:'IT', industry:'Information Technology Services', price:524, change:-1.2, llmBias:'Bearish', llmScore:0.32, llmAction:'SELL', pythonScore:36, summary:'Global IT, consulting, and business process services company. Part of the Azim Premji-led Wipro group.', promoter:'Azim Premji & affiliates (72.9%)', employees:233000, founded:1945, marketCap:'2.7L Cr', isin:'INE075A01022'},
    {symbol:'SUNPHARMA.NS', name:'Sun Pharmaceutical', sector:'Pharma', industry:'Pharmaceuticals', price:1823, change:1.1, llmBias:'Bullish', llmScore:0.65, llmAction:'BUY', pythonScore:67, summary:'India’s largest pharmaceutical company and the world’s fifth-largest specialty generic pharma company.', promoter:'Dilip Shanghvi & affiliates (54.5%)', employees:38000, founded:1983, marketCap:'4.4L Cr', isin:'INE044A01036'},
    {symbol:'ASIANPAINT.NS', name:'Asian Paints', sector:'Consumer', industry:'Paints', price:2734, change:-0.3, llmBias:'Neutral', llmScore:0.49, llmAction:'HOLD', pythonScore:52, summary:'India’s largest paint company and the world’s 10th largest. Markets decorative coatings, industrial coatings, and bath fittings.', promoter:'Asian Paints (Group) (52.6%)', employees:8000, founded:1942, marketCap:'2.6L Cr', isin:'INE021A01026'},
    {symbol:'TATAMOTORS.NS', name:'Tata Motors', sector:'Auto', industry:'Commercial & Passenger Vehicles', price:782, change:2.1, llmBias:'Bullish', llmScore:0.72, llmAction:'BUY', pythonScore:73, summary:'India’s largest auto company by revenue. Owns Jaguar Land Rover and is a leader in EVs in India.', promoter:'Tata Group (46.4%)', employees:81000, founded:1945, marketCap:'2.9L Cr', isin:'INE155A01022'},
];

// ----- Hold-duration metadata (LLM only) -----
// Mirrors the LLM analysis JSON fields: hold_duration_days / hold_duration_label / hold_duration_reason.
// Only meaningful when the LLM action is HOLD — every other action (and raw/Python analysis) leaves
// them null, because a raw signal can't justify a time window. `days: null` = no time-bound catalyst.
const holdDurations = {
    'RELIANCE.NS':   { days: 11,   label: '1–2 weeks',    reason: 'Hold through Q1 earnings on 3 Jul; re-evaluate the ₹1,434 breakout once the print lands.' },
    'ITC.NS':        { days: 3,    label: '~3 days',      reason: 'Holding above the 20D EMA near ₹468; re-check if it breaks ₹465 support.' },
    'HINDUNILVR.NS': { days: 5,    label: '~5 days',      reason: 'Range-bound between ₹2,460 support and ₹2,540 resistance; wait for a volume-backed breakout.' },
    'AXISBANK.NS':   { days: 2,    label: '~2 days',      reason: 'Momentum fading into monthly expiry; reassess after F&O settlement on 26 Jun.' },
    'ASIANPAINT.NS': { days: 7,    label: '~1 week',      reason: 'Hold above the ₹2,700 50D EMA support; re-check if input-cost news breaks the level.' },
    'KOTAKBANK.NS':  { days: null, label: 'Undetermined', reason: 'Range-bound with no near-term catalyst — re-evaluate in ~5 sessions.' },
};
stocks.forEach(s => {
    const h = (s.llmAction === 'HOLD') ? holdDurations[s.symbol] : null;
    s.hold_duration_days   = h ? h.days   : null;
    s.hold_duration_label  = h ? h.label  : null;
    s.hold_duration_reason = h ? h.reason : null;
});

// ----- Watchlist -----
// Each row has BOTH the global LLM action (from cached nightly analysis) AND
// a Python-decided personalized action that cross-references the user's entry context.
const watchlist = [
    {
        symbol:'RELIANCE.NS', name:'Reliance Industries', entryPrice:1340, entryDate:'15 Jun', currentPrice:1358, qty:5,
        // Cached LLM output from nightly batch:
        llmAction:'HOLD', actionDaysTotal:7, actionDaysRemaining:4,
        llmSynthesis:'Technicals constructive with price above 20D EMA, ROCE healthy, FII flows turning supportive. Continue holding while support at ₹1,311 holds.',
        topRisk:'Earnings in 12 days; surprise history is mixed',
        // Python-decided personalization:
        personalizedAction:'HOLD',
        personalizedReason:'Bias supports your +1.3% position. Continue holding.',
    },
    {
        symbol:'TCS.NS', name:'Tata Consultancy Services', entryPrice:3850, entryDate:'12 Jun', currentPrice:3987, qty:2,
        llmAction:'HOLD', actionDaysTotal:10, actionDaysRemaining:6,
        llmSynthesis:'Bullish bias intact across timeframes. Revenue growth resilient, deal pipeline strong. Hold through Q1 results.',
        topRisk:'US tech spending slowdown could pressure FY revenue guidance',
        personalizedAction:'HOLD',
        personalizedReason:'Strong thesis intact, +3.6% on the right side. Continue holding.',
    },
    {
        symbol:'HDFCBANK.NS', name:'HDFC Bank', entryPrice:1700, entryDate:'05 Jun', currentPrice:1672, qty:6,
        llmAction:'HOLD', actionDaysTotal:14, actionDaysRemaining:2,
        llmSynthesis:'Neutral signals across categories. NIM under pressure but credit growth steady. No urgent directional bias.',
        topRisk:'Approaching re-evaluation window — only 2 days of conviction left',
        personalizedAction:'WAIT',
        personalizedReason:'At −1.6% with no exit signal. Hold for recovery, but re-evaluation due in 2 days.',
    },
    {
        symbol:'BHARTIARTL.NS', name:'Bharti Airtel', entryPrice:1200, entryDate:'10 May', currentPrice:1567, qty:3,
        // Global LLM still bullish, but user is at +30% — Python diverges
        llmAction:'BUY', actionDaysTotal:10, actionDaysRemaining:8,
        llmSynthesis:'Strong momentum with subscriber additions accelerating, ARPU expansion ongoing. Expected 10-day upside ~₹40 from current.',
        topRisk:'Already at +30.6% — risk-reward less favorable from here',
        personalizedAction:'TRIM',
        personalizedReason:'Captured +30.6% — bias still bullish but consider partial exit (sell 30-50%) for risk-adjusted returns.',
    },
    {
        symbol:'MARUTI.NS', name:'Maruti Suzuki', entryPrice:12000, entryDate:'01 Jun', currentPrice:11842, qty:1,
        llmAction:'SELL', actionDaysTotal:1, actionDaysRemaining:0,
        llmSynthesis:'Trend has turned with price below 20D and 50D EMAs. Volume confirming the breakdown. Auto sector facing margin pressure.',
        topRisk:'Hold window expired; bias decisively bearish',
        personalizedAction:'CUT LOSSES',
        personalizedReason:'Trend confirmed against you at −1.3%. Cut losses before further drawdown.',
    },
    {
        symbol:'TATAMOTORS.NS', name:'Tata Motors', entryPrice:720, entryDate:'10 Jun', currentPrice:782, qty:8,
        llmAction:'BUY', actionDaysTotal:10, actionDaysRemaining:8,
        llmSynthesis:'Conviction strengthened to 73/100. Technical breakout above 200D EMA with strong volume. JLR margins recovering.',
        topRisk:'EV competition intensifying in domestic market',
        personalizedAction:'BUY MORE',
        personalizedReason:'At +8.6%, bias supports adding to position. Consider averaging up.',
    },
];
