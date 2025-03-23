"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import HeroSection from "@/components/sections/hero-section"
import HowItWorksSection from "@/components/sections/how-it-works-section"
import WhyMocklySection from "@/components/sections/why-mockly-section"
import TestimonialsSection from "@/components/sections/testimonials-section"
import CTASection from "@/components/sections/cta-section"

export default function LandingPage() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <HeroSection isHovered={isHovered} setIsHovered={setIsHovered} />
      <HowItWorksSection />
      <WhyMocklySection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  )
}

