# Session management with MongoDB for production-ready state management
from pymongo import MongoClient, errors
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import logging
import os
from dotenv import load_dotenv

# Configure logging
logger = logging.getLogger(__name__)

load_dotenv()

# Connect to MongoDB (use the existing connection if possible)
try:
    from mongo_connect import client, db
    # Create a separate collection for sessions
    sessions_collection = db["sessions"]
    
    # Create TTL index to automatically expire old sessions (if it doesn't exist)
    try:
        existing_indexes = sessions_collection.list_indexes()
        has_ttl_index = any(index.get('name') == 'expiry_ttl' for index in existing_indexes)
        
        if not has_ttl_index:
            sessions_collection.create_index("expiry", expireAfterSeconds=0, name="expiry_ttl")
            logger.info("Created TTL index for session expiration")
    except Exception as e:
        logger.error(f"Failed to create TTL index: {str(e)}")
        
except ImportError:
    # Fallback if mongo_connect.py isn't properly set up
    logger.warning("Could not import from mongo_connect, creating new MongoDB client")
    MONGO_URI = os.getenv("MONGO_URI") or "mongodb://127.0.0.1:27017"
    
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client.ai_interview
        sessions_collection = db["sessions"]
        sessions_collection.create_index("expiry", expireAfterSeconds=0, name="expiry_ttl")
    except errors.ServerSelectionTimeoutError as e:
        logger.error(f"Could not connect to MongoDB: {str(e)}")
        # Fallback to in-memory as last resort
        logger.warning("Falling back to in-memory session storage - NOT RECOMMENDED FOR PRODUCTION")

class MongoSessionManager:
    def __init__(self, collection=None, session_timeout: int = 3600):
        """Initialize the MongoDB session manager
        
        Args:
            collection: MongoDB collection to use for sessions
            session_timeout: Session timeout in seconds (default: 1 hour)
        """
        self.collection = collection
        self.session_timeout = session_timeout
        self.fallback_dict = {}  # Fallback in-memory storage if MongoDB is unavailable
        
    def get_session(self, user_id: str, session_id: str = None) -> Optional[Dict[str, Any]]:
        """Get a user session by user_id and optionally session_id
        
        Args:
            user_id: The user ID
            session_id: Optional session ID if the user has multiple sessions
            
        Returns:
            Session data dict or None if not found
        """
        try:
            if not self.collection:
                # Fallback to in-memory
                return self.fallback_dict.get(user_id, {}).get(session_id)
                
            query = {"user_id": user_id}
            if session_id:
                query["session_id"] = session_id
                
            session = self.collection.find_one(query)
            if session:
                # Remove MongoDB _id and expiry fields for clean data
                session.pop("_id", None)
                session.pop("expiry", None)
                return session
            return None
        except Exception as e:
            logger.error(f"Error retrieving session: {str(e)}")
            # Fallback to in-memory
            return self.fallback_dict.get(user_id, {}).get(session_id)
    
    def get_user_sessions(self, user_id: str) -> Dict[str, Any]:
        """Get all sessions for a user
        
        Args:
            user_id: The user ID
            
        Returns:
            Dictionary of session_id -> session_data
        """
        try:
            if not self.collection:
                # Fallback to in-memory
                return self.fallback_dict.get(user_id, {})
                
            sessions = {}
            cursor = self.collection.find({"user_id": user_id})
            
            for session in cursor:
                session_id = session.get("session_id")
                if session_id:
                    session.pop("_id", None)
                    session.pop("expiry", None)
                    sessions[session_id] = session
                    
            return sessions
        except Exception as e:
            logger.error(f"Error retrieving user sessions: {str(e)}")
            # Fallback to in-memory
            return self.fallback_dict.get(user_id, {})
    
    def set_session(self, user_id: str, session_id: str, data: Dict[str, Any]) -> None:
        """Set session data for a user
        
        Args:
            user_id: The user ID
            session_id: The session ID
            data: Session data to store
        """
        try:
            if not self.collection:
                # Fallback to in-memory
                if user_id not in self.fallback_dict:
                    self.fallback_dict[user_id] = {}
                self.fallback_dict[user_id][session_id] = data
                return
                
            # Calculate expiration time
            expiry = datetime.utcnow() + timedelta(seconds=self.session_timeout)
            
            # Prepare data with required fields
            data_with_metadata = {
                "user_id": user_id,
                "session_id": session_id,
                "expiry": expiry,
                "last_updated": datetime.utcnow(),
                **data
            }
            
            # Upsert to handle both insert and update cases
            self.collection.update_one(
                {"user_id": user_id, "session_id": session_id},
                {"$set": data_with_metadata},
                upsert=True
            )
        except Exception as e:
            logger.error(f"Error setting session: {str(e)}")
            # Fallback to in-memory
            if user_id not in self.fallback_dict:
                self.fallback_dict[user_id] = {}
            self.fallback_dict[user_id][session_id] = data
    
    def update_session(self, user_id: str, session_id: str, data: Dict[str, Any]) -> None:
        """Update specific fields in an existing session
        
        Args:
            user_id: The user ID
            session_id: The session ID
            data: Fields to update
        """
        try:
            if not self.collection:
                # Fallback to in-memory
                if user_id in self.fallback_dict and session_id in self.fallback_dict[user_id]:
                    self.fallback_dict[user_id][session_id].update(data)
                return
                
            # Add last_updated timestamp and extend expiry
            update_data = {
                "last_updated": datetime.utcnow(),
                "expiry": datetime.utcnow() + timedelta(seconds=self.session_timeout),
                **data
            }
            
            self.collection.update_one(
                {"user_id": user_id, "session_id": session_id},
                {"$set": update_data}
            )
        except Exception as e:
            logger.error(f"Error updating session: {str(e)}")
            # Fallback to in-memory
            if user_id in self.fallback_dict and session_id in self.fallback_dict[user_id]:
                self.fallback_dict[user_id][session_id].update(data)
    
    def delete_session(self, user_id: str, session_id: str = None) -> None:
        """Delete a session or all sessions for a user
        
        Args:
            user_id: The user ID
            session_id: Optional session ID. If None, deletes all user sessions
        """
        try:
            if not self.collection:
                # Fallback to in-memory
                if session_id:
                    if user_id in self.fallback_dict:
                        self.fallback_dict[user_id].pop(session_id, None)
                else:
                    self.fallback_dict.pop(user_id, None)
                return
                
            query = {"user_id": user_id}
            if session_id:
                query["session_id"] = session_id
                
            self.collection.delete_many(query)
        except Exception as e:
            logger.error(f"Error deleting session: {str(e)}")
            # Fallback to in-memory
            if session_id:
                if user_id in self.fallback_dict:
                    self.fallback_dict[user_id].pop(session_id, None)
            else:
                self.fallback_dict.pop(user_id, None)

# Create global instance of the session manager
session_manager = MongoSessionManager(collection=sessions_collection)

# For backward compatibility - use this dictionary-like interface
# This makes the transition seamless without breaking existing code
class SessionDict(dict):
    def __getitem__(self, user_id):
        return session_manager.get_user_sessions(user_id)
        
    def __setitem__(self, user_id, sessions):
        for session_id, data in sessions.items():
            session_manager.set_session(user_id, session_id, data)
    
    def setdefault(self, user_id, default=None):
        sessions = session_manager.get_user_sessions(user_id)
        if not sessions and default is not None:
            return default
        return sessions
        
    def get(self, user_id, default=None):
        sessions = session_manager.get_user_sessions(user_id)
        return sessions if sessions else default
        
    def __contains__(self, user_id):
        return bool(session_manager.get_user_sessions(user_id))

# Replace the simple dictionary with our session manager wrapper
# This maintains backwards compatibility while using MongoDB
user_sessions = SessionDict()
