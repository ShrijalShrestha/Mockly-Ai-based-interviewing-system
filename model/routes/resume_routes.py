from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from datetime import datetime
from typing import List
import fitz
import re
import json
import logging
import uuid
from agents import question_crew
from mongo_connect import collection, mongo_errors
from models import Question
from shared_state import user_sessions

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

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

@router.post("/upload_resume", response_model=dict)
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
            "session_id": session_id,  # Ensure session_id is explicitly set
            "questions": questions,
            "responses": [],
            "feedback": [],
            "completed": False,
            "timestamp": datetime.now()
        }

        try:
            # Ensure the session_id is properly stored
            logger.info(f"Saving interview session with ID: {session_id}")
            collection.insert_one(interview_data)
            
            # Verify the document was stored correctly
            verification = collection.find_one({"session_id": session_id})
            if not verification:
                logger.error("Failed to verify stored session")
                raise ValueError("Session data was not stored properly")
                
            logger.info(f"Session stored successfully with ID: {verification.get('session_id')}")
        except Exception as e:
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

@router.get("/question/{user_id}/{session_id}", response_model=dict)
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
        except Exception as e:
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