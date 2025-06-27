import os
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Database configuration
MONGO_URI = "mongodb://127.0.0.1:27017" or os.getenv("MONGO_URI")

# Validate required environment variables
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable not set")

# App configuration
APP_TITLE = "AI Interview System"
APP_DESCRIPTION = "API for conducting mock interviews with AI feedback"
