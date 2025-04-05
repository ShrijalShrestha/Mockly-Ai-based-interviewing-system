from fastapi import FastAPI, UploadFile, File, Form, Body, HTTPException
# from fastapi.responses import JSONResponse
from pymongo import MongoClient, errors as mongo_errors
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from pydantic import BaseModel
import fitz
import os
import re
import json
import logging
import uuid

from typing import List, Dict
from dotenv import load_dotenv
from agents import question_crew, response_crew, score_crew

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

try:
    MONGO_URI = os.getenv("MONGO_URI") or "mongodb://127.0.0.1:27017"
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

app = FastAPI(title="AI Interview System",
              description="API for conducting mock interviews with AI feedback")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session storage
user_sessions: Dict[str, Dict[str, dict]] = {}

# Pydantic Models
class ResumeRequest(BaseModel):
    user_id: str
    resume_text: str

class Response(BaseModel):
    question_id: str
    text: str

class Feedback(BaseModel):
    question_id: str
    text: str

class Question(BaseModel):
    id: str
    text: str

class MockInterview(BaseModel):
    user_id: str
    session_id: str
    questions: List[Question]
    responses: List[Response]
    feedback: List[Feedback]
    total_time: float
    score: float
    evaluation: dict 
    timestamp: datetime

def extract_resume_text(pdf_file: UploadFile) -> str:
    """Extract and clean text from PDF resume."""
    try:
        with fitz.open(stream=pdf_file.file.read(), filetype="pdf") as doc:
            text = "".join(page.get_text() for page in doc)
            cleaned_text = re.sub(r'[^\w\s,.|:/-]', '', text)
            return re.sub(r'\s+', ' ', cleaned_text).strip()
    except Exception as e:
        logger.error(f"Error extracting resume text: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid PDF file")
    
async def generate_questions(resume: str) -> List[dict]:
    """Generate interview questions from resume text."""
    if not resume:
        raise HTTPException(status_code=400, detail="Resume text is required")

    try:
        result = question_crew.kickoff(inputs={"data": resume})
        if result.startswith("```json"):
            result = result[7:-4].strip()
        
        questions_data = json.loads(result)
        
        if not isinstance(questions_data, list):
            raise ValueError("Unexpected AI response format - expected list")
            
        return [{"id": str(uuid.uuid4()), "text": q.get("question", "No question generated")} 
                for q in questions_data]
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error parsing AI response")
    except Exception as e:
        logger.error(f"Question generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate questions")

@app.post("/upload_resume", response_model=dict)
async def upload_resume(file: UploadFile = File(...), user_id: str = Form(...)):
    """Process uploaded resume and generate interview questions."""
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted")

        session_id = str(uuid.uuid4())
        resume_text = extract_resume_text(file)

        try:
            questions = await generate_questions(resume_text)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Question generation failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to generate questions")

        # Initialize session
        user_sessions.setdefault(user_id, {})[session_id] = {
            "questions": questions,
            "responses": [],
            "feedback": [],
            "completed": False
        }

        # Store in database
        interview_data = {
            "user_id": user_id,
            "session_id": session_id,
            "questions": questions,
            "responses": [],
            "feedback": [],
            "completed": False,
            "timestamp": datetime.now()
        }

        try:
            collection.insert_one(interview_data)
        except mongo_errors.PyMongoError as e:
            logger.error(f"Database insert failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save interview data")

        return {
            "message": "Resume processed successfully",
            "session_id": session_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in upload_resume: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/question/{user_id}/{session_id}", response_model=dict)
async def get_interview_questions(user_id: str, session_id: str):
    """Retrieve generated questions for an interview session."""
    try:
        # Check in-memory session first
        if user_id in user_sessions and session_id in user_sessions[user_id]:
            return {"questions": user_sessions[user_id][session_id]["questions"]}

        # Fallback to database
        try:
            data = collection.find_one(
                {"user_id": user_id, "session_id": session_id},
                {"questions": 1}
            )
        except mongo_errors.PyMongoError as e:
            logger.error(f"Database query failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Database error")

        if not data:
            raise HTTPException(status_code=404, detail="Interview session not found")

        return {"questions": data["questions"]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_interview_questions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/process_interview_responses", response_model=dict)
async def process_interview_responses(
    responses: List[Response] = Body(...),
    user_id: str = Body(...),
    session_id: str = Body(...)
):
    """Process user responses and generate feedback."""
    try:
        # Get interview data
        try:
            interview_data = collection.find_one(
                {"user_id": user_id, "session_id": session_id}
            )
        except mongo_errors.PyMongoError as e:
            logger.error(f"Database query failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Database error")

        if not interview_data:
            raise HTTPException(status_code=404, detail="Interview data not found")

        # Process responses
        feedback_list = []
        responses_to_store = []
        question_response_pairs = []

        for response in responses:
            question = next(
                (q for q in interview_data["questions"] if q["id"] == response.question_id),
                None
            )
            if not question:
                raise HTTPException(
                    status_code=400,
                    detail=f"Question ID {response.question_id} not found"
                )

            try:
                evaluation = response_crew.kickoff(inputs={
                    "question": question["text"],
                    "response": response.text
                })
            except Exception as e:
                logger.error(f"Feedback generation failed: {str(e)}")
                evaluation = "Could not generate feedback"

            responses_to_store.append(response.model_dump())
            feedback_list.append({
                "question_id": response.question_id,
                "text": evaluation
            })
            question_response_pairs.append({
                "question": question["text"],
                "response": response.text,
                "feedback": evaluation
            })

        valid_pairs = [
            pair for pair in question_response_pairs 
            if pair["feedback"] and "Could not generate feedback" not in pair["feedback"]
        ]

        if not valid_pairs:
            raise HTTPException(
                status_code=400,
                detail="No valid responses available for evaluation"
            )

        # Generate overall evaluation
                # Generate overall evaluation
        try:
            # Prepare simpler input structure that won't conflict with string formatting
            evaluation_input = {
                "interview_data": json.dumps({
                    "pairs": valid_pairs,
                    "metadata": {
                        "user_id": user_id,
                        "session_id": session_id
                    }
                })
            }
            
            evaluation_output = score_crew.kickoff(inputs=evaluation_input)
            logger.debug(f"Raw evaluation output: {evaluation_output}")
            
            # Handle case where output might be a string or dict
            if isinstance(evaluation_output, str):
                overall_evaluation = clean_json_output(evaluation_output)
            else:
                overall_evaluation = evaluation_output
                
            if not isinstance(overall_evaluation, dict):
                raise ValueError("Evaluation output is not a valid dictionary")
                
            score = overall_evaluation.get("overall_score", 0)
            
            # Standardize the evaluation structure
            overall_evaluation = {
                "score": score,
                "breakdown": overall_evaluation.get("score_breakdown", {
                    "technical skill": 0,
                    "problem solving": 0,
                    "communication": 0,
                    "knowledge": 0
                }),
                "strengths": overall_evaluation.get("strengths", []),
                "improvement_areas": overall_evaluation.get("improvement_areas", [])
            }
        except Exception as e:
            logger.error(f"Scoring failed: {str(e)}", exc_info=True)
            overall_evaluation = {"error": f"Evaluation generation failed: {str(e)}"}
            score = 0

        # Update database
        try:
            update_result = collection.update_one(
                {"user_id": user_id, "session_id": session_id},
                {
                    "$set": {
                        "responses": responses_to_store,
                        "feedback": feedback_list,
                        "score": score,
                        "evaluation": overall_evaluation,
                        "completed": True,
                        "last_updated": datetime.now()
                    }
                }
            )
            
            if update_result.modified_count == 0:
                raise HTTPException(status_code=500, detail="Failed to update interview data")
        except mongo_errors.PyMongoError as e:
            logger.error(f"Database update failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save results")

        # Update in-memory session if exists
        if user_id in user_sessions and session_id in user_sessions[user_id]:
            user_sessions[user_id][session_id].update({
                "responses": responses_to_store,
                "feedback": feedback_list,
                "score": score,
                "evaluation": overall_evaluation,
                "completed": True
            })

        return {
            "status": "completed",
            "feedback": feedback_list,
            "score": score,
            "evaluation": overall_evaluation
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in process_interview_responses: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


def clean_json_output(json_str: str) -> dict:
    """Clean and parse JSON output from LLM."""
    try:
        # Remove markdown code fences if present
        json_str = json_str.strip()
        if json_str.startswith('```json'):
            json_str = json_str[7:]
        if json_str.endswith('```'):
            json_str = json_str[:-3]
        json_str = json_str.strip()
        
        # Parse the JSON
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON: {json_str}")
        return {"error": f"Invalid JSON format: {str(e)}"}
    except Exception as e:
        logger.error(f"Error cleaning JSON output: {str(e)}")
        return {"error": f"Output processing failed: {str(e)}"}

@app.get("/user_stats/{user_id}")
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
    
@app.get("/performance_evaluations/{user_id}")
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

# @app.get("/monthly_scores/{user_id}")
# async def get_monthly_scores(user_id: str, months: int = 6):
#     """Get monthly average scores for the last N months"""
#     try:
#         # Get current date in UTC
#         current_date = datetime.utcnow()
#         start_date = current_date - timedelta(days=30*months)
        
#         print(f"Searching for interviews between {start_date} and {current_date}")  # Debug
        
#         # First verify the user exists
#         if collection.count_documents({"user_id": user_id}) == 0:
#             raise HTTPException(status_code=404, detail="User not found")
        
#         # Check documents in date range without aggregation first
#         test_docs = list(collection.find({
#             "user_id": user_id,
#             "last_updated": {
#                 "$gte": start_date.isoformat(),
#                 "$lte": current_date.isoformat()
#             }
#         }, {"last_updated": 1, "evaluation.score": 1}).limit(1))
        
#         print(f"Found {len(test_docs)} documents in date range")  # Debug
        
#         if not test_docs:
#             return {
#                 "user_id": user_id,
#                 "time_period": f"Last {months} months",
#                 "message": "No interviews found in this period",
#                 "monthly_scores": []
#             }
        
#         # Now run the aggregation
#         pipeline = [
#             {
#                 "$match": {
#                     "user_id": user_id,
#                     "last_updated": {
#                         "$gte": start_date.isoformat(),
#                         "$lte": current_date.isoformat()
#                     }
#                 }
#             },
#             {
#                 "$addFields": {
#                     "date": {
#                         "$dateFromString": {
#                             "dateString": "$last_updated",
#                             "format": "%Y-%m-%dT%H:%M:%S.%L%z"
#                         }
#                     },
#                     "score": "$evaluation.score"
#                 }
#             },
#             {
#                 "$group": {
#                     "_id": {
#                         "year": {"$year": "$date"},
#                         "month": {"$month": "$date"}
#                     },
#                     "average_score": {"$avg": "$score"},
#                     "count": {"$sum": 1}
#                 }
#             },
#             {
#                 "$sort": {"_id.year": 1, "_id.month": 1}
#             },
#             {
#                 "$project": {
#                     "_id": 0,
#                     "year": "$_id.year",
#                     "month": "$_id.month",
#                     "average_score": 1,
#                     "session_count": "$count"
#                 }
#             }
#         ]
        
#         monthly_data = list(collection.aggregate(pipeline))
        
#         return {
#             "user_id": user_id,
#             "time_period": f"Last {months} months",
#             "monthly_scores": monthly_data if monthly_data else [],
#             "debug_info": {
#                 "date_range": {
#                     "start": start_date.isoformat(),
#                     "end": current_date.isoformat()
#                 },
#                 "documents_found": len(test_docs)
#             }
#         }
        
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Error retrieving monthly scores: {str(e)}"
#         )
     
@app.get("/get_mock_interview/{user_id}")
async def get_mock_interview(user_id: str):
    try:
        mock_interviews = list(collection.find({"user_id": user_id}, {"_id": 0}))
        if not mock_interviews:
            raise HTTPException(status_code=404, detail="No mock interviews found for this user.")
        return {"mock_interviews": mock_interviews}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving mock interviews: {str(e)}")

@app.get("/")
def root():
    return {"message": "AI Interview System is running!"}

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)