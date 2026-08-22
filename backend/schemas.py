#contain all fastapi pydantic schemas

import datetime
from pydantic import BaseModel, ConfigDict, Field

# basic metadata of stock when you click on it
class CardBasicData(BaseModel):
    date:datetime.date
    company_name:str
    nse_symbol:str
    sector:str
    market_cap:str
    current_price:float
    about:str
    ISIN:str

# history of analysis
class CardHistoryAnalysis(BaseModel):
    analysis_date: datetime.date
    python_score: float | None = None
    python_action: str | None = None
    llm_score: float | None = None
    llm_action: str | None = None
    combined_score: float | None = None
    combined_action: str | None = None
    actual_close_pct: float | None = None
    matched: str = "pending"

class StockCard(BaseModel):
    metadata:CardBasicData
    history:list[CardHistoryAnalysis]

class ViewFullAnalysis():
    # used for getting data when we click on view full analysis
    pass



# add to watchlist base model
class Add_Watchlist(BaseModel):
    date:str
    entry_price : float
    Quantity:int