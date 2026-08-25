import asyncio
import time
import curl_cffi
from trafilatura import extract
import feedparser   
from googlenewsdecoder import gnewsdecoder

import html
import os
import pymongo
from dotenv import load_dotenv
from urllib.parse import urlparse
from datetime import datetime, date
import random


load_dotenv()

database_url = os.getenv("DATABASE")
db_cleint = pymongo.MongoClient(database_url)
database_= db_cleint['market_analyser']
collections = database_['Sentiments']

PROXY = os.getenv("PROXY",None)
# Push sentiments data to mongodb
def push_sentiments_db(stock_name, article_url, title, source, content_md,
                       published_date=None, is_top_news=True, trading_date=None):

    article = {
        "title": title,
        "source": source,
        "url": article_url,
        "published_date": published_date,
        "scraped_date": trading_date or str(date.today()),
        "is_top_news": is_top_news,
        "content_md": content_md,
    }

    collections.update_one(
        {"_id": f"{stock_name}.NS"},
        {
            "$set": {"company_name": stock_name, "last_updated": str(date.today())},
            "$push": {"articles": article},
        },
        upsert=True,
    )
    

# GOOGLE NEWS RSS 

def google_news(stock_name,trading_date=None):

    time.sleep(random.uniform(0.5,2))
    rss_url = f"https://news.google.com/rss/search?q={stock_name}&hl=en-IN&gl=IN&ceid=IN:en"
    feed = feedparser.parse(rss_url)
    urls = [entry.link for entry in feed.entries[:20]]
    # print(urls)

    for i, gnews_url in enumerate(urls):
        
        time.sleep(random.uniform(0.5,2))
        entry = feed.entries[i]    # ← was `entry = feed`, that was the bug
        title = entry.title
        source = entry.source.title if hasattr(entry, "source") else "Unknown"
        published_date = entry.published
        is_top_news = i < 8
        markdown = entry.summary

        interval_time = 1
        try:
            decoded = gnewsdecoder(gnews_url, interval=interval_time,proxy=PROXY)

            if not decoded.get("status"):
                print(f"DECODE FAILED: {decoded.get('message', 'unknown')}")
                continue
            url = decoded["decoded_url"]
            response = curl_cffi.get(url,impersonate="chrome110",proxy=PROXY)
            html = (response.content)
            extracted = extract(html, with_metadata=True, favor_precision=True)
            paywall_signals = [
                "click the box below",
                "you are not a robot",
                "subscribe now",
                "to continue reading",
                "sign in to continue",
            ]
            if (
                extracted
                and len(extracted) >= 300
                and not any(sig in extracted.lower() for sig in paywall_signals)
            ):
                markdown = extracted

            
        except Exception as e:
            print(f"ERROR -> {e}")

        push_sentiments_db(
            stock_name=stock_name,
            article_url=gnews_url,
            title=title,
            source=source,
            content_md=markdown,
            published_date=published_date,
            is_top_news=is_top_news,
            trading_date=trading_date,
        )

    
    return

if __name__ == "__main__":
    google_news("Reliance")





