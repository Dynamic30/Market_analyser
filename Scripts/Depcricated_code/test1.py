import yfinance as yf
import pandas as pd
import numpy as np
import pandas_ta as ta # type: ignore
import pathlib
import json
from datetime import date
ticker = yf.Ticker(f"{"RELIANCE"}.NS")
print(ticker)
info = ticker.info

df = ticker.history(period="1mo")

print(df)