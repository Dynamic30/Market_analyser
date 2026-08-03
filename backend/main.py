from fastapi import FastAPI
from backend.routers import all_stocks

# server frontned
from fastapi.staticfiles import StaticFiles

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # dev only — lock to your real origin later
    allow_methods=["*"],
    allow_headers=["*"],
)


#app routers
app.include_router(all_stocks.router,prefix="/v1/all_stocks")

app.mount("/",StaticFiles(directory="frontend",html=True))
