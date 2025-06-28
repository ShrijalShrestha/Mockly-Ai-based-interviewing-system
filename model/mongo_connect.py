from dotenv import load_dotenv
from pymongo import MongoClient, errors as mongo_errors
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    MONGO_URI ="mongodb://127.0.0.1:27017" or os.getenv("MONGO_URI") 
    if not MONGO_URI:
        raise ValueError("MONGO_URI environment variable not set")
        
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client.ai_interview
    collection = db.mock_interviews
    
    # Test the connection
    client.server_info()
except (mongo_errors.ServerSelectionTimeoutError, ValueError) as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    raise RuntimeError("Database connection failed") from e