"use client"

import { TrendingUp } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

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

interface Evaluation {
  category: string,
  score: number,
}

interface RadarGraphProps {
  evaluations: Evaluation[]
}


const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function RadarGraph({ evaluations }: RadarGraphProps) {
  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle>Mock Interview Skills Analysis</CardTitle>
        <CardDescription>
          Performance evaluation across key interview skills
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <RadarChart data={evaluations}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <PolarAngleAxis dataKey="category" />
            <PolarGrid stroke="hsl(210, 80%, 50%)" /> {/* Bluish net/grid */}
            <Radar
              dataKey="score"
              stroke="hsl(140, 80%, 40%)" /* Green stroke */
              fill="hsl(140, 80%, 60%)" /* Green fill */
              fillOpacity={0.5}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Overall Performance up by 4.8% <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2 leading-none text-muted-foreground">
          Evaluation Period: Last 6 Sessions
        </div>
      </CardFooter>
    </Card>
  )
}
