"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { Loader2, Send, Mic, MicOff, Video, VideoOff, User, Bot, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/use-toast"
import { use } from "react"
import { VideoSection } from "@/components/interview/VideoSection"
import { ChatPanel } from "@/components/interview/ChatPanel"

interface Message {
  id: string
  sender: "user" | "ai"
  text: string
  timestamp: Date
}

interface Question {
  id: string
  text: string
}

interface Answer {
  questionId: string
  text: string
  // timestamp: Date
}

// Declare SpeechRecognition interface
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export default function InterviewPage({ params }: { params: Promise<{ paramUID: string }> }) {
  // Unwrap the params Promise using React.use()
  const resolvedParams = use(params)
  const paramUID = resolvedParams.paramUID

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [messageInput, setMessageInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const router = useRouter()

  const [interviewData, setInterviewData] = useState<{
    userId: string | null
    sessionId: string
    responses: {
      questionId: string
      // questionText: string
      answer: string
      // timestamp: Date
    }[]
  }>({
    userId: null,
    sessionId: paramUID,
    responses: [],
  })

  const fetchQuestions = async (userId: string) => {
    try {
      // Validate userId and session ID
      if (!userId || !paramUID) {
        throw new Error("Missing user or session information")
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000"}/question/${userId}/${paramUID}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      // Check for HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed with status ${response.status}`)
      }

      const data = await response.json()

      // Validate response structure
      if (!data || !Array.isArray(data.questions)) {
        throw new Error("Invalid response format from server")
      }

      if (data.questions.length === 0) {
        throw new Error("No questions available for this interview")
      }

      // Process and set questions
      const validatedQuestions = data.questions.map((q: any) => ({
        id: q.id,
        text: q.text || "No question text available",
      }))

      setQuestions(validatedQuestions)
      setInitializing(false)
      startInterviewFlow(validatedQuestions)
    } catch (error) {
      console.error("Error fetching questions:", error)

      // Differentiate error messages
      let errorMessage = "Failed to load interview questions"
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })

      // Fallback to empty questions but mark as initialized
      setQuestions([])
      setInitializing(false)
      startInterviewFlow([])
    }
  }

  const startInterviewFlow = (questions: Question[]) => {
    setIsAiTyping(true)

    setTimeout(() => {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        sender: "ai",
        text: "Hello! I'm your AI interviewer today. I've analyzed your resume and prepared some personalized questions. Let's get started with the first question.",
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
      setIsAiTyping(false)

      if (audioEnabled) speakText(welcomeMessage.text)

      // Ask first question if available
      if (questions.length > 0) {
        setTimeout(() => {
          askQuestion(questions[0])
        }, 1000)
      } else {
        setTimeout(() => {
          const noQuestionsMessage: Message = {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: "I couldn't generate questions based on your resume. Please describe your experience and skills.",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, noQuestionsMessage])
          setIsAiTyping(false)
          if (audioEnabled) speakText(noQuestionsMessage.text)
        }, 1000)
      }
    }, 2000)
  }

  const askQuestion = (question: Question) => {
    setIsAiTyping(true)
    setCurrentQuestion(question)

    setTimeout(() => {
      const questionMessage: Message = {
        id: question.id,
        sender: "ai",
        text: question.text,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, questionMessage])
      setIsAiTyping(false)
      if (audioEnabled) speakText(question.text)
    }, 1500)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        fetchQuestions(currentUser.uid)
      } else {
        router.push("/login")
      }
      setLoading(false)
    })

    // Improved SpeechRecognition setup
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onstart = () => {
        console.log("Speech recognition started");
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setMessageInput(finalTranscript || interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        toast({
          title: "Speech Recognition Error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        console.log("Speech recognition ended");
        setIsListening(false);
        setIsRecording(false);
      };
    }

    // Initialize speech synthesis voices
    if ("speechSynthesis" in window) {
      // Load voices
      const loadVoices = () => {
        window.speechSynthesis.getVoices()
      }

      loadVoices()

      // Chrome needs this event to load voices
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices
      }
    }

    return () => {
      unsubscribe()

      // Clean up speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }

      // Clean up speech synthesis
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel()
      }
    }
  }, [router])

  // Initialize camera and microphone
  useEffect(() => {
    if (!loading && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({
          video: videoEnabled,
          audio: true,
        })
        .then((stream) => {
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }

          const audioTracks = stream.getAudioTracks()
          if (audioTracks.length > 0) {
            const audioStream = new MediaStream([audioTracks[0]])
            const mediaRecorder = new MediaRecorder(audioStream)

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunksRef.current.push(event.data)
              }
            }

            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
              audioChunksRef.current = []

              // We'll use the transcript from the speech recognition instead
              if (currentQuestion && messageInput) {
                storeInterviewResponse(currentQuestion.text, messageInput)
                handleSendMessage()
              }
            }

            mediaRecorderRef.current = mediaRecorder
          }
        })
        .catch((error) => {
          console.error("Error accessing media devices:", error)
          toast({
            title: "Camera access error",
            description: "Please allow camera access to see yourself in the interview.",
            variant: "destructive",
          })
        })
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [loading, videoEnabled])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Text-to-speech function with improved reliability
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // Get available voices and select a preferred one
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(
        (voice) =>
          voice.name.includes("Google UK English Female") ||
          voice.name.includes("Female") ||
          voice.name.includes("Samantha"),
      )

      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      // Add event handlers to track speech progress
      utterance.onend = () => {
        console.log("Speech synthesis finished")
        speechSynthesisRef.current = null
      }

      utterance.onerror = (event) => {
        console.error("Speech synthesis error", event)
        speechSynthesisRef.current = null

        // Attempt to restart if there was an error
        if (audioEnabled) {
          setTimeout(() => {
            speakText(text)
          }, 100)
        }
      }

      utterance.onpause = () => {
        console.log("Speech synthesis paused")
      }

      utterance.onboundary = (event) => {
        console.log("Speech boundary reached", event)
      }

      // Store reference to current utterance
      speechSynthesisRef.current = utterance

      // Start speaking
      window.speechSynthesis.speak(utterance)

      // Chrome has a bug where speech can stop after ~15 seconds
      // This is a workaround to keep it going
      const resumeSpeechSynthesis = () => {
        if (speechSynthesisRef.current && audioEnabled) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume()
          }
        }
      }

      // Check every second if speech synthesis is paused and resume it
      const intervalId = setInterval(resumeSpeechSynthesis, 1000)

      // Clear interval when speech is done
      utterance.onend = () => {
        clearInterval(intervalId)
        speechSynthesisRef.current = null
      }

      utterance.onerror = (event) => {
        clearInterval(intervalId)
        console.error("Speech synthesis error", event)
        speechSynthesisRef.current = null
      }
    }
  }

  const storeInterviewResponse = async (question: string, answer: string) => {
    try {
      if (!user || !currentQuestion) return

      // Add to local answers array
      const newAnswer: Answer = {
        questionId: currentQuestion.id,
        text: answer,
        // timestamp: new Date(),
      }

      setAnswers((prev) => [...prev, newAnswer])

      // Update the comprehensive interview data
      setInterviewData((prev) => {
        // Check if this question already has a response
        const existingResponseIndex = prev.responses.findIndex((r) => r.questionId === currentQuestion.id)

        // Create a new responses array
        const newResponses = [...prev.responses]

        // If response exists, update it
        if (existingResponseIndex >= 0) {
          newResponses[existingResponseIndex] = {
            questionId: currentQuestion.id,
            // questionText: question,
            answer: answer,
            // timestamp: new Date(),
          }
        } else {
          // Otherwise add a new response
          newResponses.push({
            questionId: currentQuestion.id,
            // questionText: question,
            answer: answer,
            // timestamp: new Date(),
          })
        }

        return {
          ...prev,
          userId: user.uid,
          responses: newResponses,
        }
      })

      // Log for testing
      console.log("Storing response:", {
        questionId: currentQuestion.id,
        question,
        answer,
        // timestamp: new Date(),
      })

      console.log("Response stored successfully")

      // Log the updated interview data
      setTimeout(() => {
        console.log("Current interview data:", interviewData)
      }, 100)
    } catch (error) {
      console.error("Error storing response:", error)
      toast({
        title: "Error",
        description: "Failed to save your response. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Start speech recognition
  const startSpeechRecognition = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        setIsRecording(true)

        toast({
          title: "Listening",
          description: "Speak your answer clearly. Click stop when finished.",
        })
      } catch (error) {
        console.error("Error starting speech recognition:", error)
        toast({
          title: "Error",
          description: "Could not start speech recognition. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  // Stop speech recognition
  const stopSpeechRecognition = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
        setIsListening(false)
        setIsRecording(false)

        // If we have a transcript, automatically send it
        if (messageInput.trim()) {
          if (currentQuestion) {
            storeInterviewResponse(currentQuestion.text, messageInput)
            handleSendMessage()
          }
        }
      } catch (error) {
        console.error("Error stopping speech recognition:", error)
      }
    }
  }

  // Toggle speech recognition
  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopSpeechRecognition()
    } else {
      startSpeechRecognition()
    }
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: messageInput,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Store the response if not already stored
    if (currentQuestion) {
      const hasAnswered = answers.some((a) => a.questionId === currentQuestion.id)
      if (!hasAnswered) {
        storeInterviewResponse(currentQuestion.text, messageInput)
      }
    }

    setMessageInput("")

    // Simulate AI response
    setIsAiTyping(true)
    setTimeout(() => {
      let aiResponse = ""
      let nextQuestion: Question | null = null

      if (currentQuestion) {
        const currentIndex = questions.findIndex((q) => q.id === currentQuestion.id)
        if (currentIndex < questions.length - 1) {
          nextQuestion = questions[currentIndex + 1]
          aiResponse = `Thank you for your response. ${nextQuestion.text}`
        } else {
          aiResponse =
            "Thank you for completing all the questions. Your responses have been recorded. Is there anything else you'd like to add?"
        }
      } else {
        aiResponse = "Thank you for your response. Can you tell me more about your experience?"
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: aiResponse,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsAiTyping(false)

      if (nextQuestion) {
        setCurrentQuestion(nextQuestion)
      }

      if (audioEnabled) speakText(aiResponse)
    }, 2000)
  }

  const toggleMic = () => {
    setMicEnabled(!micEnabled)
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !micEnabled
      })
    }
  }

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled)
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !videoEnabled
      })
    }
  }

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled)
    if (audioEnabled) {
      window.speechSynthesis.cancel() // Stop any ongoing speech
    }
  }

  // Function to complete the interview and send all data to the FastAPI endpoint
  const completeInterview = async () => {
    if (!user) return

    try {
      setIsCompleting(true)

      // Log all answers for testing
      console.log("Answers to be submitted:", answers)

      // Log the complete interview data
      console.log("Complete interview data:", {
        responses: interviewData.responses,
        userId: user.uid,
        sessionId: paramUID,
      })

      // Send the interview data to the FastAPI endpoint--------------------------------------------

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000"}/process_interview_responses/${user.uid}/${paramUID}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(interviewData),
        },
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed with status ${response.status}`)
      }

      const data = await response.json()
      console.log("Interview completed successfully:", data)

      toast({
        title: "Interview Completed",
        description: `Your interview has been completed with a score of ${data.score}/10.`,
      })




// -------------------------------------------------------------------------------------------















      // Navigate to dashboard after a short delay
      setTimeout(() => {
        router.push(`/dashboard?interview=${data.interview_id}`)
      }, 2000)
    } catch (error) {
      console.error("Error completing interview:", error)

      toast({
        title: "Error",
        description: "Failed to complete the interview. Please try again.",
        variant: "destructive",
      })

      setIsCompleting(false)
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
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col lg:flex-row gap-4"
        >
          {/* Main content area */}
          <div className="flex-1 flex flex-col">
            <VideoSection
              videoRef={videoRef}
              videoEnabled={videoEnabled}
              micEnabled={micEnabled}
              audioEnabled={audioEnabled}
              isRecording={isRecording}
              isListening={isListening}
              isCompleting={isCompleting}
              paramUID={paramUID}
              currentQuestion={currentQuestion}
              toggleMic={toggleMic}
              toggleVideo={toggleVideo}
              toggleAudio={toggleAudio}
              toggleSpeechRecognition={toggleSpeechRecognition}
              completeInterview={completeInterview}
            />
          </div>

          {/* Chat panel */}
          <div className="w-full lg:w-96 flex flex-col">
            <ChatPanel
              initializing={initializing}
              messages={messages}
              isAiTyping={isAiTyping}
              user={user}
              messageInput={messageInput}
              isListening={isListening}
              messagesEndRef={messagesEndRef}
              handleSendMessage={handleSendMessage}
              setMessageInput={setMessageInput}
              toggleSpeechRecognition={toggleSpeechRecognition}
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

