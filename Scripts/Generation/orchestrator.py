from Scripts.Generation.processed import main_script




stock_name = input("Enter Stock/Stocks Name (spacce seprated) : ").upper().split(" ")


for i in stock_name:
    main_script(i)

"""
import yfinance as yf
from datetime import date

# get trading date once at top of script
df = yf.Ticker("RELIANCE.NS").history(period="5d")
trading_date = str(df.index[-1].date())   # "2026-06-19"



# pass it everywhere downstream
main_script("RELIANCE")                    # financial data uses it internally
google_news("Reliance", trading_date=trading_date)


this is how to run due to the trading data dependencies in google feed in sentiments script as well

"""