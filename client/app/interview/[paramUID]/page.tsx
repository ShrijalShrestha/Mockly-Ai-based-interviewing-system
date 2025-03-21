"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
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

interface Message {
  id: string
  sender: "user" | "ai"
  text: string
  timestamp: Date
}

export default function InterviewPage({ params }: { params: { paramUID: string } }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [messageInput, setMessageInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentQuestion, setCurrentQuestion] = useState("")
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const router = useRouter()

  // Sample interview questions - in production these would come from CrewAI based on resume
  const interviewQuestions = [
    "Tell me about your experience with React and Next.js as mentioned in your resume.",
    "I see you worked on a project using Firebase. Can you elaborate on your role and contributions?",
    "Your resume mentions experience with state management. How do you decide between different state management solutions?",
    "Can you describe the CI/CD pipeline you implemented as mentioned in your work experience?",
    "Based on your resume, you have experience with TypeScript. How has it improved your development workflow?",
  ]

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

  // Initialize camera and microphone
  useEffect(() => {
    if (!loading && videoRef.current) {
      // Request access to camera and microphone
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

          // Initialize media recorder for audio
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

              // Convert audio to text using Speech Recognition API
              const speechRecognition = processAudioToText(audioBlob)

              // Store the response in the database
              if (currentQuestion && speechRecognition) {
                storeInterviewResponse(currentQuestion, speechRecognition)
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
      // Clean up media streams when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [loading, videoEnabled])

  // Initialize the interview after loading
  useEffect(() => {
    if (!loading && initializing) {
      // Simulate AI starting the conversation
      setTimeout(() => {
        setInitializing(false)
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

          // Speak the welcome message
          if (audioEnabled) {
            speakText(welcomeMessage.text)
          }

          // Ask first question after a short delay
          setTimeout(() => {
            setIsAiTyping(true)
            setTimeout(() => {
              const firstQuestion = interviewQuestions[0]
              setCurrentQuestion(firstQuestion)
              const questionMessage: Message = {
                id: (Date.now() + 1).toString(),
                sender: "ai",
                text: firstQuestion,
                timestamp: new Date(),
              }
              setMessages((prev) => [...prev, questionMessage])
              setIsAiTyping(false)

              // Speak the first question
              if (audioEnabled) {
                speakText(firstQuestion)
              }
            }, 1500)
          }, 1000)
        }, 2000)
      }, 2000)
    }
  }, [loading, initializing, audioEnabled])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Text-to-speech function
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // Optional: Set a better voice if available
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find((voice) => voice.name.includes("Google") || voice.name.includes("Female"))
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      window.speechSynthesis.speak(utterance)
    }
  }

  // Process audio to text (simulated - in production would use a real speech-to-text API)
  const processAudioToText = (audioBlob: Blob): string => {
    // In a real implementation, you would send this blob to a speech-to-text service
    // For now, we'll just return the message input as a simulation
    return messageInput
  }

  // Store interview Q&A in database
  const storeInterviewResponse = async (question: string, answer: string) => {
    try {
      if (!user) return

      const interviewRef = collection(db, "interviews")
      await addDoc(interviewRef, {
        userId: user.uid,
        sessionId: params.paramUID,
        question,
        answer,
        timestamp: serverTimestamp(),
      })

      console.log("Response stored in database")
    } catch (error) {
      console.error("Error storing response:", error)
    }
  }

  // Start recording audio
  const startRecording = () => {
    if (mediaRecorderRef.current && !isRecording) {
      audioChunksRef.current = []
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setIsListening(true)

      toast({
        title: "Recording started",
        description: "Speak your answer clearly. Recording will stop automatically after you finish.",
      })
    }
  }

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsListening(false)
    }
  }

  // Toggle speech recognition
  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopRecording()
    } else {
      startRecording()
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

    // Store the response in the database
    if (currentQuestion) {
      storeInterviewResponse(currentQuestion, messageInput)
    }

    setMessageInput("")

    // Simulate AI thinking and responding
    setIsAiTyping(true)
    setTimeout(
      () => {
        // Get next question or follow-up
        const currentIndex = interviewQuestions.indexOf(currentQuestion)
        let aiResponse = ""

        if (currentIndex < interviewQuestions.length - 1) {
          // Move to next question
          const nextQuestion = interviewQuestions[currentIndex + 1]
          setCurrentQuestion(nextQuestion)
          aiResponse = `Thank you for your response. ${nextQuestion}`
        } else {
          // End of interview
          aiResponse =
            "Thank you for completing all the questions. Your responses have been recorded. Is there anything else you'd like to add or ask me about the position?"
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: aiResponse,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMessage])
        setIsAiTyping(false)

        // Speak the AI response
        if (audioEnabled) {
          speakText(aiResponse)
        }
      },
      2000 + Math.random() * 1000,
    )
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
            {/* Video area */}
            <Card className="bg-gray-900 border-gray-800 mb-4 flex-1">
              <CardContent className="p-0 h-full flex flex-col">
                <div className="relative w-full h-full min-h-[300px] bg-gray-950 rounded-md overflow-hidden">
                  {/* Video feed */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {videoEnabled ? (
                      <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <User className="h-20 w-20 text-gray-700" />
                      </div>
                    )}
                  </div>

                  {/* Current question overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-sm text-gray-400">Current question:</p>
                    <p className="text-white font-medium">{currentQuestion || "Preparing interview questions..."}</p>
                  </div>

                  {/* Session info */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <Badge variant="outline" className="bg-gray-900/80 text-white border-gray-700">
                      Session: {params.paramUID.substring(0, 8)}
                    </Badge>
                    <Badge variant="outline" className="bg-red-900/80 text-white border-red-700 animate-pulse">
                      REC
                    </Badge>
                    {isRecording && (
                      <Badge variant="outline" className="bg-green-900/80 text-white border-green-700 animate-pulse">
                        MIC ACTIVE
                      </Badge>
                    )}
                  </div>

                  {/* AI interviewer picture-in-picture */}
                  <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-md overflow-hidden border border-gray-700 shadow-lg">
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Bot className="h-10 w-10 text-blue-500" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-1 px-2">
                      <p className="text-xs text-white text-center">AI Interviewer</p>
                    </div>
                  </div>
                </div>

                {/* Video controls */}
                <div className="p-4 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className={`rounded-full ${!micEnabled ? "bg-red-900/20 text-red-500 border-red-800" : "border-gray-700"}`}
                    onClick={toggleMic}
                  >
                    {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`rounded-full ${!videoEnabled ? "bg-red-900/20 text-red-500 border-red-800" : "border-gray-700"}`}
                    onClick={toggleVideo}
                  >
                    {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`rounded-full ${!audioEnabled ? "bg-red-900/20 text-red-500 border-red-800" : "border-gray-700"}`}
                    onClick={toggleAudio}
                  >
                    {audioEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant={isListening ? "destructive" : "outline"}
                    className="rounded-full px-6"
                    onClick={toggleSpeechRecognition}
                  >
                    {isListening ? "Stop Recording" : "Record Answer"}
                  </Button>
                  <Button variant="destructive" className="rounded-full px-6" onClick={() => router.push("/dashboard")}>
                    End Interview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat panel */}
          <div className="w-full lg:w-96 flex flex-col">
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-900 border-gray-800">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="mt-0">
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-0">
                    <div className="flex flex-col h-[500px]">
                      {/* Messages area */}
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {initializing && (
                            <div className="flex justify-center py-8">
                              <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <p className="text-gray-400 text-sm">Initializing interview...</p>
                              </div>
                            </div>
                          )}

                          <AnimatePresence>
                            {messages.map((message) => (
                              <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                              >
                                <div className="flex items-start gap-2 max-w-[80%]">
                                  {message.sender === "ai" && (
                                    <Avatar className="h-8 w-8 mt-1">
                                      <AvatarFallback className="bg-blue-950 text-blue-400">AI</AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div
                                    className={`rounded-lg px-4 py-2 ${
                                      message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
                                    }`}
                                  >
                                    <p className="text-sm">{message.text}</p>
                                    <p className="text-xs opacity-70 mt-1">
                                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                  {message.sender === "user" && (
                                    <Avatar className="h-8 w-8 mt-1">
                                      <AvatarFallback className="bg-gray-700">
                                        {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                              </motion.div>
                            ))}

                            {isAiTyping && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-start"
                              >
                                <div className="flex items-start gap-2 max-w-[80%]">
                                  <Avatar className="h-8 w-8 mt-1">
                                    <AvatarFallback className="bg-blue-950 text-blue-400">AI</AvatarFallback>
                                  </Avatar>
                                  <div className="rounded-lg px-4 py-2 bg-gray-800 text-gray-100">
                                    <div className="flex gap-1">
                                      <span className="animate-bounce">•</span>
                                      <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>
                                        •
                                      </span>
                                      <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>
                                        •
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>

                      {/* Input area */}
                      <div className="p-3 border-t border-gray-800">
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Type your response or use voice recording..."
                            className="min-h-[60px] bg-gray-800 border-gray-700 resize-none"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                handleSendMessage()
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            className="h-auto bg-blue-600 hover:bg-blue-700"
                            onClick={handleSendMessage}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-gray-500">Press Enter to send, Shift+Enter for new line</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-gray-400"
                            onClick={toggleSpeechRecognition}
                          >
                            {isListening ? "Stop Recording" : "Record Answer"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="notes" className="mt-0">
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <Textarea
                      placeholder="Take notes during your interview..."
                      className="min-h-[460px] bg-gray-800 border-gray-700"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

