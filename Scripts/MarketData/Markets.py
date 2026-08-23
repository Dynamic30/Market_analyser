import json
import yfinance as yf

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

engine = create_engine(
    os.getenv("SQL_DB", "postgresql+psycopg://market:market@localhost:5432/market_analyser")
)

UPSERT_SQL = text("""
    INSERT INTO market_stats (ticker, name, country, category,
                               price, net_change, p_change, direction, as_of)
    VALUES (:ticker, :name, :country, :category,
            :price, :net_change, :p_change, :direction, :as_of)
    ON CONFLICT (ticker, as_of) DO UPDATE SET
        price      = EXCLUDED.price,
        net_change = EXCLUDED.net_change,
        p_change   = EXCLUDED.p_change,
        direction  = EXCLUDED.direction
""")

def save_market_data(rows):
    with engine.begin() as conn:
        conn.execute(UPSERT_SQL, rows)


def MarketData():
    # Streamlined configuration for the top bar
    extended_tickers = {
        # --- 1. Domestic Indian Indices ---
        "^NSEI": {"name": "NIFTY 50", "country": "India", "category": "Indices"},
        "^NSEBANK": {"name": "BANK NIFTY", "country": "India", "category": "Indices"},
        "^BSESN": {"name": "SENSEX", "country": "India", "category": "Indices"},
        "^INDIAVIX": {"name": "INDIA VIX", "country": "India", "category": "Volatility"},
        
        # --- 2. Major Global Market Movers ---
        "^GSPC": {"name": "S&P 500", "country": "United States", "category": "Indices"},
        "^IXIC": {"name": "Nasdaq 100", "country": "United States", "category": "Indices"},
        "^FTSE": {"name": "FTSE 100", "country": "United Kingdom", "category": "Indices"},
        "^N225": {"name": "NIKKEI 225", "country": "Japan", "category": "Indices"},
        "^GSPTSE": {"name": "S&P/TSX Composite", "country": "Canada", "category": "Indices"},
        "^HSI": {"name": "Hang Seng Index", "country": "Hong Kong", "category": "Indices"},
        "^VIX": {"name": "CBOE Volatility Index", "country": "United States", "category": "Volatility"},

        # --- 3. Single Macro Commodity Anchor ---
        "BZ=F": {"name": "Brent Crude Oil", "country": "Global", "category": "Macro Anchor"},

        # --- 4. Currency Exchange Rates ---
        "INR=X": {"name": "USD / INR", "country": "Global", "category": "Currencies"},
        "EURINR=X": {"name": "EUR / INR", "country": "Global", "category": "Currencies"},
        "GBPINR=X": {"name": "GBP / INR", "country": "Global", "category": "Currencies"},
        "EURUSD=X": {"name": "EUR / USD", "country": "Global", "category": "Currencies"},
        "JPY=X": {"name": "USD / JPY", "country": "Global", "category": "Currencies"}
    }

    tickers_list = list(extended_tickers.keys())

    # Download data over a 5-day window to safely manage weekend/holiday gaps
    all_data = yf.download(tickers_list, period="5d", group_by="ticker", progress=False)

    json_array = []
    for ticker in tickers_list:
        try:
            valid_rows = all_data[ticker].dropna(subset=['Close'])
            if not valid_rows.empty:
                latest_row = valid_rows.iloc[-1]
                latest_price = float(latest_row['Close'])
                as_of_date = str(valid_rows.index[-1].strftime('%Y-%m-%d'))
                
                # Fetch previous close for change metrics
                if len(valid_rows) >= 2:
                    prev_close = float(valid_rows.iloc[-2]['Close'])
                else:
                    prev_close = float(yf.Ticker(ticker).info.get('previousClose', latest_price))
                
                net_change = latest_price - prev_close
                p_change = (net_change / prev_close) * 100 if prev_close else 0.0
                
                # Use 4 decimals for currencies, 2 decimals for indices/oil
                is_currency = "Currencies" in extended_tickers[ticker]["category"]
                precision = 4 if is_currency else 2
                
                json_array.append({
                    "name": extended_tickers[ticker]["name"],
                    "ticker": ticker,
                    "country": extended_tickers[ticker]["country"],
                    "category": extended_tickers[ticker]["category"],
                    "price": round(latest_price, precision),
                    "net_change": round(net_change, precision),
                    "p_change": round(p_change, 2),
                    "direction": "up" if p_change >= 0 else "down",
                    "as_of": as_of_date
                })
        except Exception:
            continue 

    # Clean, structured JSON output
    return json_array

if __name__ == "__main__":
    rows = MarketData()
    save_market_data(rows)
