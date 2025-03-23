"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import ParticleCanvas from "@/components/animations/particle-canvas"

export default function CTASection() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950"></div>
      <ParticleCanvas />

      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-400">
            Ready to Ace Your Next Interview?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of professionals who have improved their interview skills with Mockly.
          </p>
          <Link href="/signup">
            <Button
              size="lg"
              className="relative bg-gray-900 border border-cyan-500/50 hover:border-fuchsia-400 text-white px-8 py-6 text-lg rounded-xl shadow-[0_0_15px_rgba(255,0,255,0.3)] hover:shadow-[0_0_25px_rgba(255,0,255,0.5)] transition-all duration-300 group overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative z-10 flex items-center">
                Start Your Free Mock Interview
                <ArrowRight className="ml-2 h-5 w-5 text-fuchsia-400" />
              </span>
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

