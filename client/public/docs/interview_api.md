# Mockly Interview API Documentation

## Submit Interview Responses

This endpoint processes all user responses for an interview session and generates AI feedback.

### Endpoint

```
POST /process_interview_responses/{user_id}/{session_id}
```

### Path Parameters

- `user_id`: The unique identifier for the user
- `session_id`: The unique identifier for the interview session

### Request Body

The request body must be a JSON object with the following structure:

```json
{
  "userId": "user123",
  "sessionId": "session456",
  "responses": [
    {
      "questionId": "question789",
      "answer": "This is my answer to the question"
    },
    {
      "questionId": "question012",
      "answer": "This is my answer to another question"
    }
  ]
}
```

#### Required Fields

- `userId`: String - Must match the user_id in the URL path
- `sessionId`: String - Must match the session_id in the URL path
- `responses`: Array - Collection of question-answer pairs
  - Each response object must contain:
    - `questionId`: String - Must match an ID from the questions provided earlier
    - `answer`: String - The user's answer to the question

### Response

A successful response will have the following structure:

```json
{
  "status": "completed",
  "feedback": [
    {
      "question_id": "question789",
      "text": "Detailed feedback on your answer..."
    },
    {
      "question_id": "question012",
      "text": "Detailed feedback on your answer..."
    }
  ],
  "score": 8.5,
  "evaluation": {
    "score": 8.5,
    "breakdown": {
      "technical skill": 8,
      "problem solving": 9,
      "communication": 8,
      "knowledge": 9
    },
    "strengths": [
      "Clear communication",
      "Technical accuracy"
    ],
    "improvement_areas": [
      "Could provide more examples",
      "More detail in problem-solving approach"
    ]
  }
}
```

### Error Responses

- `400 Bad Request`: Invalid request format or missing required fields
- `404 Not Found`: User ID or session ID not found
- `500 Internal Server Error`: Server-side processing issues

### Example Usage in JavaScript/TypeScript

```javascript
const completeInterview = async () => {
  if (!user) return;

  try {
    // Format the interview data according to the API requirements
    const interviewData = {
      userId: user.uid,
      sessionId: sessionId,
      responses: responses.map(r => ({
        questionId: r.questionId,
        answer: r.answer
      }))
    };

    const response = await fetch(
      `${apiBaseUrl}/process_interview_responses/${user.uid}/${sessionId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(interviewData),
      }
    );

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("Interview completed successfully with score:", data.score);
  } catch (error) {
    console.error("Error completing interview:", error);
  }
};
``` 