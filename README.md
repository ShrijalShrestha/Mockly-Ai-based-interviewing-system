# Mockly - AI-based Interviewing System

Mockly is an advanced AI-powered interviewing platform designed to help job seekers practice and improve their interview skills through simulated technical interviews with detailed feedback and analysis.

![Mockly](client/public/mockly-logo.png)

## Features

### For Candidates
- **Resume Analysis**: Upload your resume and get customized interview questions based on your experience and skills
- **AI-Powered Interviews**: Engage in realistic technical interview sessions with AI that adapts to your responses
- **Comprehensive Feedback**: Receive detailed feedback on:
  - Technical accuracy
  - Problem-solving approach
  - Communication skills
  - Overall performance
- **Performance Tracking**: Monitor your progress over time with detailed analytics and performance metrics
- **Improvement Suggestions**: Get actionable recommendations to enhance your interview skills

### Technical Features
- **AI-Powered Question Generation**: Uses Google's Gemini 1.5 to generate tailored questions based on resume content
- **Multi-Agent Evaluation System**: Three specialized AI agents handle different aspects of the interview process:
  - Senior Technical Recruiter: Generates relevant technical questions
  - Seasoned Hiring Manager: Evaluates responses and provides feedback
  - Panel Lead Interviewer: Calculates final scores and provides comprehensive evaluation
- **Performance Analytics**: Visualize your improvement over time through comprehensive dashboards
- **Session Recording**: Review past interviews to track your progress

## Technology Stack

### Frontend
- Next.js 15.1.0
- React 19
- TypeScript
- Tailwind CSS
- Shadcn UI Components
- Recharts for data visualization

### Backend
- FastAPI
- MongoDB
- Python 3.10+
- LangChain for AI orchestration
- Google Gemini 1.5 for LLM capabilities
- PyMuPDF for resume parsing

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- MongoDB
- Google API key for Gemini access

### Installation

#### Backend Setup
1. Clone the repository
   ```bash
   git clone https://github.com/your-username/Movkly-Ai-based-interviewing-.git
   cd Movkly-Ai-based-interviewing-
   ```

2. Create and activate a virtual environment
   ```bash
   python -m venv myenv
   # On Windows
   myenv\Scripts\activate
   # On MacOS/Linux
   source myenv/bin/activate
   ```

3. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables
   - Create a `.env` file in the root directory with:
   ```
   GOOGLE_API_KEY=your_google_api_key
   MONGO_URI=your_mongodb_uri
   ```

5. Start the backend server
   ```bash
   cd model
   uvicorn main:app --reload
   ```

#### Frontend Setup
1. Navigate to the client directory
   ```bash
   cd client
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables
   - Create a `.env` file in the client directory with:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Sign Up/Login**: Create an account or log in to access the platform
2. **Upload Resume**: Upload your PDF resume for analysis
3. **Start Interview**: Begin a mock interview session with AI-generated questions
4. **Answer Questions**: Respond to each question as you would in a real interview
5. **Receive Feedback**: Get detailed feedback on your performance after completing the interview
6. **Track Progress**: View your performance analytics in the dashboard to track improvement

## Project Structure
```
├── client/                 # Frontend Next.js application
│   ├── app/                # Next.js app directory
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── interview/      # Interview session pages
│   │   ├── login/          # Authentication pages
│   │   └── signup/         # User registration
│   ├── components/         # Reusable React components
│   ├── context/            # React context for state management
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── public/             # Static assets
│   ├── styles/             # Global styles
│   └── types/              # TypeScript type definitions
├── model/                  # Backend FastAPI application
│   ├── agents.py           # AI agent definitions
│   ├── main.py             # API endpoints and business logic
│   └── temp/               # Temporary file storage
└── requirements.txt        # Python dependencies
```

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements
- [LangChain](https://www.langchain.com/) for AI orchestration
- [Google Gemini](https://ai.google.dev/) for powerful language model capabilities
- [Next.js](https://nextjs.org/) for the frontend framework
- [FastAPI](https://fastapi.tiangolo.com/) for the backend API
