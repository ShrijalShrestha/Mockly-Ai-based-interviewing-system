from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from database import db_manager
from config import logger

router = APIRouter()

@router.get("/user_stats/{user_id}")
async def get_user_stats(user_id: str):
    """Get basic statistics: average score, total interview time, and number of interviews"""
    try:
        # Get all sessions for the user with relevant timestamps
        sessions = db_manager.get_user_interviews(user_id, {
            "_id": 0,
            "evaluation.score": 1,
            "timestamp": 1,
            "last_updated": 1
        })
        
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
                start_str = str(session.get("timestamp"))
                end_str = str(session.get("last_updated"))
                
                # Remove trailing 'Z' if present and ensure proper ISO format
                start_str = start_str.replace('Z', '+00:00')
                end_str = end_str.replace('Z', '+00:00')
                
                start_time = datetime.fromisoformat(start_str)
                end_time = datetime.fromisoformat(end_str)
                
                # Calculate duration in minutes
                duration = (end_time - start_time).total_seconds() / 60
                
                if duration > 0:  # Only add positive durations
                    total_time_minutes += duration
            except (KeyError, ValueError, TypeError):
                # Skip if timestamps are missing, invalid, or wrong type
                continue
        
        return {
            "average_score": round(avg_score, 2),
            "total_time_minutes": round(total_time_minutes, 2),
            "total_interviews": total_sessions
        }
    except Exception as e:
        logger.error(f"Error retrieving user stats: {str(e)}")
        return {
            "average_score": 0,
            "total_time_minutes": 0,
            "total_interviews": 0
        }

@router.get("/performance_evaluations/{user_id}")
async def get_performance_evaluations(user_id: str):
    """Get all performance evaluation breakdowns for a user with average scores"""
    try:
        sessions = db_manager.get_completed_interviews(user_id)
        
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
        if db_manager.count_user_documents(user_id) == 0:
            logger.warning(f"User {user_id} not found in the database")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all completed interviews within date range
        date_filter = {
            "$gte": start_date,
            "$lte": current_date
        }
        interviews = db_manager.get_completed_interviews(user_id, date_filter)
        
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
                months_data[year_month] = {
                    "total": score,
                    "count": 1
                }
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
        if db_manager.count_user_documents(user_id) == 0:
            logger.warning(f"User {user_id} not found in the database")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all completed interviews for the user
        interviews = db_manager.get_completed_interviews(user_id)
        
        # Sort by timestamp and limit
        interviews = sorted(interviews, key=lambda x: x.get("timestamp", datetime.min), reverse=True)[:limit]
        
        logger.info(f"Found {len(interviews)} completed interviews for user {user_id}")
        
        # Format the results
        test_scores = []
        for i, interview in enumerate(reversed(interviews), 1):  # Reverse to show oldest first
            score = interview.get("evaluation", {}).get("score", 0)
            timestamp = interview.get("timestamp")
            
            test_scores.append({
                "test_number": i,
                "session_id": interview.get("session_id"),
                "score": score,
                "timestamp": timestamp.isoformat() if timestamp else None
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
