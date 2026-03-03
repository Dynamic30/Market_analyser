import yfinance as yf
import pandas as pd
import numpy as np
import pandas_ta as ta 
import pathlib
import json
from datetime import date


# TEST SCRIPT BEFORE ADDING CODE TO processed.py


ticker = yf.Ticker(f"{"RELIANCE"}.NS")
print(ticker)
info = ticker.info

df = ticker.history(period="1mo")

print(df)

df.ta.atr(length=14,append=True)

print(df['ATRr_14'])


df['returns'] = df['Close'].pct_change()
intraday_vol_pct = df['returns'].std()*100
print(intraday_vol_pct)