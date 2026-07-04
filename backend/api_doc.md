# API / BACKEND STRUCTURES
prefix -> v1/page_type 


## User


## Home page 
### PREFIX -> /v1/home
GET / -> Renders basic data -> Today' date, last analysis date, market index data, etc. + market_data 
GET /market_data -> fetch market index data (nifty fifty sensex etc.)
GET /page/llm -> fetch top picks from LLM and then give a array of all the picks + will fetch cards data of top 10 stocks (llm)
GET /page/raw -> fetch top picks from raw analysis using python and then give a array of all the picks will fetch cards data of top 10 stocks (raw)



Reasoning 


## All Stocks
### Prefix -> all_stocks

GET /sector -> get all sectors from main stock table (SQL one)
GET /stocks -> Fetch all stocks with name, current price, Sector, # NOTE -> this runs the moment we click on all stocks, so this should be with /all_stocks/

GET /card/{stock}
GET /card/{stock}/full_analysis



## Top Pics
GET REQUESTS

## Watchlist

will contain GET POST and DELETE requests