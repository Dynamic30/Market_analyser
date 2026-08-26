from datetime import datetime, date, timedelta
from nsepython import nse_holidays
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

_engine = create_engine(os.getenv("SQL_DB"))


def get_nse_trading_holidays(year=None):
    year = year or date.today().year
    try:
        holidays = nse_holidays(type="trading", year=year)
        if isinstance(holidays, dict):
            holidays = holidays.get("CM", []) or holidays.get("trading", [])
        return {
            datetime.strptime(d, "%d-%b-%Y").date()
            for d in holidays
            if isinstance(d, str)
        }
    except Exception:
        return set()

def next_trading_day(from_date=None):
    from_date = from_date or date.today()
    if isinstance(from_date, str):
        from_date = date.fromisoformat(from_date)

    holidays = get_nse_trading_holidays(from_date.year)

    next_d = from_date + timedelta(days=1)
    while next_d.weekday() >= 5 or next_d in holidays:
        next_d += timedelta(days=1)
        # refresh holidays if we cross a year boundary
        if next_d.year != from_date.year:
            holidays = get_nse_trading_holidays(next_d.year)
    return next_d

def main_trading_date(analysis_date=None):
    """
    For all stocks with a row on the given analysis_date,
    set analysis_for = next trading day after analysis_date.
    """
    analysis_date = analysis_date or date.today()
    if isinstance(analysis_date, str):
        analysis_date = date.fromisoformat(analysis_date)

    analysis_for = next_trading_day(analysis_date)

    update_sql = """
        UPDATE stock_analysis
        SET analysis_for = :analysis_for
        WHERE analysis_date = :analysis_date
    """

    with _engine.begin() as conn:
        result = conn.execute(text(update_sql), {
            "analysis_for": str(analysis_for),
            "analysis_date": str(analysis_date)
        })

    return analysis_for, result.rowcount


if __name__ == "__main__":
    analysis_for, updated = main_trading_date()
    print(f"Analysis for: {analysis_for}")
    print(f"Updated {updated} rows")
