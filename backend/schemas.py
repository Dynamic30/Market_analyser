#contain all fastapi pydantic schemas

from pydantic import BaseModel, ConfigDict, Field

# basic metadata of stock
class StockData(BaseModel):
    date:str
    company_name:str
    nse_symbol:str
    sector:str

    


# add to watchlist base model
class Add_Watchlist(BaseModel):
    date:str
    entry_price : float
    Quantity:int