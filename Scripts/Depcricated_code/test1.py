import yfinance as yf
import pandas as pd
import numpy as np
import pandas_ta as ta 
import pathlib
import json
from datetime import date

ticker = yf.Ticker(f"{"RELIANCE"}.NS")
print(ticker)
info = ticker.info

df = ticker.history(period="1mo")

print(df)

df.ta.atr(length=14,append=True)

print(df['ATRr_14'])