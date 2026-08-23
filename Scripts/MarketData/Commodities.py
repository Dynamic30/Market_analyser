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
    INSERT INTO commodities (ticker, name, category, unit,
                              price, net_change, p_change, direction, as_of)
    VALUES (:ticker, :name, :category, :unit,
            :price, :net_change, :p_change, :direction, :as_of)
    ON CONFLICT (ticker, as_of) DO UPDATE SET
        price      = EXCLUDED.price,
        net_change = EXCLUDED.net_change,
        p_change   = EXCLUDED.p_change,
        direction  = EXCLUDED.direction
""")

def save_commodities(rows):
    with engine.begin() as conn:
        conn.execute(UPSERT_SQL, rows)



def Commodities():
    # Complete 21-commodity mapping directly matching your UI sections
    commodity_registry = {
        # --- Metals ---
        "GC=F": {"name": "Gold", "category": "Metals", "unit": "oz"},
        "SI=F": {"name": "Silver", "category": "Metals", "unit": "oz"},
        "PL=F": {"name": "Platinum", "category": "Metals", "unit": "oz"},
        "PA=F": {"name": "Palladium", "category": "Metals", "unit": "oz"},
        "HG=F": {"name": "Copper", "category": "Metals", "unit": "lb"},
        
        # --- Energy ---
        "CL=F": {"name": "Crude Oil (WTI)", "category": "Energy", "unit": "bbl"},
        "BZ=F": {"name": "Brent Crude", "category": "Energy", "unit": "bbl"},
        "NG=F": {"name": "Natural Gas", "category": "Energy", "unit": "MMBtu"},
        "RB=F": {"name": "RBOB Gasoline", "category": "Energy", "unit": "gal"},
        "HO=F": {"name": "Heating Oil", "category": "Energy", "unit": "gal"},
        
        # --- Agriculture ---
        "ZC=F": {"name": "Corn", "category": "Agriculture", "unit": "¢/bu"},
        "ZS=F": {"name": "Soybeans", "category": "Agriculture", "unit": "¢/bu"},
        "ZW=F": {"name": "Wheat", "category": "Agriculture", "unit": "¢/bu"},
        "KC=F": {"name": "Coffee", "category": "Agriculture", "unit": "¢/lb"},
        "CT=F": {"name": "Cotton", "category": "Agriculture", "unit": "¢/lb"},
        "SB=F": {"name": "Sugar", "category": "Agriculture", "unit": "¢/lb"},
        "CC=F": {"name": "Cocoa", "category": "Agriculture", "unit": "MT"},
        "OJ=F": {"name": "Orange Juice", "category": "Agriculture", "unit": "¢/lb"},
        
        # --- Livestock ---
        "LE=F": {"name": "Live Cattle", "category": "Livestock", "unit": "¢/lb"},
        "HE=F": {"name": "Lean Hogs", "category": "Livestock", "unit": "¢/lb"},
        "GF=F": {"name": "Feeder Cattle", "category": "Livestock", "unit": "¢/lb"}
    }

    tickers_list = list(commodity_registry.keys())

    # Download 5 days of lookback data in 1 request to bypass empty weekend data rows
    all_data = yf.download(tickers_list, period="5d", group_by="ticker", progress=False)

    json_array = []
    for ticker in tickers_list:
        try:
            valid_rows = all_data[ticker].dropna(subset=['Close'])
            if not valid_rows.empty:
                latest_row = valid_rows.iloc[-1]
                latest_price = float(latest_row['Close'])
                as_of_date = str(valid_rows.index[-1].strftime('%Y-%m-%d'))
                
                # Extract previous close
                if len(valid_rows) >= 2:
                    prev_close = float(valid_rows.iloc[-2]['Close'])
                else:
                    prev_close = float(yf.Ticker(ticker).info.get('previousClose', latest_price))
                
                net_change = latest_price - prev_close
                p_change = (net_change / prev_close) * 100 if prev_close else 0.0
                
                json_array.append({
                    "name": commodity_registry[ticker]["name"],
                    "ticker": ticker,
                    "category": commodity_registry[ticker]["category"],
                    "unit": commodity_registry[ticker]["unit"],
                    "price": round(latest_price, 2),
                    "net_change": round(net_change, 2),
                    "p_change": round(p_change, 2),
                    "direction": "up" if p_change >= 0 else "down",
                    "as_of": as_of_date
                })
        except Exception:
            continue

    # Final clear dataset
    return json_array

if __name__ == "__main__":
    rows = Commodities()
    save_commodities(rows)
