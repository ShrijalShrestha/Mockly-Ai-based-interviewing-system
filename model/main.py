from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import whisper
import fitz
import os
import re
from pymongo import MongoClient
import json

import warnings
warnings.simplefilter("ignore", category=FutureWarning)

from dotenv import load_dotenv
from agents import question_crew, response_crew, score_crew

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client.ai_interview
collection = db.mock_interviews

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResumeRequest(BaseModel):
    resume_text: str

class MockInterview(BaseModel):
    user_id: str
    questions: list[str]
    responses: list[dict]
    feedback: list[dict]
    total_time: float
    score: float
    evaluation: dict  

def extract_resume_text(pdf_file):
    doc = fitz.open(pdf_file)
    text = "".join(page.get_text() for page in doc)
    cleaned_text = re.sub(r'[^\w\s,.|:/-]', '', text)
    
    # Remove multiple spaces and newlines
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
    
    return cleaned_text

@app.post("/upload_resume/")
async def upload_resume(file: UploadFile = File(...)):
    temp_file_path = f"temp/{file.filename}"
    os.makedirs("temp", exist_ok=True)

    with open(temp_file_path, "wb") as temp_file:
        temp_file.write(await file.read())

    resume_text = extract_resume_text(temp_file_path)
    os.remove(temp_file_path)

    return {"parsed_data": resume_text}


@app.post("/generate_questions/")
async def generate_questions(request: ResumeRequest):
    if not request.resume_text:
        raise HTTPException(status_code=400, detail="Resume text is required")

    try:
        result = question_crew.kickoff(inputs={"data": request.resume_text})
        print("Crew Result (Raw):", repr(result))  # Debugging log

        # Remove triple backticks and `json` prefix if present
        if result.startswith("```json"):
            result = result[7:-4].strip()  # Remove first 7 chars (```json\n) and last 4 (```\n)
        
        questions_data = json.loads(result)  # Safe JSON parsing
        
        if isinstance(questions_data, list):
            questions_list = [q.get("question", "No question generated") for q in questions_data]
            return {"questions": questions_list}

        raise ValueError("Unexpected AI response format")

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Error parsing AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    
@app.post("/process_audio/")
async def process_audio(file: UploadFile = File(...)):
    model = whisper.load_model("base")
    temp_audio_path = f"temp/{file.filename}"
    
    with open(temp_audio_path, "wb") as temp_audio:
        temp_audio.write(await file.read())

    transcription = model.transcribe(temp_audio_path)["text"]
    os.remove(temp_audio_path)

    evaluation = response_crew.kickoff(inputs={"data": transcription})
    return JSONResponse(content={"transcription": transcription, "evaluation": evaluation})

@app.post("/save_mock_interview/")
async def save_mock_interview(mock: MockInterview):
    question_response_feedback = []
    for response in mock.responses:
        question_id = response["question_id"]
        question_text = next((q["text"] for q in mock.questions if q["id"] == question_id), None)
        feedback_text = next((f["text"] for f in mock.feedback if f["question_id"] == question_id), "No feedback available")
        
        question_response_feedback.append({
            "question": question_text,
            "response": response["text"],
            "feedback": feedback_text
        })

    evaluation = score_crew.kickoff(inputs={"data": question_response_feedback})
    score = evaluation.get("score", 0)

    result = collection.insert_one({
        "user_id": mock.user_id,
        "questions": mock.questions,
        "responses": mock.responses,
        "feedback": mock.feedback,
        "total_time": mock.total_time,
        "score": score,
        "evaluation": evaluation
    })

    return {"message": "Mock interview saved successfully", "id": str(result.inserted_id), "score": score}

@app.get("/get_mock_interview/{user_id}")
async def get_mock_interview(user_id: str):
    mock_interviews = list(collection.find({"user_id": user_id}, {"_id": 0}))
    return {"mock_interviews": mock_interviews}

@app.get("/")
def root():
    return {"message": "AI Interview System is running!"}
