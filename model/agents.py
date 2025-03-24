from crewai import Crew, Task, Agent
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from dotenv import load_dotenv

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    verbose=False,
    temperature=0.5,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)

# Agent for generating structured interview questions
question_generator = Agent(
    role="Interview Question Generator",
    goal="Generate structured interview questions with unique identifiers based on the resume",
    backstory="You specialize in crafting technical and behavioral interview questions.",
    llm=llm
)

# Agent for analyzing responses and providing structured feedback
response_analyzer = Agent(
    role="Response Evaluator",
    goal="Analyze each response, map it to its question, and provide detailed feedback",
    backstory="You evaluate responses based on relevance, clarity, and technical correctness.",
    llm=llm
)

# Agent for computing the final score based on all feedback
score_evaluator = Agent(
    role="Final Score Evaluator",
    goal="Generate a final interview score out of 10 based on the responses and feedback",
    backstory="You assess the overall performance in problem-solving, communication, and domain knowledge.",
    llm=llm
)

# Task to generate structured interview questions
prepare_questions = Task(
    description="Generate a list of 5 interview questions with unique IDs based on the resume {data}.",
    expected_output="A JSON list of questions with unique IDs.",
    agent=question_generator,
)

# Task to analyze each response and provide feedback
analyze_responses = Task(
    description="Analyze responses by mapping them to their respective questions {data} and generate structured feedback.",
    expected_output="A list of question-response-feedback mappings.",
    agent=response_analyzer,
)

# Task to evaluate the final score based on all responses and feedback
evaluate_interview = Task(
    description="Evaluate the candidate's overall performance and assign a score out of 10 based on question-response-feedback mappings {data}.",
    expected_output="A final interview score with evaluation breakdown.",
    agent=score_evaluator,
)

# Crews to handle question generation, response analysis, and final evaluation
question_crew = Crew(
    agents=[question_generator],
    tasks=[prepare_questions],
)

response_crew = Crew(
    agents=[response_analyzer],
    tasks=[analyze_responses],
)

score_crew = Crew(
    agents=[score_evaluator],
    tasks=[evaluate_interview],
)
