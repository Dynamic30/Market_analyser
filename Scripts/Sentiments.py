import asyncio
from playwright.async_api import async_playwright
import time
from crawl4ai import BrowserConfig , CrawlerRunConfig , AsyncWebCrawler,VirtualScrollConfig
from crawl4ai.async_configs import CacheMode
from bs4 import BeautifulSoup
import requests
import html






# Per Stock | Run Per stock
async def yahoo_finance(stock_name):
    url = f'https://finance.yahoo.com/quote/{stock_name}.NS/news/'

    # Using Playwright to get html from yahoo finance news

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        await page.goto(url,timeout=60000)
        await page.evaluate("""
            async () => {
                await new Promise((resolve) => {
                    let lastHeight = document.body.scrollHeight;
                    
                    const scrollInterval = setInterval(async () => {
                        let currentPos = window.scrollY;
                        let targetPos = document.body.scrollHeight;
                        while (currentPos < targetPos) {
                            currentPos += 150; // Scroll 150px at a time
                            window.scrollTo(0, currentPos);
                            await new Promise(r => setTimeout(r, 20)); // 20ms delay between increments
                            targetPos = document.body.scrollHeight; // Recalculate in case it grows
                        }
                        
                        // 2. Wait for 5 seconds to allow lazy loading
                        await new Promise(r => setTimeout(r, 5000));
                        
                        // 3. Check if the height has changed
                        let newHeight = document.body.scrollHeight;
                        
                        if (newHeight === lastHeight) {
                            // No more content loading, clear interval and finish
                            clearInterval(scrollInterval);
                            resolve();
                        }
                        
                        lastHeight = newHeight;
                        console.log('Scroll height updated, continuing...');
                    }, 100); 
                });
            }
        """)

        html_data = await page.content()
    
    # Using BS4 to get List Urls

    soup = BeautifulSoup(html_data,'html.parser')
    content_container = soup.find('div',class_="column-container yf-1m8w4l1")
    individual_url_container = (content_container.find_all('li',class_="stream-item story-item yf-ydpc1"))
    print(len(individual_url_container))


    urls = []
    for url_href in individual_url_container:
        url_data = url_href.find('a',class_="subtle-link fin-size-small thumb yf-119g04z")
        count = 1
        while True:
            try:
                urls.append(url_data['href'])
                break
            except Exception as e:
                print(f"No data ERROR -> {e}")
                count+=1
                if count == 4:
                    break
    
    print(urls)

    # Using Crawl4AI to get metadata for all the website
    browser_config = BrowserConfig
    run_config = CrawlerRunConfig
    


        



    return
    

asyncio.run(yahoo_finance())



# Will give overall News | Run Once per day 
async def google_news():
    return
