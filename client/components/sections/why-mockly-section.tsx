"use client"

import { motion } from "framer-motion"
import { Sparkles, Code, BarChart, Zap } from "lucide-react"
import AnimatedRadarChart from "@/components/animations/animated-radar-chart"

export default function WhyMocklySection() {
  return (
    <section className="py-20 bg-gray-950 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,0,255,0.1),transparent_70%)]"></div>

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
              <div className="px-3 py-1 text-sm bg-gray-900 rounded-lg border border-fuchsia-500/30 relative z-10">
                Why Mockly
              </div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-lg blur opacity-30"></div>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">
            Unique Advantages
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Our platform offers unique advantages to help you succeed in your interviews.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="order-2 lg:order-1">
            <AnimatedRadarChart />
          </div>

          <div className="space-y-6 order-1 lg:order-2">
            {[
              {
                icon: <Sparkles className="h-5 w-5 text-cyan-400" />,
                title: "Personalized AI-driven feedback",
                description:
                  "Receive tailored feedback based on industry standards and best practices for your specific role.",
              },
              {
                icon: <Code className="h-5 w-5 text-fuchsia-400" />,
                title: "Resume-based tailored questions",
                description:
                  "Our AI analyzes your resume to create relevant questions that match your experience and the job you're applying for.",
              },
              {
                icon: <BarChart className="h-5 w-5 text-cyan-400" />,
                title: "Progress tracking dashboard",
                description: "Monitor your improvement over time with detailed metrics and performance indicators.",
              },
              {
                icon: <Zap className="h-5 w-5 text-fuchsia-400" />,
                title: "Adaptive & interactive learning",
                description:
                  "Our system adapts to your strengths and weaknesses, focusing on areas that need improvement.",
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex gap-4 p-6 bg-gray-900 rounded-xl border border-gray-800 hover:border-cyan-500/30 transition-all duration-300 group"
              >
                <div className="flex-shrink-0 mt-1 bg-gray-800 p-2 rounded-lg group-hover:bg-gray-800/80 group-hover:shadow-[0_0_10px_rgba(0,255,255,0.2)] transition-all duration-300">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-cyan-400 transition-colors duration-300">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-400">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

