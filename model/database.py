from pymongo import MongoClient, errors as mongo_errors
from config import MONGO_URI, logger
from datetime import datetime
from typing import List, Dict, Optional

class DatabaseManager:
    def __init__(self):
        try:
            self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            self.db = self.client.ai_interview
            self.collection = self.db.mock_interviews
            
            # Test the connection
            self.client.server_info()
            logger.info("Successfully connected to MongoDB")
        except (mongo_errors.ServerSelectionTimeoutError, ValueError) as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise RuntimeError("Database connection failed") from e

    def insert_interview(self, interview_data: dict) -> bool:
        """Insert new interview data into the database."""
        try:
            self.collection.insert_one(interview_data)
            return True
        except mongo_errors.PyMongoError as e:
            logger.error(f"Database insert failed: {str(e)}")
            return False

    def find_interview(self, user_id: str, session_id: str) -> Optional[dict]:
        """Find interview data by user_id and session_id."""
        try:
            return self.collection.find_one(
                {"user_id": user_id, "session_id": session_id}
            )
        except mongo_errors.PyMongoError as e:
            logger.error(f"Database query failed: {str(e)}")
            return None

    def update_interview(self, user_id: str, session_id: str, update_data: dict) -> bool:
        """Update interview data in the database."""
        try:
            result = self.collection.update_one(
                {"user_id": user_id, "session_id": session_id},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except mongo_errors.PyMongoError as e:
            logger.error(f"Database update failed: {str(e)}")
            return False

    def get_user_interviews(self, user_id: str, projection: dict = None) -> List[dict]:
        """Get all interviews for a specific user."""
        try:
            query = {"user_id": user_id}
            if projection:
                return list(self.collection.find(query, projection))
            return list(self.collection.find(query, {"_id": 0}))
        except mongo_errors.PyMongoError as e:
            logger.error(f"Database query failed: {str(e)}")
            return []

    def get_completed_interviews(self, user_id: str, date_filter: dict = None) -> List[dict]:
        """Get completed interviews for a user with optional date filtering."""
        try:
            query = {"user_id": user_id, "completed": True}
            if date_filter:
                query["timestamp"] = date_filter
            
            return list(self.collection.find(query, {
                "timestamp": 1,
                "score": 1,
                "evaluation.score": 1,
                "evaluation.breakdown": 1,
                "evaluation.strengths": 1,
                "evaluation.improvement_areas": 1
            }))
        except mongo_errors.PyMongoError as e:
            logger.error(f"Database query failed: {str(e)}")
            return []

    def count_user_documents(self, user_id: str) -> int:
        """Count documents for a specific user."""
        try:
            return self.collection.count_documents({"user_id": user_id})
        except mongo_errors.PyMongoError as e:
            logger.error(f"Database count failed: {str(e)}")
            return 0

# Global database instance
db_manager = DatabaseManager()
