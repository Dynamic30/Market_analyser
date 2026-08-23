from fastapi import FastAPI
from backend.routers import all_stocks
from backend.routers import home
from backend.routers import commodities
# for lifespan 
from contextlib import asynccontextmanager


# server frontned
from fastapi.staticfiles import StaticFiles

from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan():
    return



app = FastAPI(app="Stock Market Analyzer") # add lifespan=lifespan once completed

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # dev only — lock to your real origin later
    allow_methods=["*"],
    allow_headers=["*"],
)



#app routers
app.include_router(all_stocks.router,prefix="/v1/all_stocks")
app.include_router(home.router,prefix="/v1/home")
app.include_router(commodities.router,prefix="/v1/commodities")

app.mount("/",StaticFiles(directory="frontend",html=True))
