// ============================================================
// API LAYER — placeholder
// This is where every fetch to the FastAPI backend will live, so
// app.js never talks to the network directly. Nothing here is wired
// up yet: the UI still reads the constants in mock-data.js.
//
// Route shape mirrors backend/api_doc.md:
//   /v1/home            GET /  ·  /market_data  ·  /page/llm  ·  /page/raw
//   /v1/all_stocks      GET /sector  ·  /stocks  ·  /card/{stock}  ·  /card/{stock}/full_analysis
//   /v1/top_picks       GET
//   /v1/watchlist       GET · POST · DELETE
//   /v1/commodities     GET
// ============================================================

const API_BASE = '/v1';

// Thin wrapper — every call goes through here so auth headers, error
// handling and loading states get added in exactly one place later.
async function request(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}

const api = {
    home:            ()               => request('/home/'),
    topBar:          ()               => request('/home/basic_top_bar'),
    homeSector:      ()               => request('/home/sector'),
    topPick:         (sector)         => request(`/home/top_pick/${sector}`),
    llmPicks:        ()               => request('/home/page/llm'),
    rawPicks:        ()               => request('/home/page/raw'),
    sectors:         ()               => request('/all_stocks/sector'),
    // offset/limit back the "Load more stocks" button in the All Stocks view.
    // sector is optional — omitted means "all sectors".
    stocks: (offset, limit, sector) => {
        const q = new URLSearchParams({ offset, limit });
        if (sector) q.set('sector', sector);
        return request(`/all_stocks/stocks?${q}`);
    },
    stockCard:       (symbol)         => request(`/all_stocks/card/${symbol}`),
    stockFull:       (symbol)         => request(`/all_stocks/card/${symbol}/full_analysis`),
    // accuracy check for a single sector's previous-day predictions
    sectorCheck:     (sector)         => request(`/all_stocks/last_analysis_check/${encodeURIComponent(sector)}`),
    topPicks:        ()               => request('/top_picks/'),
    watchlist:       ()               => request('/watchlist/'),
    addToWatchlist:  (payload)        => request('/watchlist/', { method: 'POST', body: JSON.stringify(payload) }),
    removeFromWatchlist: (symbol)     => request(`/watchlist/${symbol}`, { method: 'DELETE' }),
    // sector is a category name (Metals/Energy/Agriculture/Livestock) or 'all'.
    commodities:     (sector = 'all')  => request(`/commodities/${sector}/commodity`),
};
