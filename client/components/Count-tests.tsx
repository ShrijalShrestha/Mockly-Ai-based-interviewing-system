"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

export function Count_tests({count}: { count: number }) {
  const [testCount, setTestCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Move state updates to useEffect
  useEffect(() => {
    setTestCount(count);
    setLoading(false);
  }, [count]); // Only run when count prop changes
  
  const chartData = [{ browser: "chrome", visitors: testCount, fill: "red" }];

  const chartConfig = {
    visitors: { label: "Visitors" },
    safari: { label: "Safari", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Test Count</CardTitle>
        {/* <CardDescription>January - June 2024</CardDescription> */}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={0}
            endAngle={250}
            innerRadius={80}
            outerRadius={110}
          >
            <PolarGrid gridType="circle" radialLines={false} stroke="blue" />
            <RadialBar dataKey="visitors" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-4xl font-bold"
                        >
                          {loading ? "..." : testCount.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Tests Taken
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
  <div className="flex items-center gap-2 font-medium leading-none">
    {testCount > 1000 ? (
      <>
        High engagement this period! <TrendingUp className="h-4 w-4 text-green-500" />
      </>
    ) : (
      <>
        Growing steadily! <TrendingUp className="h-4 w-4 text-yellow-500" />
      </>
    )}
  </div>
  <div className="leading-none text-muted-foreground">
    {loading
      ? "Fetching test data..."
      : `A total of ${testCount.toLocaleString()} tests taken over the last 6 months.`}
  </div>
</CardFooter>

    </Card>
  );
}
