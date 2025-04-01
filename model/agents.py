from crewai import Crew, Task, Agent
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from dotenv import load_dotenv

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    verbose=False,
    temperature=0.7,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)

# Agent for generating structured interview questions
question_generator = Agent(
    role="Senior Technical Recruiter",
    goal="Generate concise, relevant technical interview questions based on the candidate's background",
    backstory="An experienced recruiter who knows how to ask precise questions that effectively evaluate technical skills without being verbose.",
    llm=llm
)

# Agent for analyzing responses and providing structured feedback
response_analyzer = Agent(
    role="Seasoned Hiring Manager",
    goal="Evaluate candidate responses with detailed feedback on technical accuracy, problem-solving approach, and communication skills.",
    backstory="As an experienced hiring manager, you have assessed numerous candidates across various technical domains. You provide constructive and professional feedback, highlighting strengths and areas for improvement, ensuring a fair and comprehensive evaluation.",
    llm=llm
)

# Agent for computing the final score based on all feedback
score_evaluator = Agent(
    role="Panel Lead Interviewer",
    goal="Calculate final interview scores and provide comprehensive evaluation with improvement areas.",
    backstory="As a lead interviewer in a panel setting, you have extensive experience evaluating candidates holistically.",
    llm=llm,
    # format="json"
)

# Task to generate structured interview questions
prepare_questions = Task(
    description="Review the candidate's resume {data} and generate a set of 5 well-structured, job-relevant interview questions, each with a unique identifier.",
    expected_output="A JSON list of insightful and relevant interview questions with unique IDs.",
    agent=question_generator,
)

# Task to analyze each response and provide feedback
analyze_response = Task(
    description="""Evaluate the candidate's response to a specific interview question.
    Question: {question}
    Response: {response}
    
    Provide detailed feedback on:
    1. Technical accuracy (if applicable)
    2. Problem-solving approach
    3. Communication clarity
    4. Overall effectiveness
    
    Highlight both strengths and areas for improvement.""",
    expected_output="""A structured feedback object containing:
    - question_id: The ID of the question being evaluated
    - technical_feedback: Evaluation of technical aspects
    - problem_solving_feedback: Evaluation of problem-solving approach
    - communication_feedback: Evaluation of communication skills
    - overall_feedback: Summary evaluation with suggestions for improvement""",
    agent=response_analyzer,
)

# Task to evaluate the final score based on all responses and feedback
evaluate_interview = Task(
    description="""Calculate final interview scores based on interview responses.
    
    You will receive interview data in JSON format containing question-response pairs.
    Analyze each response and provide a comprehensive evaluation.
    
    The input data will be in this format:
    {interview_data}
    
    Return ONLY a JSON object with these exact fields:
    - overall_score (float between 0-10)
    - score_breakdown (object with these exact keys: 
        "technical skill", "problem solving", "communication", "knowledge")
    - strengths (array of strings)
    - improvement_areas (array of strings)
    
    Example output:
    {{
        "overall_score": 7.5,
        "score_breakdown": {{
            "technical skill": 8.0,
            "problem solving": 7.0,
            "communication": 7.5,
            "knowledge": 8.5
        }},
        "strengths": ["Good technical knowledge", "Clear communication"],
        "improvement_areas": ["Problem-solving structure", "Depth of examples"]
    }}""",
    expected_output="A JSON object with overall_score, score_breakdown, strengths, and improvement_areas",
    agent=score_evaluator
)

# Crews to handle question generation, response analysis, and final evaluation
question_crew = Crew(
    agents=[question_generator],
    tasks=[prepare_questions],
)

response_crew = Crew(
    agents=[response_analyzer],
    tasks=[analyze_response],
)

score_crew = Crew(
    agents=[score_evaluator],
    tasks=[evaluate_interview],
)