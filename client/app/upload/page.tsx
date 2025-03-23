"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { Upload, FileText, X, Check, Loader2, ArrowRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"

export default function UploadPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState<"idle" | "uploading" | "processing" | "complete" | "error">(
    "idle",
  )
  const router = useRouter()
  const { toast } = useToast()


//---------------------------------------------------------------------------------------------




  // FastAPI endpoint URL - replace with your actual endpoint
  const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000"






  // ---------------------------------------------------------------------------------------------




  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        router.push("/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      validateAndSetFile(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (file: File) => {
    // Check if file is PDF
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      })
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    setFile(file)
  }

  const removeFile = () => {
    setFile(null)
    setProcessingStatus("idle")
    setUploadProgress(0)
  }

  const uploadResume = async () => {
    if (!file || !user) return

    setIsUploading(true)
    setProcessingStatus("uploading")
    setUploadProgress(0)

    try {
      // Create FormData to send the file
      const formData = new FormData()
      formData.append("file", file)
      formData.append("user_id", user.uid)

      // Simulate upload progress (0-50%)
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 50) {
            clearInterval(uploadInterval)
            return 50
          }
          return prev + 5
        })
      }, 200)

      // Send the file to FastAPI backend
      const response = await fetch(`${FASTAPI_URL}/upload-resume`, {
        method: "POST",
        body: formData,
      })

      clearInterval(uploadInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to upload resume")
      }

      const data = await response.json()

      // Change to processing state (50-90%)
      setProcessingStatus("processing")

      // Simulate ML model processing time (5-7 seconds)
      const processingInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(processingInterval)
            return 90
          }
          return prev + 5
        })
      }, 300)

      // Simulate the ML model processing time (5-7 seconds)
      await new Promise((resolve) => setTimeout(resolve, 6000))

      clearInterval(processingInterval)
      setUploadProgress(100)
      setProcessingStatus("complete")

      toast({
        title: "Resume processed successfully",
        description: "Redirecting to your interview session",
        variant: "default",
      })

      // Redirect to interview page with the session ID from the API
      router.push(`/interview/${data.session_id || data.id || Math.random().toString(36).substring(2, 15)}`)
    } catch (error) {
      console.error("Upload error:", error)
      setProcessingStatus("error")

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred while uploading your resume",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Upload Your Resume</CardTitle>
              <CardDescription>We'll analyze your resume to create personalized interview questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 ${
                  isDragging
                    ? "border-blue-500 bg-blue-500/10"
                    : file
                      ? "border-green-500 bg-green-500/10"
                      : "border-gray-700 hover:border-gray-600"
                }`}
              >
                {!file ? (
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Drag and drop your resume here</p>
                      <p className="text-sm text-gray-400 mt-1">or click to browse files</p>
                      <p className="text-xs text-gray-500 mt-4">PDF only, max 5MB</p>
                    </div>
                    <input
                      type="file"
                      id="resume-upload"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("resume-upload")?.click()}
                      className="mt-4 border-gray-700"
                    >
                      Browse Files
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={removeFile}
                        className="h-6 w-6 rounded-full"
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                    {/* Upload Progress */}
                    {(processingStatus === "uploading" || processingStatus === "processing") && (
                      <div className="w-full space-y-2">
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>
                            {processingStatus === "uploading" ? "Uploading..." : "Processing with AI model..."}
                          </span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}

                    {processingStatus === "error" && (
                      <div className="text-red-400 flex items-center justify-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>Error processing resume. Please try again.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Information */}
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">What happens next?</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                      1
                    </div>
                    <span>Our AI will analyze your resume to understand your skills and experience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-4 w-4 rounded-full bg-purple-500 flex items-center justify-center text-xs text-white">
                      2
                    </div>
                    <span>We'll generate personalized interview questions based on your profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center text-xs text-white">
                      3
                    </div>
                    <span>You'll be redirected to your interview session with our AI interviewer</span>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={uploadResume}
                disabled={!file || isUploading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {processingStatus === "processing" ? "Processing Resume..." : "Uploading..."}
                  </>
                ) : (
                  <>
                    Continue to Interview
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

