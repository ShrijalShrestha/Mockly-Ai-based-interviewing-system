from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import uvicorn
from dotenv import load_dotenv

# Import route modules
from routes.resume_routes import router as resume_router
from routes.interview_routes import router as interview_router
from routes.analytics_routes import router as analytics_router
from routes.health_routes import router as health_router

# Import MongoDB connection
from mongo_connect import client, db, collection

# Import shared state
from shared_state import user_sessions

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="AI Interview System",
              description="API for conducting mock interviews with AI feedback")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with proper prefixes
app.include_router(health_router, tags=["Health"])
app.include_router(resume_router, tags=["Resume"])
app.include_router(interview_router, tags=["Interview"])
app.include_router(analytics_router, tags=["Analytics"])

# Run the application
if __name__ == "__main__":
    try:
        logger.info("Starting AI Interview System API")
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")