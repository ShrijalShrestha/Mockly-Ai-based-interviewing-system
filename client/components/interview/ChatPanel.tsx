import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Send, Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Message {
  id: string
  sender: "user" | "ai"
  text: string
  timestamp: Date
}

interface ChatPanelProps {
  initializing: boolean
  messages: Message[]
  isAiTyping: boolean
  user: any
  messageInput: string
  isListening: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>
  handleSendMessage: () => void
  setMessageInput: (val: string) => void
  toggleSpeechRecognition: () => void
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  initializing,
  messages,
  isAiTyping,
  user,
  messageInput,
  isListening,
  messagesEndRef,
  handleSendMessage,
  setMessageInput,
  toggleSpeechRecognition,
}) => (
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
                  disabled={!messageInput.trim()}
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
)
