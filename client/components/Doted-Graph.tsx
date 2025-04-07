"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { CartesianGrid, LabelList, Line, LineChart, XAxis, ResponsiveContainer, Tooltip } from "recharts"
import { useState, useEffect } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

// Chart configuration
const chartConfig = {
  score: {
    label: "Interview Score",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

interface TestScore {
  test_number: number
  session_id: string
  score: number
  timestamp: string
}

interface DotedGraphProps {
  userId: string
}

export function Doted_Graph({ userId }: DotedGraphProps) {
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])
  const [trendPercentage, setTrendPercentage] = useState(0)
  const [trendingUp, setTrendingUp] = useState(true)
  const [totalTests, setTotalTests] = useState(0)

  useEffect(() => {
    const fetchTestScores = async () => {
      if (!userId) return

      try {
        setLoading(true)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000"}/test_scores/${userId}`
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch test scores: ${response.status}`)
        }

        const data = await response.json()
        console.log("Test scores data:", data)

        // Format data for chart
        const formattedData = data.test_scores.map((item: TestScore) => ({
          test: `Test ${item.test_number}`,
          score: item.score,
          timestamp: item.timestamp,
        }))

        setTotalTests(data.total_tests)
        setChartData(formattedData)

        // Calculate trend (last test vs second-to-last test)
        if (formattedData.length >= 2) {
          const currentTest = formattedData[formattedData.length - 1].score || 0
          const previousTest = formattedData[formattedData.length - 2].score || 1 // Avoid division by zero
          
          const changePercent = ((currentTest - previousTest) / previousTest) * 100
          setTrendPercentage(Math.abs(Math.round(changePercent * 10) / 10))
          setTrendingUp(changePercent >= 0)
        }
      } catch (error) {
        console.error("Error fetching test scores:", error)
        // Set empty data on error
        setChartData([])
      } finally {
        setLoading(false)
      }
    }

    fetchTestScores()
  }, [userId])

  // Show loading skeleton while data is being fetched
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-4 w-full" />
        </CardFooter>
      </Card>
    )
  }

  // Show empty state if no data
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Test Performance</CardTitle>
          <CardDescription>No interview data available</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[200px] text-gray-500">
          Complete interviews to see your performance trends
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Performance</CardTitle>
        <CardDescription>
          {`Showing scores for your ${totalTests} ${totalTests === 1 ? 'interview' : 'interviews'}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="test"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent 
                  indicator="line" 
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}`, 
                    "Score"
                  ]}
                />
              }
            />
            <Line
              dataKey="score"
              type="monotone"
              stroke="#3b82f6" // Line color set to blue
              strokeWidth={2}
              dot={{
                fill: "#3b82f6", // Dots colored blue
                r: 4,
              }}
              activeDot={{
                r: 6,
                fill: "#2563eb", // Active dot darker blue
              }}
            >
              <LabelList
                dataKey="score"
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
                formatter={(value: number) => (value ? value.toFixed(1) : "0")}
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {chartData.length >= 2 && (
          <div className="flex gap-2 font-medium leading-none">
            {trendingUp ? (
              <>Improved by {trendPercentage}% in your latest test <TrendingUp className="h-4 w-4 text-green-500" /></>
            ) : (
              <>Decreased by {trendPercentage}% in your latest test <TrendingDown className="h-4 w-4 text-red-500" /></>
            )}
          </div>
        )}
        <div className="leading-none text-muted-foreground">
          Tracking your interview performance over time
        </div>
      </CardFooter>
    </Card>
  )
}
