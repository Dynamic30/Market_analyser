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
from nsepython import (
    nse_fiidii, nse_blockdeal, nse_optionchain_scrapper, pcr,
    nse_eq, nse_fno, equity_history, nse_quote_meta
)


try:
    _FNO = set(pd.read_csv(
        "https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv",
        skiprows=1
    ).iloc[:, 1].str.strip())
except Exception:
    _FNO = set()


_SECTOR_MAP = {
    "Banking":    "NIFTYBANK",
    "IT":         "NIFTYIT",
    "Pharma":     "NIFTYPHARMA",
    "Auto":       "NIFTYAUTO",
    "FMCG":       "NIFTYFMCG",
    "Metal":      "NIFTYMETAL",
    "Energy":     "NIFTYENERGY",
    "Realty":     "NIFTYREALTY",
}



load_dotenv()

database_url = os.getenv("DATABASE")

db_cleint = pymongo.MongoClient(database_url)
print(db_cleint.list_database_names())


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
        fii_net = df.loc[df['category'].str.contains('FII', case=False), 'netValue'].sum()
        dii_net = df.loc[df['category'].str.contains('DII', case=False), 'netValue'].sum()
        # Thresholds in INR crores. Tune to your taste.
        fii_trend = "Bullish" if fii_net > 500 else "Bearish" if fii_net < -500 else "Neutral"
        dii_trend = "Bullish" if dii_net > 500 else "Bearish" if dii_net < -500 else "Neutral"
    except Exception:
        pass

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
    except Exception:
        pass




    return



def market():
    
    # will contain market_context, 
    # for api look into FMP , MARKET STACK, Breeze API , 
    return 


def json_data(company_name,today):
    name = company_name.upper()
    symbol = f"{name}.NS"
    ticker = yf.Ticker(f"{name}.NS")
    info = ticker.info
    # Meta data
    sector = ticker.info['sector']
    industry = ticker.info['industry']
    market_cap = ticker.info['marketCap']
    current_price = ticker.info['currentPrice']
    currency = ticker.info['financialCurrency']
    
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

        # Delivery Conviction
        day_open = df_vol['Open'].iloc[-1]
        day_close = df_vol['Close'].iloc[-1]
        day_high = df_vol['High'].iloc[-1]
        day_low = df_vol['Low'].iloc[-1]

        candle_range = day_high - day_low
        body_size = abs(day_close - day_open)

        if candle_range > 0:
            body_pct = (body_size / candle_range)
        else:
            body_pct = 0
        
        if vol_ratio > 1.2 and body_pct > 0.6:
            if day_close > day_open:
                direction = "Bullish"
            else:
                direction = "Bearish"
            delivery_conviction = f"Strong {direction} Accumulation"
        elif vol_ratio > 1.5 and body_pct < 0.3:
            delivery_conviction = "Churn (High Vol / No Move)"
        elif vol_ratio < 0.6:
            delivery_conviction = "Weak (Lack of Intrest)"
        else:
            delivery_conviction = "Neutral"


    else:
        volume_status = "Unknown"
        liquidity_status = "Unknown"
        delivery_conviction = "Unknown"


    # Volatility 
    beta = ticker.info['beta']
    df.ta.atr(length=14,append=True)
    if 'ATRr_14' in df.columns:
        atr = round(df['ATRr_14'].iloc[-1] , 2)
    else:
        atr = "No value Extracted"
    
    df['returns'] = df['Close'].pct_change()
    intraday_vol_pct = df['returns'].std()*100

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
    industry_pe_benchmark = "N Configured" 

    # profatibility
    profit_margins_pct = round(info.get('profitMargins',0)*100, 2)
    operating_margins_pct = round(info.get('operatingMargins')*100 ,2)
    revenue_growth_yoy = round(info.get('revenueGrowth',0),2)

    income_st = ticker.financials
    balance_sheet = ticker.balance_sheet

    ebit = income_st.loc['EBIT'].iloc[0] # earnings before interest and taxes
    Total_Assets = balance_sheet.loc['Total Assets'].iloc[0]
    current_liability = balance_sheet.loc['Total Liabilities Net Minority Interest'].iloc[0]
    capital_employed = Total_Assets - current_liability
    if capital_employed > 0:
        roce = round((ebit / capital_employed)*100 , 2)
    else:
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
    insider_holding_pct = ticker.info['heldPercentInsiders']
    institutional_holding_pct = ticker.info['heldPercentInstitutions']
    float_shares = ticker.info['floatShares']
    # flow analysis
    df['ADL'] = ta.ad(df['High'],df['Low'],df['Close'],df['Volume'])

    prev_price_5 = df['Close'].iloc[-6]

    adl_now = df["ADL"].iloc[-1]
    adl_prev = df["ADL"].iloc[-6]

    sig_move = abs(current_price - prev_price_5) / prev_price_5 > 0.005

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



    if sig_move:
        if current_price > prev_price_5 and adl_now < adl_prev:
            institutional_divergence = "Bearish (Price up, Money flowing OUT)"
        elif current_price < prev_price_5 and adl_now > adl_prev:
            institutional_divergence = "Bullish (Price down, Money flowing IN)"
        else:
            institutional_divergence = "In-Sync (Volume confirms Price)"
    else:
        institutional_divergence = "Neutral (No significant move)"


    # Sentiments 
    analyst_recommendation = info.get("recommendationKey", "N/A").capitalize()
    target_price_mean = info.get("targetMeanPrice", 0)
    if target_price_mean and current_price:
        upside_potential_pct = round(
            ((target_price_mean - current_price) / current_price) * 100, 2
        )
    else:
        upside_potential_pct = 0

    fii_trend = "No Data"
    dii_trend = "No Data"


    json_str = {
    
    "meta_data": {
        "symbol": symbol,
        "company_name": name,
        "Trading_Date" : str(market_date),
        "industry": industry,
        "sector": sector,
        "market_cap_category": market_cap,
        "current_price": current_price,
        "currency": currency,
        # "target_risk_reward": 2.0  
    },
    
    
    "market_context": { 
        "NIFTY_50": {
            "trend": "",
            "change_pct": "",
            "volatility_status": "",
            "market_breadth": "",
            "relative_strength_score" : ""
        },
        "BANK_NIFTY": {
            "trend": "",
            "change_pct": "",
            "volatility_status": "",
            "market_breadth": ""
        },
        "NASDAQ": {  
            "trend": "",
            "change_pct": "",
            "volatility_status": "", 
            "market_breadth": ""
        }
        # You can add "CRUDE_OIL" or "GOLD" here in the future
    },

    
    "technical_signals": {
        "trend_summary": {
            "short_term (20D)": short_term,  # 20 day average  (EMA)
            "medium_term (50D)": medium_term, # 50 day average  (EMA)
            "long_term (200D)": long_term ,   # 200 day average (EMA) 
            "closing_bias (close vs ema20)": closing_bias
        },
        # "pattern_recognition": { 
        #     "candlestick_signal": "",
        #     "chart_pattern": "",
        #     "gap_signal": ""
        # },
        "momentum": {
            "rsi_14": rsi_14, 
            "distance_from_52w_high_pct": f"{distance_from_52w_high_pct}",
            "distance_from_52w_low_pct": f"{distance_from_52w_low_pct}"
        },
        "volume_dynamics": { 
            "volume_status": volume_status,
            "delivery_conviction": delivery_conviction,
            "liquidity_status": liquidity_status
        },
        "volatility": {
            "atr_value":atr ,
            "intraday_volatility_pct":intraday_vol_pct,
            "beta": beta
        },
        "support_resistance": {
            "nearest_support": nearest_support,
            "nearest_resistance": nearest_resistacne,
            "price_location": price_location
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
            "revenue_growth_yoy": revenue_growth_yoy 
        },
        "solvency": {
            "debt_to_equity_ratio": debt_to_equity_ratio, 
            "health_status": health_status 
        }
    },

    "institutional_activity": {
        "ownership": {
            "insider_holding_pct": insider_holding_pct,
            "institution_holding_pct": institutional_holding_pct,
            "float_shares": float_shares
        },
        "flow_analysis": { 
            "institutional_divergence": institutional_divergence, 
            "fii_trend": fii_trend,
            "dii_trend": dii_trend
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
        "volatility risk":volatility_risk,
        "event_risk": event_risk,
        "governance_risk": governance_risk,
        "valuation_risk": valuation_risk
    }
    }
    

    return json_str, str(market_date)

    with open("script.json",'w',encoding="UTF-8") as f:
        json.dump(json_str, f,default=str,indent=2)
    
    print("Updated script.json")

def main_script(company_name):
   
    financial_data , trading_date = json_data(company_name,today)

    database_= db_cleint['market_analyser']
    collection_= database_['Financial_Data']

    collection_.update_one({"_id":company_name},{"$set":{trading_date:financial_data}},upsert=True)


main_script("RELIANCE")