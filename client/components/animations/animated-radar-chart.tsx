"use client"

import { motion } from "framer-motion"

interface AnimatedRadarChartProps {
  width?: number
  height?: number
}

export default function AnimatedRadarChart({ width = 5000, height = 5000 }: AnimatedRadarChartProps) {
  return (
    <div className="relative h-64 w-full">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-48 h-48">
          {/* Radar circles */}
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 border border-cyan-500/30 rounded-full"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{
                scale: i * 0.25,
                opacity: 0.7 - i * 0.15,
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.4,
              }}
            />
          ))}

          {/* Radar lines */}
          {[0, 45, 90, 135].map((angle) => (
            <div
              key={angle}
              className="absolute top-1/2 left-1/2 h-px w-full bg-cyan-500/20 origin-center"
              style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
            />
          ))}

          {/* Center dot */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(0,255,255,0.7)]"
            style={{ transform: "translate(-50%, -50%)" }}
            animate={{
              boxShadow: [
                "0 0 10px rgba(0,255,255,0.3)",
                "0 0 20px rgba(0,255,255,0.7)",
                "0 0 10px rgba(0,255,255,0.3)",
              ],
            }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          />

          {/* Data points */}
          {[
            { angle: 45, distance: 0.7 },
            { angle: 90, distance: 0.9 },
            { angle: 135, distance: 0.6 },
            { angle: 180, distance: 0.8 },
            { angle: 225, distance: 0.75 },
            { angle: 270, distance: 0.85 },
            { angle: 315, distance: 0.65 },
            { angle: 360, distance: 0.7 },
          ].map((point, i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_8px_rgba(255,0,255,0.7)]"
              style={{
                transform: `translate(-50%, -50%) rotate(${point.angle}deg) translateY(-${point.distance * 24}px) rotate(-${point.angle}deg)`,
              }}
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 2 + i * 0.2,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

