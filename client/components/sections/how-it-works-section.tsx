"use client"

import { motion } from "framer-motion"
import FeatureCard from "@/components/cards/feature-card"
import { Upload, Video, BarChart } from "lucide-react"

export default function HowItWorksSection() {
  return (
    <section className="py-20 bg-gray-950 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.1),transparent_70%)]"></div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-block mb-2">
            <div className="relative">
              <div className="px-3 py-1 text-sm bg-gray-900 rounded-lg border border-cyan-500/30 relative z-10">
                How It Works
              </div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-lg blur opacity-30"></div>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-400">
            Streamlined Interview Preparation
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Our AI-powered process helps you prepare for interviews with personalized feedback and adaptive learning.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Upload className="h-10 w-10 text-cyan-500" />}
            title="Upload Resume"
            description="Upload your resume and let our AI analyze your experience and skills to create tailored interview questions."
            delay={0}
          />
          <FeatureCard
            icon={<Video className="h-10 w-10 text-fuchsia-500" />}
            title="AI Interview"
            description="Engage in a realistic interview with our AI interviewer that adapts to your responses in real-time."
            delay={0.2}
          />
          <FeatureCard
            icon={<BarChart className="h-10 w-10 text-cyan-500" />}
            title="Feedback & Progress"
            description="Receive detailed feedback on your performance and track your improvement over time."
            delay={0.4}
          />
        </div>
      </div>
    </section>
  )
}

