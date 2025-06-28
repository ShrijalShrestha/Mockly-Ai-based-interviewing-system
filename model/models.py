from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime

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
