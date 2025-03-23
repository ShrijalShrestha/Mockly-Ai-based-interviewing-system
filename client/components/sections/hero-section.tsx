"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import ParticleCanvas from "@/components/animations/particle-canvas"
import GridBackground from "@/components/animations/grid-background"
import AnimatedWave from "@/components/animations/animated-wave"
import AnimatedTerminal from "@/components/animations/animated-terminal"

interface HeroSectionProps {
  isHovered: boolean
  setIsHovered: (isHovered: boolean) => void
}

export default function HeroSection({ isHovered, setIsHovered }: HeroSectionProps) {
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  return (
    <section className="relative py-20 md:py-32 px-4 overflow-hidden">
      <ParticleCanvas />
      <GridBackground />
      <AnimatedWave />

      <div className="container mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" variants={staggerChildren} className="space-y-6">
            <motion.h1 variants={fadeIn} className="text-4xl md:text-6xl font-bold">
              Ace Your Next Interview with{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500 relative">
                AI-Powered
                <motion.span
                  className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 blur opacity-30"
                  animate={{
                    opacity: [0.2, 0.5, 0.2],
                  }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                />
              </span>{" "}
              Mock Sessions
            </motion.h1>

            <motion.p variants={fadeIn} className="text-lg md:text-xl text-gray-300">
              Get real-time feedback and personalized insights based on your resume. Practice, improve, and track your
              progress with AI-driven coaching.
            </motion.p>

            <motion.div variants={fadeIn}>
              <Link href="/signup">
                <Button
                  size="lg"
                  className="relative bg-gray-900 border border-cyan-500/50 hover:border-cyan-400 text-white px-8 py-6 text-lg rounded-xl shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)] transition-all duration-300 group overflow-hidden"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative z-10 flex items-center">
                    Start Your Free Mock Interview
                    <motion.div animate={{ x: isHovered ? 5 : 0 }} transition={{ duration: 0.2 }}>
                      <ArrowRight className="ml-2 h-5 w-5 text-cyan-400" />
                    </motion.div>
                  </span>
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block"
          >
            <AnimatedTerminal />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

