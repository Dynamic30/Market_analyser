import yfinance as yf
import json


ticker = yf.Ticker(f"{"RELIANCE"}.NS")

cal = ticker.calendar

print(cal)
print(ticker.earnings_dates)
print(json.dumps(ticker.info, indent=2, default=str))
info = ticker.info
keys = ['auditRisk', 'boardRisk', 'overallRisk', 'compensationRisk', 
        'trailingPE', 'forwardPE', 'priceToBook', 'pegRatio']

for k in keys:
    print(k, ":", info.get(k, "NOT FOUND"))

print(len(ticker.news))

