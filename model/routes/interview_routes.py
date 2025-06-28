from fastapi import APIRouter, HTTPException, Body
from datetime import datetime
import json
import logging

from agents import response_crew, score_crew
from mongo_connect import collection, mongo_errors
from shared_state import user_sessions

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

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

@router.post("/process_interview_responses/{user_id}/{session_id}", response_model=dict)
async def process_interview_responses(
    user_id: str,
    session_id: str,
    interview_data: dict = Body(...)
):
    """Process user responses and generate feedback."""
    try:
        # Log the received data for debugging
        logger.info(f"Processing interview responses for user {user_id}, session {session_id}")
        logger.info(f"Received interview data: {json.dumps(interview_data, default=str)}")
        
        # Get interview data
        try:
            stored_interview_data = collection.find_one(
                {"user_id": user_id, "session_id": session_id}
            )
        except Exception as e:
            logger.error(f"Database query failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Database error")

        if not stored_interview_data:
            logger.error(f"Interview data not found for user {user_id}, session {session_id}")
            raise HTTPException(status_code=404, detail="Interview data not found")
        
        # Extract responses from the frontend format
        responses_from_frontend = interview_data.get("responses", [])
        
        logger.info(f"Extracted {len(responses_from_frontend)} responses from the frontend data")
        
        if not responses_from_frontend:
            logger.warning("No responses provided in the request body")
            raise HTTPException(status_code=400, detail="No responses provided")
            
        # Process responses
        feedback_list = []
        responses_to_store = []
        question_response_pairs = []

        for i, response_item in enumerate(responses_from_frontend):
            question_id = response_item.get("questionId")
            answer_text = response_item.get("answer")
            
            logger.info(f"Processing response {i+1}/{len(responses_from_frontend)}: questionId={question_id}")
            
            if not question_id or not answer_text:
                logger.warning(f"Skipping response with missing questionId or answer: {response_item}")
                continue
                
            question = next(
                (q for q in stored_interview_data["questions"] if q["id"] == question_id),
                None
            )
            if not question:
                logger.warning(f"Question ID {question_id} not found in stored questions")
                continue

            try:
                logger.info(f"Generating feedback for question: {question['text']}")
                evaluation = response_crew.kickoff(inputs={
                    "question": question["text"],
                    "response": answer_text
                })
                logger.info(f"Successfully generated feedback")
            except Exception as e:
                logger.error(f"Feedback generation failed: {str(e)}")
                evaluation = "Could not generate feedback"

            responses_to_store.append({
                "question_id": question_id,
                "text": answer_text
            })
            
            feedback_list.append({
                "question_id": question_id,
                "text": evaluation
            })
            
            question_response_pairs.append({
                "question": question["text"],
                "response": answer_text,
                "feedback": evaluation
            })

        logger.info(f"Processed {len(question_response_pairs)} valid question-response pairs")
        
        valid_pairs = [
            pair for pair in question_response_pairs 
            if pair["feedback"] and "Could not generate feedback" not in pair["feedback"]
        ]

        logger.info(f"Found {len(valid_pairs)} valid pairs for overall evaluation")
        
        if not valid_pairs:
            logger.error("No valid responses available for evaluation")
            raise HTTPException(
                status_code=400,
                detail="No valid responses available for evaluation"
            )

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
            logger.info(f"Updating database with interview results")
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
                logger.warning(f"No documents modified when updating interview data for user {user_id}, session {session_id}")
                if collection.count_documents({"user_id": user_id, "session_id": session_id}) == 0:
                    logger.error(f"Interview data not found for update")
                    raise HTTPException(status_code=404, detail="Interview data not found for update")
                else:
                    logger.info("Document exists but no changes were made. Continuing normally.")
            else:
                logger.info(f"Successfully updated interview data in database")
        except Exception as e:
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
            logger.info(f"Updated in-memory session data")

        logger.info(f"Successfully completed interview processing")
        return {
            "status": "completed",
            "feedback": feedback_list,
            "score": score,
            "evaluation": overall_evaluation
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in process_interview_responses: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
