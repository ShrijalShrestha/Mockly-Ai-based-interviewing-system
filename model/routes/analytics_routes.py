from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import logging

from mongo_connect import collection, mongo_errors

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/user_stats/{user_id}")
async def get_user_stats(user_id: str):
    """Get basic statistics: average score, total interview time, and number of interviews"""
    try:
        # Get all sessions for the user with relevant timestamps
        sessions = list(collection.find({"user_id": user_id}, {
            "_id": 0,
            "evaluation.score": 1,
            "timestamp": 1,
            "last_updated": 1
        }))
        
        if not sessions:
            return {
                "average_score": 0,
                "total_time_minutes": 0,
                "total_interviews": 0
            }
        
        total_sessions = len(sessions)
        total_score = sum(float(session.get("evaluation", {}).get("score", 0)) for session in sessions)
        avg_score = total_score / total_sessions if total_sessions > 0 else 0
        
        # Calculate total interview time in minutes
        total_time_minutes = 0
        
        for session in sessions:
            try:
                # Debug: Print raw timestamp values
                print(f"Raw timestamp: {session.get('timestamp')}")
                print(f"Raw last_updated: {session.get('last_updated')}")
                
                # Parse timestamps
                start_str = str(session.get("timestamp"))
                end_str = str(session.get("last_updated"))
                
                # Remove trailing 'Z' if present and ensure proper ISO format
                start_str = start_str.replace('Z', '+00:00')
                end_str = end_str.replace('Z', '+00:00')
                
                start_time = datetime.fromisoformat(start_str)
                end_time = datetime.fromisoformat(end_str)
                
                # Debug: Print parsed datetimes
                print(f"Parsed start: {start_time}")
                print(f"Parsed end: {end_time}")
                
                # Calculate duration in minutes
                duration = (end_time - start_time).total_seconds() / 60
                print(f"Calculated duration: {duration} minutes")
                
                if duration > 0:  # Only add positive durations
                    total_time_minutes += duration
            except (KeyError, ValueError, TypeError) as e:
                # Skip if timestamps are missing, invalid, or wrong type
                continue
        
        return {
            "average_score": round(avg_score, 2),
            "total_time_minutes": round(total_time_minutes, 2),
            "total_interviews": total_sessions
        }
    except Exception as e:
        print(f"Error retrieving user stats: {str(e)}")  # Debug
        return {
            "average_score": 0,
            "total_time_minutes": 0,
            "total_interviews": 0
        }

@router.get("/performance_evaluations/{user_id}")
async def get_performance_evaluations(user_id: str):
    """Get all performance evaluation breakdowns for a user with average scores"""
    try:
        sessions = list(collection.find(
            {"user_id": user_id, "evaluation": {"$exists": True}},
            {
                "_id": 0,
                "session_id": 1,
                "timestamp": 1,
                "evaluation.score": 1,
                "evaluation.breakdown": 1,
                "evaluation.strengths": 1,
                "evaluation.improvement_areas": 1
            }
        ).sort("timestamp", -1))
        
        # Default response when no sessions exist
        if not sessions:
            return {
                "evaluation_scores": [
                    {"category": "Technical Skill", "score": 0},
                    {"category": "Problem Solving", "score": 0},
                    {"category": "Communication", "score": 0},
                    {"category": "Knowledge", "score": 0}
                ],
                "evaluations": [],
                "total_sessions": 0,
                "average_score": 0
            }
        
        # Initialize accumulators
        total_score = 0
        category_totals = {
            "technical_skill": 0,
            "problem_solving": 0,
            "communication": 0,
            "knowledge": 0
        }
        
        # Process all sessions
        for session in sessions:
            eval_data = session.get("evaluation", {})
            breakdown = eval_data.get("breakdown", {})
            
            # Accumulate totals for averages
            total_score += eval_data.get("score", 0)
            category_totals["technical_skill"] += breakdown.get("technical skill", 0)
            category_totals["problem_solving"] += breakdown.get("problem solving", 0)
            category_totals["communication"] += breakdown.get("communication", 0)
            category_totals["knowledge"] += breakdown.get("knowledge", 0)
        
        # Calculate averages
        total_sessions = len(sessions)
        average_score = round(total_score / total_sessions, 2) if total_sessions > 0 else 0
        
        evaluation_scores = [
            {
                "category": "Technical Skill",
                "score": round(category_totals["technical_skill"] / total_sessions, 2)
            },
            {
                "category": "Problem Solving",
                "score": round(category_totals["problem_solving"] / total_sessions, 2)
            },
            {
                "category": "Communication",
                "score": round(category_totals["communication"] / total_sessions, 2)
            },
            {
                "category": "Knowledge",
                "score": round(category_totals["knowledge"] / total_sessions, 2)
            }
        ]
        
        return {
            "evaluation_scores": evaluation_scores,
            "total_sessions": total_sessions,
            "average_score": average_score
        }
        
    except Exception as e:
        # Return default data on error
        return {
            "evaluation_scores": [
                {"category": "Technical Skill", "score": 0},
                {"category": "Problem Solving", "score": 0},
                {"category": "Communication", "score": 0},
                {"category": "Knowledge", "score": 0}
            ],
            "evaluations": [],
            "total_sessions": 0,
            "average_score": 0
        }

@router.get("/monthly_scores/{user_id}")
async def get_monthly_scores(user_id: str, months: int = 6):
    """Get monthly average scores for the last N months"""
    try:
        # Get current date in UTC
        current_date = datetime.utcnow()
        start_date = current_date - timedelta(days=30*months)
        
        logger.info(f"Retrieving monthly scores for user {user_id} from {start_date} to {current_date}")
        
        # First verify the user exists
        if collection.count_documents({"user_id": user_id}) == 0:
            logger.warning(f"User {user_id} not found in the database")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all completed interviews within date range
        interviews = list(collection.find({
            "user_id": user_id,
            "completed": True,
            "timestamp": {
                "$gte": start_date,
                "$lte": current_date
            }
        }, {
            "timestamp": 1,
            "score": 1,
            "evaluation.score": 1
        }))
        
        logger.info(f"Found {len(interviews)} interviews for user {user_id}")
        
        if not interviews:
            return {
                "user_id": user_id,
                "time_period": f"Last {months} months",
                "message": "No interviews found in this period",
                "monthly_scores": []
            }
        
        # Group by month and calculate average scores
        months_data = {}
        
        for interview in interviews:
            timestamp = interview.get("timestamp")
            if not timestamp:
                continue
                
            # Extract year and month
            year_month = timestamp.strftime("%Y-%m")
            
            # Get score (either from root or evaluation object)
            score = interview.get("score", 0)
            if score == 0:
                score = interview.get("evaluation", {}).get("score", 0)
            
            # Add to appropriate month bucket
            if year_month not in months_data:
                months_data[year_month] = {"total": score, "count": 1}
            else:
                months_data[year_month]["total"] += score
                months_data[year_month]["count"] += 1
        
        # Calculate averages and format results
        monthly_scores = []
        
        for year_month, data in sorted(months_data.items()):
            year, month = year_month.split("-")
            avg_score = data["total"] / data["count"]
            
            monthly_scores.append({
                "year": int(year),
                "month": int(month),
                "average_score": round(avg_score, 2),
                "session_count": data["count"]
            })
        
        # Fill in missing months with zero scores to ensure continuity
        filled_monthly_scores = []
        
        for m in range(months):
            target_date = current_date - timedelta(days=30*(months-m-1))
            target_year = target_date.year
            target_month = target_date.month
            
            # Check if we have data for this month
            found = False
            for score_data in monthly_scores:
                if score_data["year"] == target_year and score_data["month"] == target_month:
                    filled_monthly_scores.append(score_data)
                    found = True
                    break
            
            # If no data, add a zero entry
            if not found:
                filled_monthly_scores.append({
                    "year": target_year,
                    "month": target_month,
                    "average_score": 0,
                    "session_count": 0
                })
        
        return {
            "user_id": user_id,
            "time_period": f"Last {months} months",
            "monthly_scores": filled_monthly_scores
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving monthly scores: {str(e)}", exc_info=True)
        return {
            "user_id": user_id,
            "time_period": f"Last {months} months",
            "monthly_scores": [],
            "error": str(e)
        }

@router.get("/test_scores/{user_id}")
async def get_test_scores(user_id: str, limit: int = 10):
    """Get individual test scores for a user, with most recent first"""
    try:
        # Verify the user exists
        if collection.count_documents({"user_id": user_id}) == 0:
            logger.warning(f"User {user_id} not found in the database")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all completed interviews for the user, sort by timestamp descending
        interviews = list(collection.find({
            "user_id": user_id,
            "completed": True,
            "evaluation.score": {"$exists": True},
            "session_id": {"$exists": True}  # Ensure session_id exists
        }, {
            "_id": 0,
            "session_id": 1,
            "timestamp": 1,
            "evaluation.score": 1
        }).sort("timestamp", -1).limit(limit))
        
        logger.info(f"Found {len(interviews)} completed interviews for user {user_id}")
        
        # Format the results
        test_scores = []
        for i, interview in enumerate(reversed(interviews), 1):  # Reverse to show oldest first
            # Only include interviews with valid session_id
            session_id = interview.get("session_id")
            if not session_id:
                logger.warning(f"Interview missing session_id: {interview.get('timestamp')}")
                continue
                
            # Format timestamp consistently
            timestamp = interview.get("timestamp")
            date_str = "Unknown"
            if timestamp:
                if isinstance(timestamp, datetime):
                    date_str = timestamp.strftime("%Y-%m-%d")
                elif isinstance(timestamp, str):
                    try:
                        date_obj = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        date_str = date_obj.strftime("%Y-%m-%d")
                    except ValueError:
                        date_str = timestamp
            
            test_scores.append({
                "test_number": i,
                "session_id": session_id,  # Make sure session_id is included
                "score": interview.get("evaluation", {}).get("score", 0),
                "date": date_str,
                "timestamp": str(timestamp)  # Include raw timestamp for debugging
            })
        
        return {
            "user_id": user_id,
            "total_tests": len(test_scores),
            "test_scores": test_scores
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving test scores: {str(e)}", exc_info=True)
        return {
            "user_id": user_id,
            "total_tests": 0,
            "test_scores": [],
            "error": str(e)
        }

@router.get("/get_mock_interview/{user_id}")
async def get_mock_interview(user_id: str):
    """Get all mock interviews for a specific user with validated session IDs"""
    try:
        logger.info(f"Retrieving mock interviews for user {user_id}")
        
        # Find all interviews for the user, ensure session_id exists
        mock_interviews = list(collection.find({
            "user_id": user_id,
            "session_id": {"$exists": True}  # Ensure session_id field exists
        }, {"_id": 0}))
        
        logger.info(f"Found {len(mock_interviews)} interviews for user {user_id}")
        
        # Validate each interview has required fields
        validated_interviews = []
        for interview in mock_interviews:
            # Check for required fields for report page
            session_id = interview.get("session_id")
            if not session_id:
                logger.warning(f"Interview missing session_id: {interview.get('timestamp')}")
                # Skip interviews with missing session_id
                continue
                
            # Ensure timestamp is properly formatted for client consumption
            if "timestamp" in interview and interview["timestamp"]:
                try:
                    # Convert to ISO format string if it's a datetime object
                    if isinstance(interview["timestamp"], datetime):
                        interview["timestamp"] = interview["timestamp"].isoformat()
                except Exception as e:
                    logger.error(f"Error formatting timestamp: {e}")
            
            # Add to validated list
            validated_interviews.append(interview)
        
        logger.info(f"Returning {len(validated_interviews)} validated interviews")
        
        if not validated_interviews:
            logger.warning(f"No valid mock interviews found for user {user_id}")
            return {"mock_interviews": []}
            
        return {"mock_interviews": validated_interviews}
    except Exception as e:
        logger.error(f"Error retrieving mock interviews: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving mock interviews: {str(e)}")