"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { motion, useAnimation, useInView } from "framer-motion"
import { ArrowRight, Upload, Video, BarChart, Sparkles, Code, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function LandingPage() {
  const [isHovered, setIsHovered] = useState(false)

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

  // Neon particle animation
  const ParticleCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      const particles: {
        x: number
        y: number
        size: number
        speedX: number
        speedY: number
        color: string
        alpha: number
      }[] = []

      const colors = ["#00ffff", "#ff00ff", "#00ff99", "#ff66cc"]

      // Create particles
      for (let i = 0; i < 50; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: Math.random() * 0.5 - 0.25,
          speedY: Math.random() * 0.5 - 0.25,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.5 + 0.1,
        })
      }

      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        particles.forEach((particle) => {
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fillStyle = particle.color
          ctx.globalAlpha = particle.alpha
          ctx.fill()

          particle.x += particle.speedX
          particle.y += particle.speedY

          // Wrap around edges
          if (particle.x < 0) particle.x = canvas.width
          if (particle.x > canvas.width) particle.x = 0
          if (particle.y < 0) particle.y = canvas.height
          if (particle.y > canvas.height) particle.y = 0
        })

        requestAnimationFrame(animate)
      }

      animate()

      const handleResize = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }

      window.addEventListener("resize", handleResize)

      return () => {
        window.removeEventListener("resize", handleResize)
      }
    }, [])

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-30" />
  }

  // Animated grid background
  const GridBackground = () => {
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

  // Animated terminal component
  const AnimatedTerminal = () => {
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

  // Animated radar chart
  const AnimatedRadarChart = () => {
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

  // Animated wave
  const AnimatedWave = () => {
    return (
      <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <motion.path
            initial={{
              d: "M0,320L48,288C96,256,192,192,288,186.7C384,181,480,235,576,245.3C672,256,768,224,864,224C960,224,1056,256,1152,261.3C1248,267,1344,245,1392,234.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
            }}
            animate={{
              d: [
                "M0,320L48,288C96,256,192,192,288,186.7C384,181,480,235,576,245.3C672,256,768,224,864,224C960,224,1056,256,1152,261.3C1248,267,1344,245,1392,234.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,320L48,304C96,288,192,256,288,234.7C384,213,480,203,576,213.3C672,224,768,256,864,261.3C960,267,1056,245,1152,229.3C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,320L48,288C96,256,192,192,288,186.7C384,181,480,235,576,245.3C672,256,768,224,864,224C960,224,1056,256,1152,261.3C1248,267,1344,245,1392,234.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              ],
            }}
            transition={{
              duration: 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            fill="rgba(0, 255, 255, 0.1)"
          />
          <motion.path
            initial={{
              d: "M0,320L48,304C96,288,192,256,288,240C384,224,480,224,576,213.3C672,203,768,181,864,192C960,203,1056,245,1152,250.7C1248,256,1344,224,1392,208L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
            }}
            animate={{
              d: [
                "M0,320L48,304C96,288,192,256,288,240C384,224,480,224,576,213.3C672,203,768,181,864,192C960,203,1056,245,1152,250.7C1248,256,1344,224,1392,208L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,320L48,288C96,256,192,192,288,176C384,160,480,192,576,202.7C672,213,768,203,864,213.3C960,224,1056,256,1152,266.7C1248,277,1344,267,1392,261.3L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,320L48,304C96,288,192,256,288,240C384,224,480,224,576,213.3C672,203,768,181,864,192C960,203,1056,245,1152,250.7C1248,256,1344,224,1392,208L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              ],
            }}
            transition={{
              duration: 8,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.5,
            }}
            fill="rgba(255, 0, 255, 0.1)"
          />
        </svg>
      </div>
    )
  }

  // Animated feature card
  const FeatureCard = ({ icon, title, description, delay = 0 }) => {
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
        className="bg-gray-950 p-8 rounded-xl border border-gray-800 hover:border-cyan-500/50 transition-all duration-300 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>

        <div className="bg-gray-900 p-4 rounded-lg inline-block mb-6 relative z-10 group-hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all duration-500">
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-3 relative z-10 group-hover:text-cyan-400 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-gray-400 relative z-10">{description}</p>
      </motion.div>
    )
  }

  // Animated testimonial card
  const TestimonialCard = ({ testimonial, name, role, delay = 0 }) => {
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-100">
      <Navbar />

      {/* Hero Section */}
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

      {/* How It Works Section */}
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

      {/* Why Mockly Section */}
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
              <AnimatedRadarChart width={5000} height={5000} />
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

      {/* Testimonials Section */}
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

      {/* CTA Section */}
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

      <Footer />
    </div>
  )
}

