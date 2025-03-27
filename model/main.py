from fastapi import FastAPI, UploadFile, File, Form, Body, HTTPException
# from fastapi.responses import JSONResponse
from pymongo import MongoClient, errors as mongo_errors
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import fitz
import os
import re
import json
import datetime
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
    MONGO_URI = os.getenv("MONGO_URI")
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
    timestamp: datetime.datetime

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
            "timestamp": datetime.datetime.now()
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

        # Validate response count
        if len(responses) != len(interview_data["questions"]):
            raise HTTPException(
                status_code=400,
                detail=f"Expected {len(interview_data['questions'])} responses, got {len(responses)}"
            )

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

            responses_to_store.append(response.dict())
            feedback_list.append({
                "question_id": response.question_id,
                "text": evaluation
            })
            question_response_pairs.append({
                "question": question["text"],
                "response": response.text,
                "feedback": evaluation
            })

        # Generate overall evaluation
        try:
            overall_evaluation = score_crew.kickoff(inputs={"data": question_response_pairs})
            score = overall_evaluation.get("score", 0)
        except Exception as e:
            logger.error(f"Scoring failed: {str(e)}")
            overall_evaluation = {"error": "Could not generate evaluation"}
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
                        "last_updated": datetime.datetime.now()
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

@app.post("/complete_interview/{user_id}/{session_id}")
async def complete_interview(user_id: str, session_id: str):
    if user_id not in user_sessions or session_id not in user_sessions[user_id]:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = user_sessions[user_id][session_id]
    
    # Prepare the data for final evaluation
    question_response_feedback = []
    for i, question in enumerate(session["questions"]):
        response = next(
            (r for r in session["responses"] if r["question_id"] == question["id"]),
            {"text": "No response recorded"}
        )
        feedback = next(
            (f for f in session["feedback"] if f["question_id"] == question["id"]),
            {"text": "No feedback available"}
        )
        
        question_response_feedback.append({
            "question": question["text"],
            "response": response["text"],
            "feedback": feedback["text"]
        })
    
    # Get overall evaluation
    overall_evaluation = score_crew.kickoff(inputs={"data": question_response_feedback})
    score = overall_evaluation.get("score", 0)
    
    # Prepare data for saving
    mock_interview = {
        "user_id": user_id,
        "session_id": session_id,
        "questions": session["questions"],
        "responses": session["responses"],
        "feedback": session["feedback"],
        "total_time": 0,
        "score": score,
        "evaluation": overall_evaluation,
        "timestamp": datetime.datetime.now()
    }
    
    # Save to MongoDB
    result = collection.insert_one(mock_interview)
    
    return {
        "message": "Interview completed and saved successfully",
        "score": score,
        "evaluation": overall_evaluation,
        "interview_id": str(result.inserted_id)
    }

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
    uvicorn.run(app, host="10.1.172.43", port=8000)