import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-prod")
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/delivery_app")
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
