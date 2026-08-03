from Generation.processed import main_script
import argparse
import time
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(
    os.getenv("SQL_DB", "postgresql+psycopg://market:market@localhost:5432/market_analyser")
)

"""
Strucutre -> fetc brand names from stock, run processed.py and Sentiments.py, all data saving is udenr them only, so both run independently 
"""


with engine.connect() as conn:
    symbols : list = conn.execute(text("""
        SELECT nse_symbol FROM stocks
        WHERE is_active = 'active'
        ORDER BY market_cap DESC NULLS LAST
    """)).scalars().all()




# if __name__ == "__main__":
#     parser = argparse.ArgumentParser(
#         description="seprating different functions of this script"
#     )
