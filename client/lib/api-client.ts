/**
 * API client for interacting with the FastAPI backend
 */

// FastAPI endpoint URL - replace with your actual endpoint
const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000"

/**
 * Upload a resume file to the FastAPI backend
 * @param file The resume file to upload
 * @param userId The user ID to associate with the resume
 * @returns The response data from the API
 */
export async function uploadResume(file: File, userId: string) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("user_id", userId)

  const response = await fetch(`${FASTAPI_URL}/upload_resume`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.detail || "Failed to upload resume")
  }

  return await response.json()
}

/**
 * Start an interview session
 * @param sessionId The session ID to start
 * @returns The response data from the API
 */
export async function startInterview(sessionId: string) {
  const response = await fetch(`${FASTAPI_URL}/start-interview/${sessionId}`, {
    method: "POST",
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.detail || "Failed to start interview")
  }

  return await response.json()
}

