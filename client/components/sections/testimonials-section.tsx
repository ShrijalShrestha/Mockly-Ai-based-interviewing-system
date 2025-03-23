"use client"

import { motion } from "framer-motion"
import TestimonialCard from "@/components/cards/testimonial-card"

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-gray-950 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(0,255,255,0.1),transparent_70%)]"></div>

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
                Testimonials
              </div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-lg blur opacity-30"></div>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-400">
            What Our Users Say
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Hear from professionals who improved their interview skills with Mockly.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <TestimonialCard
            testimonial="Mockly helped me prepare for my technical interviews at top tech companies. The AI feedback was spot-on and helped me identify areas I needed to improve."
            name="Sarah Johnson"
            role="Software Engineer"
            delay={0}
          />
          <TestimonialCard
            testimonial="The personalized questions based on my resume were incredibly relevant. I felt much more confident going into my interviews after practicing with Mockly."
            name="Michael Chen"
            role="Product Manager"
            delay={0.2}
          />
          <TestimonialCard
            testimonial="I was nervous about my career change, but Mockly's adaptive questions helped me prepare for the unexpected. I got the job!"
            name="Jessica Williams"
            role="Marketing Specialist"
            delay={0.4}
          />
        </div>
      </div>
    </section>
  )
}

