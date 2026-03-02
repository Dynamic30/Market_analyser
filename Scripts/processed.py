import yfinance as yf
import pandas as pd
import numpy as np
import pandas_ta as ta # type: ignore
import pathlib
import json
from datetime import date


today = date.today()



def market():
    
    # will contain market_context, 
    return 



def json_data(comapny_name,today):
    name = comapny_name.upper()
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
        avg_vol_20 = df_vol['Volume'].mean()
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

 # Pattern Recogonition (AI)

 # risk_management

 # fundamental_health 
    
 # institutional_activity








    json_str = {
    "meta_data": {
        "symbol": symbol,
        "company_name": name,
        "Date" : today,
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
        "pattern_recognition": { 
            "candlestick_signal": "candlestick_signal",
            "chart_pattern": "chart_pattern",
            "gap_signal": "gap_signal"
        },
        "momentum": {
            "rsi_14": rsi_14, 
            "distance_from_52w_high_pct": distance_from_52w_high_pct,
            "distance_from_52w_low_pct": distance_from_52w_low_pct
        },
        "volume_dynamics": { 
            "volume_status": volume_status,
            "delivery_conviction": delivery_conviction,
            "liquidity_status": liquidity_status
        },
        "volatility": {
            "atr_value":'' ,
            "intraday_volatility_pct":'' ,
            "beta": ''
        },
        "support_resistance": {
            "nearest_support": '',
            "nearest_resistance": '',
            "price_location": ""
        }
    },

    "fundamental_health": {
        "valuation": {
            "trailing_pe": '',
            "forward_pe": '',
            "peg_ratio": '',  
            "price_to_book": '',
            "industry_pe_benchmark": '' 
        },
        "profitability": {
            "profit_margins_pct": '',
            "operating_margins_pct": '',
            "roce_quality": "", 
            "revenue_growth_yoy": '' 
        },
        "solvency": {
            "debt_to_equity_ratio": '', 
            "health_status": "" 
        }
    },

    "institutional_activity": {
        "ownership": {
            "insider_holding_pct": '',
            "institution_holding_pct": '',
            "float_shares": ''
        },
        "flow_analysis": { 
            "institutional_divergence": "", 
            "fii_trend": "",
            "dii_trend": ""
        },
        "sentiment": {
            "analyst_recommendation": "",
            "target_price_mean": '',
            "upside_potential_pct": ''
        }
    },

    "risk_management": { 
        "earnings_risk_days": '', 
        "event_risk": "",
        "valuation_risk": ""
    }
    }

    with open("script.json",'w',encoding="UTF-8") as f:
        json.dump(json_str, f,default=str,indent=2)




json_data("RELIANCE",today)
