"use client"

import { motion } from "framer-motion"

export default function AnimatedTerminal() {
  const commands = [
    "$ initialize interview.ai",
    "Loading profile data...",
    "Analyzing resume...",
    "Generating personalized questions...",
    "AI interviewer ready.",
  ]

  return (
    <div className="relative rounded-lg overflow-hidden border border-cyan-500/50 shadow-[0_0_15px_rgba(0,255,255,0.3)]">
      <div className="bg-gray-950 p-2 border-b border-cyan-800/50 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <div className="text-xs text-gray-400 ml-2">mockly-interview.ai</div>
      </div>
      <div className="bg-gray-950 p-4 font-mono text-sm">
        {commands.map((command, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.5, duration: 0.3 }}
            className={`${command.startsWith("$") ? "text-cyan-400" : "text-green-400"} mb-2`}
          >
            {command}
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: 0.5, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" },
          }}
          className="inline-block w-3 h-5 bg-cyan-500 ml-1"
        />
      </div>
    </div>
  )
}

