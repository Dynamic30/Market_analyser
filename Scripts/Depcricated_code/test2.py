import yfinance as yf
import json


ticker = yf.Ticker(f"{"RELIANCE"}.NS")

cal = ticker.calendar

print(cal)
# print(ticker.earnings_dates)
# print(json.dumps(ticker.info, indent=2, default=str))
# df = ticker.history(period="1y")
# market_date = df.index[-1].date()
# print(market_date)