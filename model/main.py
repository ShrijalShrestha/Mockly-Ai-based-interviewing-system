from fastapi import FastAPI, UploadFile, File, Form, Body, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
import fitz
import datetime
import os
import re
import json
import uuid

import warnings
warnings.simplefilter("ignore", category=FutureWarning)

from dotenv import load_dotenv
load_dotenv()

from typing import List, Dict
from agents import question_crew, response_crew, score_crew


# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client.ai_interview
collection = db.mock_interviews

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enhanced session storage structure
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

def extract_resume_text(pdf_file):
    doc = fitz.open(pdf_file)
    text = "".join(page.get_text() for page in doc)
    cleaned_text = re.sub(r'[^\w\s,.|:/-]', '', text)
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
    return cleaned_text

async def generate_questions(resume: str):
    if not resume:
        raise HTTPException(status_code=400, detail="Resume text is required")

    try:
        result = question_crew.kickoff(inputs={"data": resume})
        if result.startswith("```json"):
            result = result[7:-4].strip()
        questions_data = json.loads(result)
        
        if isinstance(questions_data, list):
            # Generate UUIDs for each question
            return [{"id": str(uuid.uuid4()), "text": q.get("question", "No question generated")} 
                    for q in questions_data]
        raise ValueError("Unexpected AI response format")
    
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Error parsing AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# API Routes
@app.post("/upload_resume")
async def upload_resume(file: UploadFile = File(...), user_id: str = Form(...)):
    try:
        print(user_id)
        session_id = str(uuid.uuid4())
        print(session_id)
        temp_file_path = f"temp/{file.filename}"
        os.makedirs("temp", exist_ok=True)

        with open(temp_file_path, "wb") as temp_file:
            temp_file.write(await file.read())

        resume_text = extract_resume_text(temp_file_path)
        os.remove(temp_file_path)

        questions = await generate_questions(resume_text)

        if user_id not in user_sessions:
            user_sessions[user_id] = {}

        user_sessions[user_id][session_id] = {
            "questions": questions,
            "current_question_index": 0,
            "responses": [],
            "feedback": [],
            "completed": False
        }

        return {
            "message": "Resume processed", 
            "session_id": session_id,
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process_interview_responses")
async def process_interview_responses(
    responses: List[Response] = Body(...),
    user_id: str = Body(...),
    session_id: str = Body(...)
):
    try:
        # Validate session exists
        if user_id not in user_sessions or session_id not in user_sessions[user_id]:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = user_sessions[user_id][session_id]
        
        # Validate all questions were answered
        if len(responses) != len(session["questions"]):
            raise HTTPException(
                status_code=400,
                detail=f"Expected {len(session['questions'])} responses, got {len(responses)}"
            )
        
        # Process each response and generate feedback
        feedback_list = []
        for response in responses:
            # Find the corresponding question
            question = next(
                (q for q in session["questions"] if q["id"] == response.question_id),
                None
            )
            if not question:
                raise HTTPException(
                    status_code=400,
                    detail=f"Question ID {response.question_id} not found in session"
                )
            
            # Get evaluation for this question-response pair
            evaluation = response_crew.kickoff(inputs={
                "question": question["text"],
                "response": response.text
            })
            
            # Store the response and feedback
            session["responses"].append({
                "question_id": response.question_id,
                "text": response.text
            })
            
            feedback_list.append({
                "question_id": response.question_id,
                "text": evaluation
            })
        
        session["feedback"] = feedback_list
        session["completed"] = True
        
        # Generate overall evaluation
        question_response_feedback = []
        for i, question in enumerate(session["questions"]):
            response = next(
                (r for r in session["responses"] if r["question_id"] == question["id"]),
                {"text": "No response recorded"}
            )
            feedback = next(
                (f for f in feedback_list if f["question_id"] == question["id"]),
                {"text": "No feedback available"}
            )
            
            question_response_feedback.append({
                "question": question["text"],
                "response": response["text"],
                "feedback": feedback["text"]
            })
        
        overall_evaluation = score_crew.kickoff(inputs={"data": question_response_feedback})
        session["score"] = overall_evaluation.get("score", 0)
        session["evaluation"] = overall_evaluation
        
        return JSONResponse(content={
            "status": "completed",
            "feedback": feedback_list,
            "score": session["score"],
            "evaluation": overall_evaluation
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing interview: {str(e)}")

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