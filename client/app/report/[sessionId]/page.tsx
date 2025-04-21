"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

// Define types for the interview data
interface Question {
  id: string
  text: string
}

interface Answer {
  question_id: string
  text: string
}

interface FeedbackItem {
  question_id: string
  text: string
}

interface ScoreBreakdown {
  "technical skill": number
  "problem solving": number
  communication: number
  knowledge: number
}

interface Evaluation {
  score: number
  breakdown: ScoreBreakdown
  strengths: string[]
  improvement_areas: string[]
}

interface InterviewSession {
  user_id: string
  session_id: string
  questions: Question[]
  responses: Answer[]
  feedback: FeedbackItem[]
  score: number
  evaluation: Evaluation
  completed: boolean
  timestamp: string
}

export default function InterviewReportPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [interviewData, setInterviewData] = useState<InterviewSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInterviewData() {
      if (!user) {
        setLoading(false)
        setError("You must be logged in to view this page")
        return
      }

      try {
        // Fetch all interviews for the user
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000"}/get_mock_interview/${user.uid}`
        )

        if (!response.ok) {
          throw new Error(`Error fetching interview data: ${response.statusText}`)
        }

        const data = await response.json()
        
        // Find the specific interview by sessionId
        const interview = data.mock_interviews.find(
          (interview: InterviewSession) => interview.session_id === sessionId
        )

        if (!interview) {
          throw new Error("Interview session not found")
        }

        setInterviewData(interview)
        setLoading(false)
      } catch (error: any) {
        console.error("Error fetching interview data:", error)
        setError(error.message || "Failed to load interview data")
        setLoading(false)
      }
    }

    fetchInterviewData()
  }, [user, sessionId])

  // Helper function to find question text by ID
  const getQuestionById = (questionId: string): string => {
    if (!interviewData) return "Question not found"
    const question = interviewData.questions.find(q => q.id === questionId)
    return question ? question.text : "Question not found"
  }

  // Helper function to find answer by question ID
  const getAnswerByQuestionId = (questionId: string): string => {
    if (!interviewData) return "No answer provided"
    const answer = interviewData.responses.find(r => r.question_id === questionId)
    return answer ? answer.text : "No answer provided"
  }

  // Helper function to find feedback by question ID
  const getFeedbackByQuestionId = (questionId: string): string => {
    if (!interviewData) return "No feedback available"
    const feedback = interviewData.feedback.find(f => f.question_id === questionId)
    return feedback ? feedback.text : "No feedback available"
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-[300px] mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
        <Skeleton className="h-[400px] w-full mt-6 rounded-md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center">
              <AlertCircle className="mr-2" size={20} />
              Error Loading Interview Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!interviewData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Interview Report Not Found</CardTitle>
            <CardDescription>The requested interview report could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Interview Report</h1>
            <p className="text-gray-500 mt-2">
              Session ID: {interviewData.session_id}
            </p>
          </div>
        </div>

        {/* Overall Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Overall Score</CardTitle>
              <CardDescription>Your interview performance score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold">{interviewData.score.toFixed(1)}</span>
                <Progress value={interviewData.score * 10} className="w-3/4" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Score out of 10 points
              </p>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Score Breakdown</CardTitle>
              <CardDescription>Performance across different categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Technical Skill</span>
                  <span>{interviewData.evaluation.breakdown["technical skill"].toFixed(1)}/10</span>
                </div>
                <Progress value={interviewData.evaluation.breakdown["technical skill"] * 10} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Problem Solving</span>
                  <span>{interviewData.evaluation.breakdown["problem solving"].toFixed(1)}/10</span>
                </div>
                <Progress value={interviewData.evaluation.breakdown["problem solving"] * 10} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Communication</span>
                  <span>{interviewData.evaluation.breakdown.communication.toFixed(1)}/10</span>
                </div>
                <Progress value={interviewData.evaluation.breakdown.communication * 10} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Knowledge</span>
                  <span>{interviewData.evaluation.breakdown.knowledge.toFixed(1)}/10</span>
                </div>
                <Progress value={interviewData.evaluation.breakdown.knowledge * 10} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 text-green-500" size={20} />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2">
                {interviewData.evaluation.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <XCircle className="mr-2 text-orange-500" size={20} />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2">
                {interviewData.evaluation.improvement_areas.map((area, index) => (
                  <li key={index}>{area}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Question and Answer Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Question and Answer Analysis</CardTitle>
            <CardDescription>
              Detailed breakdown of your responses and AI feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {interviewData.questions.map((question, index) => {
                const answer = getAnswerByQuestionId(question.id)
                const feedback = getFeedbackByQuestionId(question.id)
                
                return (
                  <AccordionItem key={question.id} value={question.id}>
                    <AccordionTrigger className="text-left">
                      <div>
                        <span className="font-medium">Question {index + 1}:</span> {question.text}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div>
                        <Badge className="mb-2">Your Answer</Badge>
                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                          {answer || "No answer provided"}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <Badge variant="outline" className="mb-2">Feedback</Badge>
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md text-sm">
                          {feedback || "No feedback available"}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 