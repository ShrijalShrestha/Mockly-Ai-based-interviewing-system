"use client"

import { useRef, useEffect } from "react"
import { motion, useAnimation, useInView } from "framer-motion"

interface TestimonialCardProps {
  testimonial: string
  name: string
  role: string
  delay?: number
}

export default function TestimonialCard({ testimonial, name, role, delay = 0 }: TestimonialCardProps) {
  const controls = useAnimation()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (inView) {
      controls.start("visible")
    }
  }, [controls, inView])

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, delay },
        },
      }}
      className="bg-gray-950 p-8 rounded-xl relative group overflow-hidden border border-gray-800 hover:border-fuchsia-500/50 transition-all duration-300"
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>

      <div className="mb-6 relative z-10">
        <svg className="h-10 w-10 text-fuchsia-500 opacity-50" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
      </div>
      <p className="text-gray-300 mb-6 relative z-10">{testimonial}</p>
      <div className="flex items-center relative z-10">
        <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-full mr-3 flex items-center justify-center">
          <span className="text-xs font-bold text-gray-950">{name.charAt(0)}</span>
        </div>
        <div>
          <p className="font-semibold group-hover:text-fuchsia-400 transition-colors duration-300">{name}</p>
          <p className="text-sm text-gray-400">{role}</p>
        </div>
      </div>
    </motion.div>
  )
}

