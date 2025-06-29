import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Bot, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Loader2 } from "lucide-react"

interface VideoSectionProps {
  videoRef: React.RefObject<HTMLVideoElement>
  videoEnabled: boolean
  micEnabled: boolean
  audioEnabled: boolean
  isRecording: boolean
  isListening: boolean
  isCompleting: boolean
  paramUID: string
  currentQuestion: { text: string } | null
  toggleMic: () => void
  toggleVideo: () => void
  toggleAudio: () => void
  toggleSpeechRecognition: () => void
  completeInterview: () => void
}

export const VideoSection: React.FC<VideoSectionProps> = ({
  videoRef,
  videoEnabled,
  micEnabled,
  audioEnabled,
  isRecording,
  isListening,
  isCompleting,
  paramUID,
  currentQuestion,
  toggleMic,
  toggleVideo,
  toggleAudio,
  toggleSpeechRecognition,
  completeInterview,
}) => (
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
          <p className="text-white font-medium">
            {currentQuestion ? currentQuestion.text : "Preparing interview questions..."}
          </p>
        </div>
        {/* Session info */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Badge variant="outline" className="bg-gray-900/80 text-white border-gray-700">
            Session: {paramUID.substring(0, 8)}
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
        <Button
          variant="destructive"
          className="rounded-full px-6"
          onClick={completeInterview}
          disabled={isCompleting}
        >
          {isCompleting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Completing...
            </>
          ) : (
            "End Interview"
          )}
        </Button>
      </div>
    </CardContent>
  </Card>
)
