# Historical data test code 
# Depcricated code

import yfinance as yf
import pandas as pd
import pathlib
import json

def json_data(name,date='2023-02-20'):  
    ticker = yf.Ticker(f"{name}.NS")
    info = ticker.info
    # Meta data
    sector = ticker.info['sector']
    industry = ticker.info['industry']
    market_cap = ticker.info['marketCap']

    if market_cap >= 1000000000000:
        market_cap_category = "Large"
    elif market_cap >= 200000000000:
        market_cap_category = "Medium"
    elif market_cap >= 20000000000:
        market_cap_category = "Small"
    else:
        market_cap_category = "Micro"


    # Price Action
     















    print(info)
    """
    json_str = {
      "meta_data": {
        "symbol": name,             
        "sector": f"{sector} + {industry}",                 
        "date": date,   
        "market_cap_numbers" : market_cap           
        "market_cap_category": market_cap_category
      },
      "price_action": {
        "current_price": float(current_price),            
        "trend_short_term": trend_short_term,     
        "trend_medium_term": trend_medium_term,    
        "trend_long_term": trend_long_term,      
        "closing_bias": closing_bias,        
        "distance_from_52w_high_pct": float(distance_from_52w_high_pct),
        "distance_from_52w_low_pct": float(distance_from_52w_low_pct),  
        "intraday_volatility_pct":float(intraday_volatility_pct)     
      },
      "computed_metrics": {
        "rsi_14": float(rsi_14),                   
        "relative_strength_score": '',  
        "volume_status": volume_status,
          "delivery_conviction": "",   
          "gap_signal": gap_signal,
          "beta_risk": beta_risk          
        },
        "atr_zones": {
          "atr_value": float(atr_value),                   
          "buy_range_low": "",          
          "buy_range_high": "",        
          "stop_loss_suggested": "",      
          "target_conservative": "",      
          "target_aggressive": ""
        },
        
        
        "trade_management": {
          "expected_holding_days": "", 
          "expected_return_pct": "",  
          "valuation_risk": ""           
      },
        "chart_structure": {
          "candlestick_signal": "", 
                                            
          "volatility_contraction": "",   
          "support_20d": float(support_20d),              
          "resistance_20d": float(resistance_20d),
          "price_location": ""
        },
        "stability_context": {
          "roce_quality": "",            
          "profit_trend_yoy": float(profit_trend_yoy),
          "sales_growth_yoy": f"{float(sales_growth_yoy)}",          
          "operating_margin_trend": operating_margin_trend,
          "debt_health": "Safe",             
          "institutional_holding_trend": "", 
          "institutional_divergence": "fii_change_qoq_pct - dii_change_qoq_pct", 
          "institutional_total_holding": institutional_total_holding,    
          "fii_trend": "Decreasing",         
          "dii_trend": "Increasing",         
          "public_holding_risk": "",       
          "earnings_risk_days": "",          
          "event_risk": "None"               
        },
        "index_context": {
        "nifty_trend_short_term": nifty_trend_short_term,
        "nifty_trend_medium_term": nifty_trend_medium_term
        }
        }
    
    with open('script.json','w') as file:
       json.dump(json_str,file,indent=2)
#   print(json_str)
    
    
    """



def reference_code():
    name = 'Stock Name'
    date = 'trading date'
    ticker = yf.Ticker(f"{name}.NS")
    info = ticker.info

    cutoff = (pd.to_datetime(date) + pd.Timedelta(days=1)).strftime("%Y-%m-%d")
    hist = ticker.history(end=cutoff)

    if date not in hist.index.strftime("%Y-%m-%d"):
        raise ValueError("No trading data for this date")
    last_day = hist.loc[date]
    
    # meta data 
    sector = info.get('sector')
    market_cap = info.get('marketCap')
    if market_cap > 10e9:
        market_cap_category = 'Large'
    elif market_cap > 2e9:
        market_cap_category = 'Mid'
    else:
        market_cap_category = 'small'
    
  # Price action
    current_price = last_day['Close']
    fiftyTwoWeekHigh = hist['Close'].rolling(252).max().iloc[-1]  # ~1 year of trading days
    fiftyTwoWeekLow = hist['Close'].rolling(252).min().iloc[-1]
  
  
    distance_from_52w_high_pct = (fiftyTwoWeekHigh - current_price) / fiftyTwoWeekHigh * 100
    distance_from_52w_low_pct = (current_price - fiftyTwoWeekLow) / fiftyTwoWeekLow * 100
    intraday_volatility_pct = (last_day['High'] - last_day['Low']) / last_day['Open'] * 100

    # Computed Metrics
    beta_risk = info.get('beta', None)
    volume_status = 'High' if last_day['Volume'] > hist['Volume'].rolling(20).mean().iloc[-1] else 'Low'
    gap_signal = 'Gap Up' if last_day['Open'] > hist['Close'].iloc[-2] else 'Gap Down' if last_day['Open'] < hist['Close'].iloc[-2] else 'No Gap'
  
  
    # RSI 14
    delta = hist['Close'].diff()
    gain = delta.clip(lower=0)
    loss = -1*delta.clip(upper=0)
    avg_gain = gain.rolling(14).mean().iloc[-1]
    avg_loss = loss.rolling(14).mean().iloc[-1]
    rsi_14 = 100 - (100 / (1 + avg_gain / avg_loss))
  
    # ATR
    high_low = hist['High'] - hist['Low']
    high_close = (hist['High'] - hist['Close'].shift()).abs()
    low_close = (hist['Low'] - hist['Close'].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    atr_value = tr.rolling(14).mean().iloc[-1]
  
  
    # Support / Resistance 20d
    support_20d = hist['Low'].rolling(20).min().iloc[-1]
    resistance_20d = hist['High'].rolling(20).max().iloc[-1]
  
    # Sales growth / Operating margin (from financials)
    financials = ticker.financials
    sales_growth_yoy = (financials.loc['Total Revenue'].pct_change().iloc[-1] * 100)
    operating_margin_trend = 'Stable'  # You could compute based on 'Operating Income' / 'Total Revenue'
  
    # Institutional holding (if available)
    institutional_total_holding = info.get('heldPercentInstitutions', None)
  
  
  
    # Nifty 
    nifty = yf.Ticker("^NSEI")
    nifty_df = nifty.history(end=date, period="max")  # all data up to 'date'
    nifty_df["20dma"] = nifty_df["Close"].rolling(20).mean()
    nifty_df["50dma"] = nifty_df["Close"].rolling(50).mean()
  
    nifty_trend_short_term = "Bullish" if nifty_df["Close"].iloc[-1] > nifty_df["20dma"].iloc[-1] else "Bearish"
    nifty_trend_medium_term = "Bullish" if nifty_df["Close"].iloc[-1] > nifty_df["50dma"].iloc[-1] else "Bearish"
  
  
    # Trends
    hist["20dma"] = hist["Close"].rolling(20).mean()
    hist["200dma"] = hist["Close"].rolling(200).mean()
    hist["50dma"] = hist["Close"].rolling(50).mean()
  
  
    trend_short_term = "Bullish" if current_price > hist["20dma"].iloc[-1] else "Bearish"
    trend_medium_term = "Bullish" if current_price > hist["50dma"].iloc[-1] else "Bearish"
    trend_long_term = "Bullish" if current_price > hist["200dma"].iloc[-1] else "Bearish"
  
    closing_bias = "Strong" if current_price > hist["20dma"].iloc[-1] else "Weak"
  
    # Profit YoY
    if "Net Income" in financials.index:
        ni = financials.loc["Net Income"]
        profit_trend_yoy = ((ni.iloc[0] - ni.iloc[1]) / ni.iloc[1]) * 100
    else:
        profit_trend_yoy = None



json_data('RELIANCE')