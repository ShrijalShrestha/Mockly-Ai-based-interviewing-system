import json
import uuid
from fastapi import HTTPException
from config import logger
from utils import clean_json_output
from agents import question_crew, response_crew, score_crew
from typing import List

class AIService:
    @staticmethod
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

    @staticmethod
    def generate_feedback(question: str, answer: str) -> str:
        """Generate feedback for a question-answer pair."""
        try:
            logger.info(f"Generating feedback for question: {question}")
            evaluation = response_crew.kickoff(inputs={
                "question": question,
                "response": answer
            })
            logger.info("Successfully generated feedback")
            return evaluation
        except Exception as e:
            logger.error(f"Feedback generation failed: {str(e)}")
            return "Could not generate feedback"

    @staticmethod
    def generate_overall_evaluation(question_response_pairs: List[dict], user_id: str, session_id: str) -> dict:
        """Generate overall evaluation and scoring."""
        try:
            evaluation_input = {
                "interview_data": json.dumps({
                    "pairs": question_response_pairs,
                    "metadata": {
                        "user_id": user_id,
                        "session_id": session_id
                    }
                })
            }
            
            logger.info("Generating overall evaluation score")
            evaluation_output = score_crew.kickoff(inputs=evaluation_input)
            logger.debug(f"Raw evaluation output: {evaluation_output}")
            
            # Handle case where output might be a string or dict
            if isinstance(evaluation_output, str):
                overall_evaluation = clean_json_output(evaluation_output)
            else:
                overall_evaluation = evaluation_output
                
            if not isinstance(overall_evaluation, dict):
                logger.error(f"Evaluation output is not a valid dictionary: {overall_evaluation}")
                raise ValueError("Evaluation output is not a valid dictionary")
                
            score = overall_evaluation.get("overall_score", 0)
            logger.info(f"Generated overall score: {score}")
            
            # Standardize the evaluation structure
            return {
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
            return {"error": f"Evaluation generation failed: {str(e)}"}

# Global AI service instance
ai_service = AIService()
