#contain all fastapi pydantic schemas

import datetime
from pydantic import BaseModel, ConfigDict, Field

# basic metadata of stock when you click on it, (can also be used in the top stock section)
class CardBasicData(BaseModel):
    date: datetime.date | None = None      # no analysis row yet
    company_name: str
    nse_symbol: str
    sector: str
    market_cap: str
    current_price: float | None = None     # ditto
    about: str | None = None
    ISIN: str | None = None


# history of analysis
class CardHistoryAnalysis(BaseModel):
    analysis_date: datetime.date
    python_score: float | None = None
    python_action: str | None = None
    python_reasoning : str | None=None
    llm_reasoning : str | None = None
    overall_bias_score: float | None = None
    short_term_action: str | None = None
    long_term_action: str | None = None
    combined_score: float | None = None
    combined_action: str | None = None
    actual_close_pct: float | None = None
    matched: str = "pending"

# per card data (check all stock -> card)
class StockCard(BaseModel):
    metadata:CardBasicData
    history:list[CardHistoryAnalysis]

class ViewFullAnalysis():
    # used for getting data when we click on view full analysis
    pass

class SectorAnalysisCheck(BaseModel):
    sector: str
    total_stocks: int
    predictions_made: int
    correct_predictions: int
    accuracy_pct: float
    last_evaluated_date: datetime.date | None = None


# add to watchlist base model
class Add_Watchlist(BaseModel):
    date:str
    entry_price : float
    Quantity:int