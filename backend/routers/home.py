from fastapi import APIRouter
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter()

mongo_db = os.getenv("DATABASE")

# @router.get("raw/{stock}")