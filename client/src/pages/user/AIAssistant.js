"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../contexts/AuthContext"
import api from "../../utils/api"
import styles from "../../styles/AIAssistant.module.css"

const QUICK_PROMPTS = [
  { label: "Explain a concept", text: "Explain this concept to me in simple terms: " },
  { label: "Practice questions", text: "Give me 5 practice questions on: " },
  { label: "Summarize notes", text: "Summarize this for my exam: " },
  { label: "Check my answer", text: "Is this answer correct? " },
]

const AIAssistant = () => {
  const { user } = useAuth()

  // State for all messages (local storage) and visible messages (pagination)
  const [allMessages, setAllMessages] = useState([])
  const [visibleCount, setVisibleCount] = useState(15)

  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [activeModel, setActiveModel] = useState(null)
  const [toast, setToast] = useState(null)
  // "landing" = welcome screen, "chat" = active conversation view
  const [viewMode, setViewMode] = useState("landing")

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)
  const textareaRef = useRef(null)

  // Dynamically get user's first name
  const getUserName = () => {
    if (!user?.fullName) return "there"
    const nameParts = user.fullName.trim().split(/\s+/)
    return nameParts[0]
  }

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("chatHistory")
    if (saved) {
      setAllMessages(JSON.parse(saved))
    }
  }, [])

  // Save to local storage whenever allMessages changes
  useEffect(() => {
    if (allMessages.length > 0) {
      localStorage.setItem("chatHistory", JSON.stringify(allMessages))
    }
  }, [allMessages])

  // Guard: never sit in chat view with nothing to show
  useEffect(() => {
    if (viewMode === "chat" && allMessages.length === 0 && !isLoading) {
      setViewMode("landing")
    }
  }, [viewMode, allMessages.length, isLoading])

  // Scroll to bottom when a new message is added or typing happens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [allMessages, isLoading])

  // Auto-grow textarea, capped by CSS max-height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputMessage])

  // Handle pagination on scroll up
  const handleScroll = () => {
    if (chatContainerRef.current.scrollTop === 0) {
      if (visibleCount < allMessages.length) {
        setVisibleCount(prev => Math.min(prev + 15, allMessages.length))
      }
    }
  }

  // Speech to Text Logic
  const toggleListening = () => {
    if (isListening) stopListening()
    else startListening()
  }

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setToast("Your browser doesn't support voice input.")
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      const currentTranscript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('')
      setInputMessage(currentTranscript)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
    }
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // Send Message Logic (Using Axios API Instance)
  const sendMessage = async (overrideText = null) => {
    const textToSend = overrideText || inputMessage
    if (!textToSend.trim() || isLoading) return

    setViewMode("chat")

    // 1. Add User Message immediately
    const userMsg = {
      id: Date.now(),
      text: textToSend,
      sender: "user",
      timestamp: new Date().toISOString(),
    }

    setAllMessages(prev => [...prev, userMsg])
    if (!overrideText) setInputMessage("")
    setIsLoading(true)
    setActiveModel(null)

    try {
      const contextHistory = allMessages.slice(-10)

      // 2. Make the API Call using your Axios instance
      const response = await api.post("/api/ai/chat", {
        message: textToSend,
        history: contextHistory,
        userName: getUserName() 
      })

      // Axios automatically parses JSON, so we just access .data
      const data = response.data

      if (!data.success) {
        throw new Error(data.message || "Failed to connect to AI")
      }

      // 3. Add the complete AI Message to the chat
      const aiMsg = {
        id: Date.now(), 
        text: data.text,
        sender: "ai",
        timestamp: new Date().toISOString(),
      }

      setAllMessages(prev => [...prev, aiMsg])
      setActiveModel(data.model)

    } catch (error) {
      console.error("Chat error:", error)
      
      const errorMessage = error.response?.data?.message || "Sorry, I ran into an error. Please try again."
      
      const errorMsg = {
        id: Date.now(),
        text: errorMessage,
        sender: "ai",
        isError: true,
        timestamp: new Date().toISOString(),
      }
      
      setAllMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setToast("Copied to clipboard")
  }

  const retryMessage = (index) => {
    const lastUserMsg = allMessages.slice(0, index).reverse().find(m => m.sender === "user")
    if (lastUserMsg) {
      setAllMessages(prev => prev.slice(0, index))
      sendMessage(lastUserMsg.text)
    }
  }

  const clearChat = () => {
    if (allMessages.length === 0) return
    if (window.confirm("Clear the entire conversation? This can't be undone.")) {
      setAllMessages([])
      setVisibleCount(15)
      localStorage.removeItem("chatHistory")
      setViewMode("landing")
    }
  }

  const goToLanding = () => setViewMode("landing")
  const viewPreviousMessages = () => setViewMode("chat")

  const handleQuickPrompt = (text) => {
    setInputMessage(text)
    textareaRef.current?.focus()
  }

  const handleBack = () => {
    if (viewMode === "chat" && allMessages.length > 0) {
      goToLanding()
    } else {
      window.history.back()
    }
  }

  // Calculate which messages to show based on pagination
  const displayedMessages = allMessages.slice(-visibleCount)

  return (
    <div className={styles.aiAssistant}>
      <div className={styles.aiHeader}>
        <button className={styles.iconBtn} onClick={handleBack} aria-label="Go back">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className={styles.aiTitle}>
          <h1>AI Assistant</h1>
          {activeModel && (
            <span className={styles.modelBadge}>{activeModel}</span>
          )}
        </div>
        <button className={styles.iconBtn} onClick={clearChat} title="Clear Chat" aria-label="Clear chat">
          <i className="fas fa-trash"></i>
        </button>
      </div>

      <div className={styles.chatContainer}>
        {viewMode === "landing" ? (
          <div className={styles.emptyState}>
            <div className={styles.glowingOrb}></div>
            <h2>Ask me anything, {getUserName()}</h2>
            <p className={styles.emptySubtext}>Your study co-pilot for SmartDriller</p>

            <div className={styles.quickPrompts}>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  className={styles.quickPromptChip}
                  onClick={() => handleQuickPrompt(p.text)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {allMessages.length > 0 && (
              <button className={styles.viewHistoryLink} onClick={viewPreviousMessages}>
                <i className="fas fa-clock-rotate-left"></i> View previous messages
              </button>
            )}
          </div>
        ) : (
          <div
            className={styles.messagesContainer}
            ref={chatContainerRef}
            onScroll={handleScroll}
          >
            {visibleCount < allMessages.length && (
              <div className={styles.loadMore}>Scroll up to see older messages...</div>
            )}

            {displayedMessages.map((message) => {
              const trueIndex = allMessages.indexOf(message)
              return (
                <div key={message.id} className={`${styles.message} ${styles[message.sender]}`}>
                  <div className={styles.messageContent}>
                    <div className={styles.messageText}>
                      {message.sender === "ai" ? (
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      ) : (
                        message.text
                      )}
                    </div>

                    {message.sender === "ai" && (
                      <div className={styles.messageActions}>
                        <button onClick={() => copyToClipboard(message.text)} title="Copy">
                          <i className="far fa-copy"></i>
                        </button>
                        <button onClick={() => retryMessage(trueIndex)} title="Regenerate">
                          <i className="fas fa-sync-alt"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Loading Indicator while waiting for standard API response */}
            {isLoading && (
              <div className={`${styles.message} ${styles.ai}`}>
                <div className={styles.messageContent}>
                  <div className={styles.messageText}>
                    <span className={styles.typingDots}>
                      <span></span><span></span><span></span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {toast && <div className={styles.toast}>{toast}</div>}

        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <button
              onClick={toggleListening}
              className={`${styles.micBtn} ${isListening ? styles.listening : ""}`}
              aria-label="Toggle voice input"
            >
              <i className={`fas fa-microphone${isListening ? "-slash" : ""}`}></i>
            </button>

            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Message AI..."}
              disabled={isLoading}
              className={styles.messageInput}
              rows={1}
            />

            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className={styles.sendBtn}
              aria-label="Send message"
            >
              {isLoading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIAssistant