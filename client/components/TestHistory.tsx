"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, ArrowRight, AlertCircle } from "lucide-react"
import { format } from "date-fns"

interface TestScore {
  test_number: number
  session_id: string
  score: number
  timestamp: string
}

interface TestScoresData {
  user_id: string
  total_tests: number
  test_scores: TestScore[]
}

export function TestHistory({ userId }: { userId: string }) {
  const [testScores, setTestScores] = useState<TestScoresData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchTestScores = async () => {
      if (!userId) return
      
      try {
        setLoading(true)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000"}/test_scores/${userId}`
        )

        if (!response.ok) {
          throw new Error(`Error fetching test scores: ${response.statusText}`)
        }

        const data = await response.json()
        setTestScores(data)
      } catch (err: any) {
        console.error("Error fetching test scores:", err)
        setError(err.message || "Failed to load test scores")
      } finally {
        setLoading(false)
      }
    }

    fetchTestScores()
  }, [userId])

  const formatDate = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "MMM d, yyyy • h:mm a")
    } catch (e) {
      return "Invalid date"
    }
  }

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Recent Interview Sessions</CardTitle>
          <CardDescription>View your past interview sessions and reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
            Error Loading Test History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!testScores || testScores.total_tests === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Recent Interview Sessions</CardTitle>
          <CardDescription>View your past interview sessions and reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="text-gray-400 mb-4">You haven't completed any interview sessions yet.</p>
            <Button
              onClick={() => router.push("/upload")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Start Your First Interview
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle>Recent Interview Sessions</CardTitle>
        <CardDescription>View your past interview sessions and reports</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {testScores.test_scores.map((test) => (
          <div
            key={test.session_id}
            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-900/30 border border-blue-700/50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Interview #{test.test_number}</p>
                <p className="text-sm text-gray-400">{formatDate(test.timestamp)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-bold text-lg">{test.score.toFixed(1)}</p>
                <p className="text-xs text-gray-400">Score</p>
              </div>
              <Link href={`/report/${test.session_id}`}>
                <Button size="sm" variant="ghost" className="h-8 gap-1">
                  View
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
} 