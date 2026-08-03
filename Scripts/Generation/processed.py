import yfinance as yf
import pandas as pd
import numpy as np
import pandas_ta as ta 
import pathlib
import json
from datetime import date, datetime, timedelta
from dotenv import load_dotenv
import os
import pymongo
from sqlalchemy import create_engine, text
from nsepython import (
    nse_fiidii, nse_largedeals_historical,nse_optionchain_scrapper, equity_history, nse_quote_meta
)

print("Its working")

# Keys are yfinance sector names (what info['sector'] actually returns), values are
# the matching NSE sector index on yfinance. "Utilities" has no clean NSE index.
_SECTOR_MAP = {
    "Technology":             "^CNXIT",
    "Financial Services":     "^NSEBANK",
    "Healthcare":             "^CNXPHARMA",
    "Consumer Cyclical":      "^CNXCONSUM",
    "Consumer Defensive":     "^CNXFMCG",
    "Basic Materials":        "^CNXMETAL",
    "Energy":                 "^CNXENERGY",
    "Real Estate":            "^CNXREALTY",
    "Industrials":            "^CNXINFRA",
    "Communication Services": "^CNXMEDIA",
}

# Sector index 20-session returns, fetched once per run instead of once per stock.
_sector_ret20 = {}



load_dotenv()

database_url = os.getenv("DATABASE")

db_cleint = pymongo.MongoClient(database_url)

engine = create_engine(
    os.getenv("SQL_DB", "postgresql+psycopg://market:market@localhost:5432/market_analyser")
)


today = date.today()



def data_from_nsepython(symbol, sector=None):
    """
    USE THIS CODE TO PULL THESE VALUES FROM YFINANCE
    1. fii_trend
    2. dii_trend
    3. delivery_conviction (real delivery %, replaces your candle-body proxy)
    4. institutional_divergence (from bulk/block deals, replaces your ADL proxy)
    5. pcr_oi (F&O stocks only)
    6. max_pain (F&O stocks only)
    7. asm_status
    8. fno_ban_status
    9. sector_rs (sector relative strength)
    10. Beta (yfinance is pulling from s&p so this one will pull from Nifty50)
    """

    fii_trend = "No Data"
    dii_trend = "No Data"
    try:
        df = nse_fiidii(mode="pandas")

        # netValue / buyValue / sellValue come back as strings — coerce to float
        df['netValue'] = pd.to_numeric(
            df['netValue'].astype(str)
            .str.replace(',', '', regex=False)
            .str.replace('₹', '', regex=False)
            .str.strip(),
            errors='coerce'
        )

        fii_net = df.loc[df['category'].str.contains('FII', case=False, na=False), 'netValue'].sum()
        dii_net = df.loc[df['category'].str.contains('DII', case=False, na=False), 'netValue'].sum()

        fii_trend = "Bullish" if fii_net > 500 else "Bearish" if fii_net < -500 else "Neutral"
        dii_trend = "Bullish" if dii_net > 500 else "Bearish" if dii_net < -500 else "Neutral"
    except Exception as e:
        print(f"data fetch failed {type(e).__name__}: {e}")


    delivery_conviction = "No Data"
    try:
        end = datetime.today()
        start = end - timedelta(days=15)  # 15-day buffer for weekends/holidays
        hist = equity_history(symbol, "EQ",
                            start.strftime("%d-%m-%Y"),
                            end.strftime("%d-%m-%Y"))
        # Column name varies by nsepython version; find it dynamically.
        dcol = next(c for c in hist.columns if 'Deliv' in c or 'Dly' in c)
        latest = float(hist[dcol].iloc[-1])
        price_up = hist['Close'].iloc[-1] > hist['Close'].iloc[-2]

        if   latest > 60 and price_up: delivery_conviction = f"Strong Accumulation ({latest:.0f}%)"
        elif latest > 60:              delivery_conviction = f"Distribution ({latest:.0f}%)"
        elif latest < 30:              delivery_conviction = f"Speculative ({latest:.0f}%)"
        else:                          delivery_conviction = f"Normal ({latest:.0f}%)"
    except Exception as e:
        print(f"data fetch failed {type(e).__name__}: {e}")

    # 3. Bulk deal flow over last 5 sessions
    institutional_divergence = "No Data"
    try:
        end = datetime.today()
        start = end - timedelta(days=5)
        df = nse_largedeals_historical(
            start.strftime("%d-%m-%Y"),
            end.strftime("%d-%m-%Y"),
            mode="bulk_deals"
        )
        df = df[df['symbol'] == symbol]
        b = df['buySell'].str.upper().str.startswith('B').sum()
        s = df['buySell'].str.upper().str.startswith('S').sum()
        if   b > s and b >= 2:    institutional_divergence = f"Bullish ({b}B in 5d)"
        elif s > b and s >= 2:    institutional_divergence = f"Bearish ({s}S in 5d)"
        elif b == 0 and s == 0:   institutional_divergence = "No deals"
        else:                     institutional_divergence = f"Mixed ({b}B / {s}S)"
    except Exception as e:
        print(f"data fetch failed {type(e).__name__}: {e}")


    # 4 & 5. PCR and Max Pain (F&O stocks only; cash-only stocks get None)
    pcr_oi = "NO DATA COLLECTED"
    max_pain = "NO DATA COLLECTED"

    stock = yf.Ticker(f"{symbol}.NS").history(period="1y")['Close']

    # 6. Sector relative strength (only computed if sector is mapped).
    # NSE's equity_history is 403-blocked, so both legs come from yfinance.
    sector_rs = None
    idx = _SECTOR_MAP.get(sector) if sector else None
    if idx:
        try:
            if idx not in _sector_ret20:
                h = yf.Ticker(idx).history(period="6mo")['Close']
                _sector_ret20[idx] = (h.iloc[-1] / h.iloc[-21] - 1) * 100
            # 20-session return diff: stock minus sector
            sr = (stock.iloc[-1] / stock.iloc[-21] - 1) * 100
            diff = round(sr - _sector_ret20[idx], 1)
            label = "Outperform" if diff > 2 else "Underperform" if diff < -2 else "In-line"
            sector_rs = f"{label} ({diff:+.1f}%)"
        except Exception as e:
            print(f"data fetch failed {type(e).__name__}: {e}")

    # 7. Beta vs NIFTY 50 (yfinance defaults to S&P 500 which is wrong for NSE stocks)
    beta_nifty = None
    try:
        nifty = yf.Ticker("^NSEI").history(period="1y")['Close']
        joined = pd.concat([stock.rename('stk'), nifty.rename('nf')], axis=1).dropna()
        r_stk = joined['stk'].pct_change()
        r_nf  = joined['nf'].pct_change()
        valid = pd.concat([r_stk, r_nf], axis=1).dropna().tail(250)
        if len(valid) >= 60:
            cov = np.cov(valid.iloc[:, 0], valid.iloc[:, 1])[0][1]
            var = np.var(valid.iloc[:, 1])
            if var:
                beta_nifty = round(float(cov / var), 2)

    except Exception as e:
        print(f"data fetch failed {type(e).__name__}: {e}")

    return {
        "fii_trend":                fii_trend,
        "dii_trend":                dii_trend,
        "delivery_conviction":      delivery_conviction,
        "institutional_divergence": institutional_divergence,
        "pcr_oi":                   pcr_oi,
        "max_pain":                 max_pain,
        "sector_rs":                sector_rs,
        "beta_nifty":               beta_nifty,
        # placeholders so downstream code doesn't break when you add later
        "asm_status":               None,
        "fno_ban_status":           None,
    }



# yfinance ticker + the nifty_markets label used to look up constituents for breadth.
_INDICES = {
    "NIFTY_50":   ("^NSEI",    "NIFTY 50"),
    "BANK_NIFTY": ("^NSEBANK", "NIFTY BANK"),
    "NASDAQ":     ("^IXIC",    None),
}


def _breadth(index_name):
    if index_name is None:
        return "No Data"
    with engine.connect() as conn:
        syms = conn.execute(
            text("SELECT nse_symbol FROM stocks WHERE nifty_markets @> :idx"),
            {"idx": json.dumps([index_name])},
        ).scalars().all()
    if not syms:
        return "No Data"

    px = yf.download([f"{s}.NS" for s in syms], period="5d",
                     progress=False, auto_adjust=True)["Close"]
    last, prev = px.iloc[-1], px.iloc[-2]
    adv = int((last > prev).sum())
    dec = int((last < prev).sum())
    return f"{adv} adv / {dec} dec"


def market():
    """Index-level context shared by every stock on a given day. Call once per
    run and pass the result down — it is identical for all symbols."""
    out = {}
    for key, (ticker, index_name) in _INDICES.items():
        block = {"trend": "", "change_pct": "", "volatility_status": "",
                 "market_breadth": "", "relative_strength_score": "", "_ret20": None}
        try:
            h = yf.Ticker(ticker).history(period="1y")["Close"]
            close = h.iloc[-1]

            block["change_pct"] = round((close / h.iloc[-2] - 1) * 100, 2)

            # This index's own 20-session return — the baseline relative_strength()
            # subtracts the stock's return from. Stripped before the doc is stored.
            if len(h) >= 21:
                block["_ret20"] = (close / h.iloc[-21] - 1) * 100

            ema20 = h.ewm(span=20).mean().iloc[-1]
            ema50 = h.ewm(span=50).mean().iloc[-1]
            block["trend"] = ("Bullish" if close > ema20 > ema50
                              else "Bearish" if close < ema20 < ema50
                              else "Sideways")

            # 20D realised vol against its own 1y median — same rule for every index.
            rv = h.pct_change().rolling(20).std() * (252 ** 0.5) * 100
            cur, med = rv.iloc[-1], rv.median()
            block["volatility_status"] = ("High" if cur > med * 1.3
                                          else "Low" if cur < med * 0.7
                                          else "Normal")

            block["market_breadth"] = _breadth(index_name)
        except Exception as e:
            print(f"market data failed for {key} {type(e).__name__}: {e}")
        out[key] = block

    return out


def relative_strength(market_ctx, df):
    """Fill relative_strength_score on every market block. `market_ctx` comes from
    market(), `df` is the stock's own 1y history — both already in memory, so this
    costs no extra network calls."""
    out = {}
    for key, block in market_ctx.items():
        block = dict(block)
        ret20 = block.pop("_ret20", None)

        score = None
        if ret20 is not None and len(df) >= 21:
            sr = (df["Close"].iloc[-1] / df["Close"].iloc[-21] - 1) * 100
            diff = round(sr - ret20, 1)
            label = "Outperform" if diff > 2 else "Underperform" if diff < -2 else "In-line"
            score = f"{label} ({diff:+.1f}%)"

        block["relative_strength_score"] = score
        out[key] = block
    return out


def json_data(company_name,today,market_ctx=None):
    # market_ctx is the same for every stock on a given day — the orchestrator
    # builds it once and passes it in. Falls back to a fresh fetch for one-off runs.
    if market_ctx is None:
        market_ctx = market()

    name = company_name.upper()
    symbol = f"{name}.NS"
    ticker = yf.Ticker(f"{name}.NS")
    info = ticker.info
    if not info or info.get('regularMarketPrice') is None or info.get('marketCap') is None:
        raise ValueError(f"No usable yfinance data for {symbol}")

    # Meta data
    sector = ticker.info.get('sector')
    industry = ticker.info.get('industry')
    market_cap_inr = ticker.info.get('marketCap')
    current_price = ticker.info.get('currentPrice')
    currency = ticker.info.get('financialCurrency')
    market_cap = "Small Cap (<10K Cr)" if market_cap_inr < 100_000_000_000 else ("Mid Cap (10-50K Cr)" if market_cap_inr < 500_000_000_000 else ("Large Cap (50K-2L Cr)" if market_cap_inr < 2_000_000_000_000 else "Mega Cap (>2L Cr)"))
    
 # TECHNICAL SIGNALS 

    df = ticker.history(period="1y")
    df["EMA_20"] = df["Close"].ewm(span=20, adjust=False).mean()
    df["EMA_50"] = df["Close"].ewm(span=50, adjust=False).mean()
    df["EMA_200"] = df["Close"].ewm(span=200, adjust=False).mean()
    latest = df.iloc[-1]
    market_date = df.index[-1].date()

    close = latest["Close"]
    ema20 = latest["EMA_20"]
    ema50 = latest["EMA_50"]
    ema200 = latest["EMA_200"]
    short_term = "Bullish" if close > ema20 else "Bearish"
    medium_term = "Bullish" if ema20 > ema50 else "Bearish"
    long_term = "Bullish" if ema50 > ema200 else "Bearish"
    closing_bias = "Positive" if close > ema20 else "Negative"
    
    df["RSI_14"] = ta.rsi(df["Close"], length=14)
    rsi_14 = round(df["RSI_14"].iloc[-1], 2)

    high_52w = df["Close"].max()
    low_52w = df["Close"].min()
    
    distance_from_52w_high_pct = round(
        ((close - high_52w) / high_52w) * 100, 2
    )

    distance_from_52w_low_pct = round(
        ((close - low_52w) / low_52w) * 100, 2
    )
    # Volume dynamics 
    df_vol = ticker.history(period="1mo")

    if not df_vol.empty:
        current_volume = df_vol['Volume'].iloc[-1]
        avg_vol_20 = df_vol['Volume'].tail(20).mean()
        if avg_vol_20 > 0:
            vol_ratio = (current_volume / avg_vol_20) 
        else:
            vol_ratio = 0
        
        if vol_ratio >= 2.0:
            volume_status = f"Ultra High ({round(vol_ratio, 1)}x Avg)"
        elif vol_ratio >=1.5:
            volume_status = f"High ({round(vol_ratio, 1)} x Avg)"
        elif vol_ratio < 0.5:
            volume_status = "Low (Dry)"
        else:
            volume_status = "Normal"
    
        # Liquidity 
        turnover = avg_vol_20 * current_price
        if turnover > 1000000000:
            liquidity_status = "Tier 1 (Institutional)"
        elif turnover > 100000000:
            liquidity_status = "Liquid"
        elif turnover > 10000000:
            liquidity_status = "Moderate"
        else:
            liquidity_status = "Illiquid (Risky)"

    else:
        volume_status = "Unknown"
        liquidity_status = "Unknown"

    print("Getting Data From nsepython")
    nse = data_from_nsepython(name, sector)
    print(nse)

    # Volatility 
    beta = nse['beta_nifty'] if nse['beta_nifty'] is not None else 0


    df.ta.atr(length=14,append=True)
    if 'ATRr_14' in df.columns:
        atr = round(df['ATRr_14'].iloc[-1] , 2)
    else:
        atr = "No value Extracted"
    
    df['returns'] = df['Close'].pct_change()
    intraday_vol_pct = round(df['returns'].std()*100, 2)

    # Support Resistance
    if len(df) > 20:

        prev_20_high = df['High'].iloc[-21:-1].max()
        prev_20_low = df['Low'].iloc[-21:-1].min()

        nearest_resistacne = round(prev_20_high, 2)
        nearest_support = round(prev_20_low, 2)

        resistance_distance = (nearest_resistacne - current_price)/current_price
        support_distance = (current_price - nearest_support)/ current_price

        buffer = atr if atr > 0 else (current_price*0.01)

        if current_price > nearest_resistacne:
            price_location = "Breakout (Above Resistance)"
            nearest_support = nearest_resistacne
        elif current_price < nearest_support:
            price_location = "Breakdown (Below Support)"
        elif (nearest_resistacne - current_price) < buffer:
            price_location = "Testing Resistance"
        elif (current_price - nearest_support) < buffer:
            price_location = "Testing Support"
        else:
            price_location = "Mid Range"


    
    else:
        nearest_support = "Unknown"
        nearest_resistacne = "Unknown"
        price_location = "Unknown"

 # fundamental_health 
    # valuation
    trailing_pe = info.get('trailingPE',0)
    forward_pe = info.get('forwardPE',0)
    peg_ratio = info.get("trailingPegRatio",0)
    price_to_book = info.get("priceToBook",0)
    industry_pe_benchmark = "Not Configured" 

    # profatibility
    profit_margins_pct = round(info.get('profitMargins',0)*100, 2)
    operating_margins_pct = round(info.get('operatingMargins')*100 ,2)
    revenue_growth_yoy = round(info.get('revenueGrowth',0),2)

    # Banks/NBFCs and SME listings often have no EBIT or Long Term Debt row,
    # and .loc raises KeyError on a missing label.
    try:
        income_st = ticker.financials
        balance_sheet = ticker.balance_sheet

        ebit = income_st.loc['EBIT'].iloc[0] # earnings before interest and taxes
        equity = balance_sheet.loc['Stockholders Equity'].iloc[0]
        long_term_debt = balance_sheet.loc['Long Term Debt'].iloc[0]
        capital_employed = equity + long_term_debt
        roce = round((ebit / capital_employed)*100 , 2) if capital_employed > 0 else 0
    except Exception:
        roce = 0


    if roce > 15:
        roce_quality = "High (>15%)"
    elif roce > 8:
        roce_quality = "Moderate (8-15%)"
    else:
        roce_quality = "Low (<8%)"

    # solvency 
    debt_to_equity_ratio = info.get("debtToEquity",0)
    if debt_to_equity_ratio < 50:
        health_status = f"Healthy ({debt_to_equity_ratio})"
    else:
        health_status = f"Leveraged ({debt_to_equity_ratio})"



 # institutional_activity
    insider_holding_pct = ticker.info.get('heldPercentInsiders')
    institutional_holding_pct = ticker.info.get('heldPercentInstitutions')
    float_shares = ticker.info.get('floatShares')
    # flow analysis

    # Risk Management
    cal = ticker.calendar
    earnings_date = cal.get('Earnings Date')
    if earnings_date:
        next_earning = pd.Timestamp(earnings_date[0])
        days_to_earnings = (next_earning - pd.Timestamp.today()).days
        if days_to_earnings <= 7:
            earnings_risk = f"High (Earnings in {days_to_earnings}d)"
        elif days_to_earnings <= 21:
            earnings_risk = f"Moderate (Earnings in {days_to_earnings}d)"
        else:
            earnings_risk = f"Low (Earnings in {days_to_earnings}d)"
    else:
        days_to_earnings = None
        earnings_risk = "No Data"
    
    # Defaults: the JSON below reads all three unconditionally.
    misses = beats = avg_surprise = 0
    try:
        ed = ticker.earnings_dates
        recent = ed[ed['Reported EPS'].notna()].head(4)
        misses = (recent['Surprise(%)'] < 0).sum()
        beats  = (recent['Surprise(%)'] > 0).sum()
        avg_surprise = round(recent['Surprise(%)'].mean(), 2)

        if misses >= 3:
            surprise_trend = f"Weak (Missed {misses}/4, Avg: {avg_surprise}%)"
        elif beats >= 3:
            surprise_trend = f"Strong (Beat {beats}/4, Avg: {avg_surprise}%)"
        else:
            surprise_trend = f"Mixed (Avg Surprise: {avg_surprise}%)"
    except:
        surprise_trend = "No Data"

    trailing_pe = info.get('trailingPE', 0)
    forward_pe  = info.get('forwardPE', 0)
    ptb         = info.get('priceToBook', 0)

    if trailing_pe > 60:
        valuation_risk = "High (PE > 60)"
    elif trailing_pe > 35:
        valuation_risk = "Moderate (PE 35–60)"
    elif trailing_pe > 0:
        valuation_risk = "Fair (PE < 35)"
    else:
        valuation_risk = "Negative Earnings"

    if beta > 1.5 or intraday_vol_pct > 2.5:
        volatility_risk = "High"
    elif beta > 1.0 or intraday_vol_pct > 1.5:
        volatility_risk = "Moderate"
    else:
        volatility_risk = "Low"

    overall_risk       = info.get('overallRisk', 0)        # 1–10
    audit_risk         = info.get('auditRisk', 0)
    board_risk         = info.get('boardRisk', 0)
    compensation_risk  = info.get('compensationRisk', 0)

    if overall_risk >= 8:
        governance_risk = f"High (Score: {overall_risk}/10)"
    elif overall_risk >= 5:
        governance_risk = f"Moderate (Score: {overall_risk}/10)"
    else:
        governance_risk = f"Low (Score: {overall_risk}/10)"

    news_count = len(ticker.news)
    if news_count >= 8:
        event_risk = f"Elevated ({news_count} recent news items)"
    elif news_count >= 3:
        event_risk = f"Moderate ({news_count} recent news items)"
    else:
        event_risk = f"Low ({news_count} recent news items)"




    # Sentiments 
    analyst_recommendation = info.get("recommendationKey", "N/A").capitalize()
    target_price_mean = info.get("targetMeanPrice", 0)
    if target_price_mean and current_price:
        upside_potential_pct = round(
            ((target_price_mean - current_price) / current_price) * 100, 2
        )
    else:
        upside_potential_pct = 0



    



    market_blocks = relative_strength(market_ctx, df)

    json_str = {

    "meta_data": {
        "symbol": symbol,
        "company_name": name,
        "Trading_Date" : str(market_date),
        "industry": industry,
        "sector": sector,
        "market_cap_inr": market_cap_inr,
        "market_cap_category":market_cap,
        "current_price": current_price,
        "currency": currency,
        # "target_risk_reward": 2.0  
    },
    
    
    "market_context": {
        "sector_rs": nse['sector_rs'],
        # You can add "CRUDE_OIL" or "GOLD" here in the future
        **market_blocks
    },

    
    "technical_signals": {
        "trend_summary": {
            "short_term_20D": short_term,  # 20 day average  (EMA)
            "medium_term_50D": medium_term, # 50 day average  (EMA)
            "long_term_200D": long_term ,   # 200 day average (EMA)
            "closing_bias_vs_ema20 ": closing_bias,
            # Raw values behind the labels above — the rule-based scorer and the
            # raw drawer need the numbers, not just Bullish/Bearish.
            "close": round(float(close), 2),
            "ema_20": round(float(ema20), 2),
            "ema_50": round(float(ema50), 2),
            "ema_200": round(float(ema200), 2)
        },
        # "pattern_recognition": { 
        #     "candlestick_signal": "",
        #     "chart_pattern": "",
        #     "gap_signal": ""
        # },
        "momentum": {
            "rsi_14": rsi_14,
            "distance_from_52w_high_pct": distance_from_52w_high_pct,
            "distance_from_52w_low_pct": distance_from_52w_low_pct,
            "high_52w": round(float(high_52w), 2),
            "low_52w": round(float(low_52w), 2)
        },
        "volume_dynamics": { 
            "volume_status": volume_status,
            "delivery_conviction": nse['delivery_conviction'],
            "liquidity_status": liquidity_status
        },
        "volatility": {
            "atr_value":atr ,
            "intraday_volatility_pct":intraday_vol_pct,
            "beta_vs_nifty": nse['beta_nifty']
        },
        "options_data": {
            "pcr_oi":   nse['pcr_oi'],
            "max_pain": nse['max_pain'],
        },

        "support_resistance": {
            "nearest_support": nearest_support,
            "nearest_resistance": nearest_resistacne,
            "price_location": price_location,
            "asm_status":     nse['asm_status'],
            "fno_ban_status": nse['fno_ban_status'],

        }
    },

    "fundamental_health": {
        "valuation": {
            "trailing_pe": trailing_pe,
            "forward_pe": forward_pe,
            "peg_ratio": peg_ratio,  
            "price_to_book": price_to_book,
            "industry_pe_benchmark": industry_pe_benchmark
        },
        "profitability": {
            "profit_margins_pct": profit_margins_pct,
            "operating_margins_pct": operating_margins_pct,
            "roce_quality": roce_quality,
            "roce_pct": roce,
            "revenue_growth_yoy_pct": round(revenue_growth_yoy*100,2)
        },
        "solvency": {
            "debt_to_equity_ratio": round(debt_to_equity_ratio/100, 2), 
            "health_status": health_status 
        }
    },

    "institutional_activity": {
        "ownership": {
            "insider_holding_pct": round(insider_holding_pct*100,2),
            "institution_holding_pct": round(institutional_holding_pct*100,2),
            "float_shares": float_shares
        },
        "flow_analysis": { 
            "institutional_divergence": nse['institutional_divergence'], 
            "fii_trend": nse['fii_trend'],
            "dii_trend": nse['dii_trend']
        },
        "sentiment": {
            "analyst_recommendation": analyst_recommendation,
            "target_price_mean": target_price_mean,
            "upside_potential_pct": upside_potential_pct
        }
    },

    "risk_management": { 
        "earnings_risk_days": earnings_risk, 
        "days_to_earning":days_to_earnings,
        "surprise_trend": surprise_trend,
        "misses":float(misses),
        "beats":float(beats),
        "avg_surprise_pct":float(avg_surprise),
        "volatility_risk":volatility_risk,
        # "event_risk": event_risk, Will get this from sentiments itself
        # "governance_risk": governance_risk, Removed as yfinace stats for non us stocks are tricky
        "valuation_risk": valuation_risk
    }
    }
    

    return json_str, str(market_date)


def main_script(company_name, as_of=None, market_ctx=None):


    print("Getting Data")
    financial_data , trading_date = json_data(company_name, as_of or today, market_ctx)

    print("Fetched Data, storing it in Mongo DB")
    database_= db_cleint['market_analyser']
    collection_= database_['Financial_Data']

    collection_.update_one({"_id":company_name},{"$set":{trading_date:financial_data}},upsert=True)

    return trading_date


if __name__ == "__main__":
    main_script("VIVIDHA")