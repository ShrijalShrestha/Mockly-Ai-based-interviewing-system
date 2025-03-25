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
    goal="Craft well-structured, relevant interview questions tailored to the candidate's background and expertise.",
    backstory="With years of experience in technical hiring, you have a deep understanding of industry trends and the skills required for success. You create engaging and insightful questions that help assess a candidate's problem-solving ability, technical depth, and communication skills.",
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
    goal="Assess the overall interview performance, considering technical knowledge, problem-solving, and communication skills to determine a fair and justified final score.",
    backstory="As a lead interviewer in a panel setting, you have extensive experience evaluating candidates holistically. You ensure unbiased scoring based on structured feedback and industry standards, providing a transparent evaluation.",
    llm=llm
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
    description="""Assess the overall interview performance based on all question-response-feedback mappings.
    Data: {data}
    
    Consider:
    1. Consistency of performance across questions
    2. Depth of technical knowledge
    3. Problem-solving skills
    4. Communication effectiveness
    
    Provide a comprehensive evaluation with a justified score.""",
    expected_output="""A final evaluation containing:
    - overall_score: Numerical score (0-10)
    - technical_evaluation: Summary of technical performance
    - problem_solving_evaluation: Summary of problem-solving skills
    - communication_evaluation: Summary of communication skills
    - strengths: Key strengths demonstrated
    - improvement_areas: Key areas for improvement""",
    agent=score_evaluator,
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