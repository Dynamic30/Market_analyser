// ============================================================
// MOCK DATA
// Everything in this file is placeholder data that stands in for
// the backend. When api.js starts returning real payloads, these
// constants are what get replaced — the render code in app.js
// reads from them and shouldn't need to change shape.
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

// ----- Headline shown against each stock on the Top Picks list -----
const topRecNewsByStock = {
    'TCS.NS': '"TCS posts Q1 revenue ahead of estimates; deal wins at $9B in pipeline" — Moneycontrol · 4h ago',
    'TATAMOTORS.NS': '"Tata Motors crosses 250K EV sales mark; JLR margins recovering" — Economic Times · 2h ago',
    'INFY.NS': '"Infosys upgrades FY guidance; AI services revenue +34% YoY" — Bloomberg · 6h ago',
    'ICICIBANK.NS': '"ICICI Bank Q1 NIM at 4.2%; credit growth above sector avg" — BusinessLine · 1d ago',
    'BHARTIARTL.NS': '"Bharti Airtel subscriber net adds top 5M; ARPU expansion ongoing" — Mint · 3h ago',
    'SUNPHARMA.NS': '"Sun Pharma gets USFDA approval for 3 new generics; specialty pipeline strong" — Reuters · 8h ago',
    'LT.NS': '"L&T wins ₹15,000 Cr order from Indian Navy; order book at 5-yr high" — ETLegalWorld · 12h ago',
    'HDFCBANK.NS': '"HDFC Bank loan book grows 16% YoY; asset quality stable" — Moneycontrol · 5h ago',
    'RELIANCE.NS': '"Reliance Jio AGR appeal allowed; ₹2,000 Cr tax relief" — Hindustan Times · 7h ago',
    'AXISBANK.NS': '"Axis Bank loan growth accelerates; FII stake increased to 38%" — BusinessLine · 1d ago',
};

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

// ----- Commodities (macro-driven — reference: COMMOD~1.HTM) -----
const commodities = [
    // METALS
    {sym:'GC=F', name:'Gold',          cat:'Metals', emoji:'🥇', price:4182.40, unit:'/oz', chg:+0.9,  bias:'bull',    driver:'Fed rate-cut bets and steady central-bank buying keep the bid firm.',
       rsi:61, trend:'Above 50 & 200 DMA', range52:'2,780 – 4,240', dayRange:'4,150 – 4,196',
       analysis:'Gold remains in an established uptrend, trading above both its 50- and 200-day moving averages. The move is driven by expectations of Fed easing, a softer dollar, and record central-bank accumulation. Momentum is constructive but RSI in the low-60s leaves some room before overbought.',
       risks:['A hawkish Fed surprise would lift real yields and pressure gold','Sharp dollar strength caps upside','Positioning is crowded — a long unwind could be sharp']},
    {sym:'SI=F', name:'Silver',        cat:'Metals', emoji:'🥈', price:52.18,   unit:'/oz', chg:+1.6,  bias:'bull',    driver:'Industrial + solar demand firm on top of gold’s tailwind.',
       rsi:64, trend:'Above 50 & 200 DMA', range52:'28.4 – 53.9', dayRange:'51.3 – 52.6',
       analysis:'Silver is outperforming gold, helped by its dual role as both a precious and industrial metal. Solar and electronics demand underpins the physical market while investor flows track gold. Higher beta means larger swings in both directions.',
       risks:['Silver’s industrial demand makes it sensitive to a growth slowdown','Higher volatility than gold','Gold/silver ratio mean-reversion could cap gains']},
    {sym:'PL=F', name:'Platinum',      cat:'Metals', emoji:'⚪', price:1048.00, unit:'/oz', chg:-0.4,  bias:'neutral', driver:'Auto-catalyst demand soft as the EV shift continues.',
       rsi:49, trend:'Near 50 DMA', range52:'880 – 1,120', dayRange:'1,040 – 1,058',
       analysis:'Platinum is range-bound. Autocatalyst demand is under structural pressure from EV adoption, though supply discipline in South Africa provides a floor. No clear directional catalyst near term.',
       risks:['EV adoption erodes long-term catalyst demand','South African supply is a swing factor','Thin, illiquid market amplifies moves']},
    {sym:'PA=F', name:'Palladium',     cat:'Metals', emoji:'⚪', price:1121.50, unit:'/oz', chg:-1.1,  bias:'bear',    driver:'EV transition steadily eroding gasoline-catalyst demand.',
       rsi:41, trend:'Below 50 DMA', range52:'860 – 1,340', dayRange:'1,110 – 1,138',
       analysis:'Palladium remains under structural pressure as gasoline-engine catalyst demand fades with electrification. Rallies have been sold. Trend and momentum both lean bearish.',
       risks:['Structural demand decline from EV shift','Substitution toward platinum','Supply shocks from Russia can spike prices unexpectedly']},
    {sym:'HG=F', name:'Copper',        cat:'Metals', emoji:'🟠', price:5.24,    unit:'/lb', chg:+0.7,  bias:'bull',    driver:'China stimulus hopes and grid/EV demand support the “Dr. Copper” bid.',
       rsi:58, trend:'Above 50 DMA', range52:'3.90 – 5.45', dayRange:'5.19 – 5.28',
       analysis:'Copper is firm on expectations of Chinese stimulus and structural demand from electrification and grid build-out. As a growth bellwether it is sensitive to global PMI data.',
       risks:['China demand disappointment is the key downside','Global recession would hit industrial metals hard','Mine supply additions could soften the deficit']},

    // ENERGY
    {sym:'CL=F', name:'Crude Oil (WTI)', cat:'Energy', emoji:'🛢️', price:76.54, unit:'/bbl', chg:+0.9, bias:'neutral', driver:'OPEC+ supply discipline balanced against soft demand signals.',
       rsi:52, trend:'Near 50 DMA', range52:'62.1 – 89.4', dayRange:'75.6 – 77.2',
       analysis:'WTI is caught between OPEC+ production restraint and demand concerns tied to global growth. Middle-East risk premium adds a floor. Broadly range-bound without a fresh catalyst.',
       risks:['Demand slowdown from weaker global growth','OPEC+ policy shifts move the market sharply','Geopolitical escalation spikes prices']},
    {sym:'BZ=F', name:'Brent Crude',   cat:'Energy', emoji:'🛢️', price:80.10,  unit:'/bbl', chg:-0.6, bias:'bear',    driver:'Middle-East risk premium easing after ceasefire progress.',
       rsi:47, trend:'Near 50 DMA', range52:'66.0 – 92.8', dayRange:'79.4 – 81.0',
       analysis:'Brent is softening as the geopolitical risk premium unwinds following diplomatic progress. Fundamentals point to a broadly balanced-to-soft market into next quarter.',
       risks:['Renewed conflict would re-add a risk premium','Demand weakness in Asia','OPEC+ compliance slippage']},
    {sym:'NG=F', name:'Natural Gas',   cat:'Energy', emoji:'🔥', price:3.78,   unit:'/MMBtu', chg:-2.3, bias:'bear',   driver:'Mild weather and high storage weigh on prices.',
       rsi:38, trend:'Below 50 DMA', range52:'1.85 – 4.40', dayRange:'3.72 – 3.90',
       analysis:'Natural gas is under pressure from mild weather and comfortable storage levels. The market is notoriously volatile and weather-driven; a cold snap can reverse the trend quickly.',
       risks:['Weather is the dominant, unpredictable driver','LNG export demand can tighten balances fast','Extremely high volatility']},
    {sym:'RB=F', name:'RBOB Gasoline', cat:'Energy', emoji:'⛽', price:2.31,   unit:'/gal', chg:+0.4, bias:'neutral', driver:'Summer driving-season demand vs ample refinery output.',
       rsi:53, trend:'Near 50 DMA', range52:'1.92 – 2.68', dayRange:'2.29 – 2.34',
       analysis:'Gasoline tracks crude with a seasonal demand overlay. Peak driving season supports the crack spread, offset by healthy refinery utilisation.',
       risks:['Follows crude oil direction','Refinery outages spike prices','Demand destruction if pump prices climb']},
    {sym:'HO=F', name:'Heating Oil',   cat:'Energy', emoji:'🔆', price:2.49,   unit:'/gal', chg:+0.2, bias:'neutral', driver:'Winter-demand build ahead; distillate inventories watched.',
       rsi:51, trend:'Near 50 DMA', range52:'2.05 – 2.95', dayRange:'2.47 – 2.52',
       analysis:'Heating oil is seasonally sensitive with winter demand approaching. Distillate inventories and diesel demand (a growth proxy) are the key watch-points.',
       risks:['Warm winter cuts demand','Tied to crude and diesel spreads','Industrial slowdown hits distillate demand']},

    // AGRICULTURE
    {sym:'ZC=F', name:'Corn',          cat:'Agriculture', emoji:'🌽', price:431.25, unit:'¢/bu', chg:-0.8, bias:'bear', driver:'Strong harvest and ample global supply pressure prices.',
       rsi:42, trend:'Below 50 DMA', range52:'388 – 512', dayRange:'428 – 436',
       analysis:'Corn is soft on the back of a strong harvest and comfortable global stocks. Weather during the growing season and export demand are the swing factors.',
       risks:['Weather shocks can reverse quickly','Export demand (esp. China) is volatile','Ethanol demand ties it to energy']},
    {sym:'ZS=F', name:'Soybeans',      cat:'Agriculture', emoji:'🫘', price:1048.50, unit:'¢/bu', chg:+0.5, bias:'neutral', driver:'Chinese export demand steadies an otherwise well-supplied market.',
       rsi:50, trend:'Near 50 DMA', range52:'960 – 1,190', dayRange:'1,040 – 1,056',
       analysis:'Soybeans are balanced — South American supply is ample while Chinese import demand provides support. Trade-flow headlines drive short-term moves.',
       risks:['China trade policy is the dominant driver','South American weather and harvest','Currency (BRL) affects competitiveness']},
    {sym:'ZW=F', name:'Wheat',         cat:'Agriculture', emoji:'🌾', price:562.00, unit:'¢/bu', chg:+1.2, bias:'bull', driver:'Black Sea supply concerns add a risk premium.',
       rsi:56, trend:'Above 50 DMA', range52:'498 – 690', dayRange:'554 – 568',
       analysis:'Wheat carries a geopolitical risk premium from Black Sea supply uncertainty. Global stocks are adequate, so the market is headline-driven rather than trend-driven.',
       risks:['Black Sea / export-corridor headlines','Global stocks remain adequate','Weather in major exporters']},
    {sym:'KC=F', name:'Coffee',        cat:'Agriculture', emoji:'☕', price:321.40, unit:'¢/lb', chg:+2.1, bias:'bull', driver:'Brazil frost/drought risk tightening the arabica balance.',
       rsi:67, trend:'Above 50 & 200 DMA', range52:'210 – 340', dayRange:'314 – 326',
       analysis:'Coffee is in a strong uptrend on Brazilian weather risk (frost and drought) tightening the arabica supply outlook. Momentum is strong but RSI is approaching overbought.',
       risks:['Weather premium can deflate fast if rains arrive','Overbought momentum','Speculative positioning is heavy']},
    {sym:'CT=F', name:'Cotton',        cat:'Agriculture', emoji:'🧺', price:67.80, unit:'¢/lb', chg:-0.9, bias:'bear', driver:'Weak global textile demand caps prices.',
       rsi:43, trend:'Below 50 DMA', range52:'60.2 – 82.5', dayRange:'67.1 – 68.6',
       analysis:'Cotton is soft on subdued textile and apparel demand amid a cautious consumer. Supply is adequate; demand recovery is the missing catalyst.',
       risks:['Consumer/apparel demand is weak','Tied to global growth','Polyester substitution']},
    {sym:'SB=F', name:'Sugar',         cat:'Agriculture', emoji:'🍬', price:19.15, unit:'¢/lb', chg:+0.7, bias:'bull', driver:'India export curbs and firm ethanol demand support prices.',
       rsi:55, trend:'Above 50 DMA', range52:'16.4 – 24.1', dayRange:'18.9 – 19.3',
       analysis:'Sugar is supported by Indian export restrictions and strong Brazilian ethanol demand diverting cane. Global balance is tightening at the margin.',
       risks:['India policy can flip supply quickly','Brazilian cane allocation shifts','Oil prices affect the ethanol/sugar mix']},
    {sym:'CC=F', name:'Cocoa',         cat:'Agriculture', emoji:'🍫', price:7520.00, unit:'/MT', chg:+1.8, bias:'bull', driver:'Persistent West-African supply deficit keeps prices elevated.',
       rsi:63, trend:'Above 50 DMA', range52:'5,900 – 9,800', dayRange:'7,410 – 7,590',
       analysis:'Cocoa remains structurally tight due to poor West-African harvests (disease, weather, ageing trees). Prices are elevated and volatile as supply struggles to recover.',
       risks:['Extreme volatility at high price levels','Demand destruction from high prices','A supply recovery would correct sharply']},
    {sym:'OJ=F', name:'Orange Juice',  cat:'Agriculture', emoji:'🍊', price:372.10, unit:'¢/lb', chg:+0.3, bias:'bull', driver:'Florida crop disease and hurricane risk keep supply tight.',
       rsi:59, trend:'Above 50 DMA', range52:'300 – 480', dayRange:'366 – 378',
       analysis:'Orange juice supply is constrained by Florida citrus greening disease and hurricane damage. A thin, illiquid market means outsized moves on any supply news.',
       risks:['Very thin, illiquid market','Weather / hurricane season','Demand elasticity at high prices']},

    // LIVESTOCK
    {sym:'LE=F', name:'Live Cattle',   cat:'Livestock', emoji:'🐄', price:188.30, unit:'¢/lb', chg:+0.6, bias:'bull', driver:'Tight cattle supply and low herd numbers support prices.',
       rsi:60, trend:'Above 50 DMA', range52:'170 – 196', dayRange:'186 – 190',
       analysis:'Live cattle are supported by a multi-year-low US herd and tight supply. Beef demand and feed costs are the key variables.',
       risks:['Consumer beef demand at high retail prices','Feed (corn) cost swings','Herd rebuilding will eventually add supply']},
    {sym:'HE=F', name:'Lean Hogs',     cat:'Livestock', emoji:'🐖', price:91.80, unit:'¢/lb', chg:-1.4, bias:'bear', driver:'Soft export demand and ample supply weigh on prices.',
       rsi:40, trend:'Below 50 DMA', range52:'78 – 108', dayRange:'90.6 – 93.4',
       analysis:'Lean hogs are pressured by weak export demand and comfortable supply. Seasonal demand patterns and Chinese buying are the swing factors.',
       risks:['Export demand (China) is volatile','Disease outbreaks (ASF) shift supply','Feed cost changes']},
    {sym:'GF=F', name:'Feeder Cattle', cat:'Livestock', emoji:'🐂', price:258.20, unit:'¢/lb', chg:+0.2, bias:'neutral', driver:'Herd rebuilding vs low supply keeps prices range-bound.',
       rsi:52, trend:'Near 50 DMA', range52:'232 – 272', dayRange:'256 – 261',
       analysis:'Feeder cattle balance tight supply against gradual herd rebuilding. Prices move inversely to feed costs and track the live-cattle complex.',
       risks:['Inverse sensitivity to corn/feed prices','Tied to live-cattle direction','Drought affects grazing and placements']},
];
