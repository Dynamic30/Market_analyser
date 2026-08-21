# Deprecated code
# MIGHT NOT NEED THIS AS WE CAN COMPUTE PROCESSED DATA DIRECTLY USING YFINANCE (SEE PROCESSING SCRIPTS)

import yfinance as yf
import pandas as pd
import os
from bs4 import BeautifulSoup
import requests


def daily_csv(name,end_date,period='200d'):

    stock = yf.Ticker(f'{name}.NS')
    end_date = pd.to_datetime(end_date) + pd.Timedelta(days=1)
    data = stock.history(end = end_date,period=period)
    if data.empty:
        print("No data found")
    data.reset_index(inplace=True)
    data['Symbol'] = name
    data["52W High"] = data["High"].rolling(window=252, min_periods=1).max()
    data["52W Low"] = data["Low"].rolling(window=252, min_periods=1).max()
    data["Volume Average(20Days)"] = (
        data["Volume"].rolling(window=20, min_periods=1).mean()
    )
    data['VWAP'] = (data['High'] + data['Low'] + data['Close'])/3

    data['Delivery Percentage'] = None
    final_data = data[
        [
            "Date",
            "Symbol",
            "Open",
            "Close",
            "High",
            "Low",
            "52W High",
            "52W Low",
            "Volume",
            "Volume Average(20Days)",
            "VWAP",
            "Delivery Percentage",
        ]
    ]

    print(final_data)
    folder_path = f"Data/CSVs/{name}"
    os.makedirs(folder_path, exist_ok=True)
    file_path = f"{folder_path}/daily.csv"
    final_data.to_csv(file_path, index=False)


def quarter_csv(name):
    
    # for sector -> yfinance 
    # for 

    url = f'https://www.screener.in/company/{name}/'
    response = requests.get(url)
    html = response.text

    soup = BeautifulSoup(html,'html.parser')




quarter_csv("ETERNAL")