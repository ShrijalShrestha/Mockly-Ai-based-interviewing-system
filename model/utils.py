import fitz
import re
import json
import uuid
from fastapi import UploadFile, HTTPException
from config import logger
from typing import List

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

def generate_session_id() -> str:
    """Generate a unique session ID."""
    return str(uuid.uuid4())

def generate_question_id() -> str:
    """Generate a unique question ID."""
    return str(uuid.uuid4())
