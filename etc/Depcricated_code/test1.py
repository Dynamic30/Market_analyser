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

# print(df)

df.ta.atr(length=14,append=True)

# print(df['ATRr_14'])


# df['returns'] = df['Close'].pct_change()
# intraday_vol_pct = df['returns'].std()*100
# print(intraday_vol_pct)
# insider_holding_pct = ticker.info['heldPercentInsiders']
# print(insider_holding_pct)


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

print(roce,roce_quality)