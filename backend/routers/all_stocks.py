from fastapi import APIRouter

from dotenv import load_dotenv

import os

load_dotenv()

mongo_db = os.getenv("DATABASE")