"use client"

import { motion } from "framer-motion"

export default function GridBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden opacity-10">
      <div className="absolute inset-0 grid grid-cols-12 gap-4">
        {Array.from({ length: 12 * 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: Math.random() * 0.5 + 0.1 }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
            className="h-full w-full border border-cyan-500/20"
          />
        ))}
      </div>
    </div>
  )
}

