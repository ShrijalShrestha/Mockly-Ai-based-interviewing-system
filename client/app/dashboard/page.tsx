"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Calendar, Clock, FileText, Plus, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { RadarGraph } from "../../components/Radar_Chart";
import { Doted_Graph } from "@/components/Doted-Graph";
import { Count_tests } from "@/components/Count-tests";

interface UserStats {
  average_score: number;
  total_time_minutes: number;
  total_interviews: number;
}

interface EvaluationScore {
  category: string;
  score: number;
}



export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [stats, setStats] = useState<UserStats>({
    average_score: 0,
    total_time_minutes: 0,
    total_interviews: 0,
  });
  const [evaluations, setEvaluations] = useState<EvaluationScore[]>([]);
  let evaluationScores: EvaluationScore[] = [];
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        
        const [statsRes, evaluationsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL}/user_stats/${user.uid}`),
          fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL}/performance_evaluations/${user.uid}`)
        ]);

        // Handle stats response
        let statsData = {
          average_score: 0,
          total_time_minutes: 0,
          total_interviews: 0
        };
        
        if (statsRes.ok) {
          const data = await statsRes.json();
          statsData = {
            average_score: data.average_score ?? 0,
            total_time_minutes: data.total_time_minutes ?? 0,
            total_interviews: data.total_interviews ?? 0
          };
        }

        // Handle evaluations response
        
        if (evaluationsRes.ok) {
          const data = await evaluationsRes.json();
          evaluationScores = data.evaluation_scores ?? [];
        }

        setStats(statsData);
        setEvaluations(evaluationScores);
        console.log("Stasts:", statsData);
        console.log("Evaluations:", evaluationScores);
      } catch (err) {
        console.error("Error fetching data:", err);
        // Reset to defaults on error
        setStats({
          average_score: 0,
          total_time_minutes: 0,
          total_interviews: 0
        });
        setEvaluations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const startNewInterview = () => {
    router.push("/upload");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>

            <Skeleton className="h-8 w-48" />

            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-8"
        >
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-6 rounded-xl border border-gray-800">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  Welcome, {user?.displayName || "User"}
                </h1>
                <p className="text-gray-400">
                  Let's prepare for your next interview
                </p>
              </div>
            </div>
            <Button
              onClick={startNewInterview}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Start New Interview
            </Button>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Total Interviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-2xl font-bold">
                    {stats?.total_interviews}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-2xl font-bold">
                    {stats?.average_score}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Total Practice Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-purple-500 mr-2" />
                  <span className="text-2xl font-bold">
                    {stats?.total_time_minutes} min
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>



          {/* Graphs */}
          <div className="flex w-full gap-4 items-stretch">
            {/* Left Section: Graph (70%) */}
            <div className="flex-[0.7]">
              <Doted_Graph userId={user?.uid} />
            </div>


            {/* Right Section: Radar & Count Tests (30%) */}
            <div className="flex-[0.3] flex flex-col gap-4 justify-between">
              <RadarGraph evaluations={evaluations}/>
              <Count_tests count={stats.total_interviews}/>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
