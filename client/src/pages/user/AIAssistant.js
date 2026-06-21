// AIAssistant.jsx
"use client"

import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { useAuth } from "../../contexts/AuthContext"
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

  // Scroll to bottom when a new message is added or typing happens
  useEffect(() => {
    if (!isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
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

  // Send Message Logic with Streaming support
  const sendMessage = async (overrideText = null) => {
    const textToSend = overrideText || inputMessage
    if (!textToSend.trim() || isLoading) return

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

    const aiMsgId = Date.now() + 1
    // Create an empty AI message that will be filled chunk by chunk
    setAllMessages(prev => [...prev, { id: aiMsgId, text: "", sender: "ai", timestamp: new Date().toISOString() }])

    try {
      const token = localStorage.getItem("token")

      // Get the last 10 messages for context to avoid huge payloads
      const contextHistory = allMessages.slice(-10)

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: textToSend, history: contextHistory }),
      })

      if (!response.ok) throw new Error("Failed to connect")

      // Stream Reader
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() // keep any incomplete line for next chunk

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "")
            if (dataStr === "[DONE]") continue

            try {
              const data = JSON.parse(dataStr)
              if (data.model) {
                setActiveModel(data.model)
              }
              if (data.text) {
                setAllMessages(prev => prev.map(msg =>
                  msg.id === aiMsgId ? { ...msg, text: msg.text + data.text } : msg
                ))
              }
              if (data.error) {
                throw new Error(data.error)
              }
            } catch (e) { /* Ignore partial JSON parses */ }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      setAllMessages(prev => prev.map(msg =>
        msg.id === aiMsgId ? { ...msg, text: "Sorry, I ran into an error. Please try again.", isError: true } : msg
      ))
    } finally {
      setIsLoading(false)
      setActiveModel(null)
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
    // Find the last user message before this AI response and resend it
    const lastUserMsg = allMessages.slice(0, index).reverse().find(m => m.sender === "user")
    if (lastUserMsg) {
      // Remove the failed/old AI response before retrying
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
    }
  }

  const handleQuickPrompt = (text) => {
    setInputMessage(text)
    textareaRef.current?.focus()
  }

  // Calculate which messages to show based on pagination
  const displayedMessages = allMessages.slice(-visibleCount)

  return (
    <div className={styles.aiAssistant}>
      <div className={styles.aiHeader}>
        <button className={styles.iconBtn} onClick={() => window.history.back()} aria-label="Go back">
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
        {allMessages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.glowingOrb}></div>
            <h2>Ask me anything, {getUserName()} ⚡</h2>
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
              const isStreamingNow = isLoading && message.sender === "ai" && trueIndex === allMessages.length - 1
              return (
                <div key={message.id} className={`${styles.message} ${styles[message.sender]}`}>
                  <div className={styles.messageContent}>
                    <div className={styles.messageText}>
                      {message.sender === "ai" ? (
                        message.text ? (
                          <ReactMarkdown>{message.text}</ReactMarkdown>
                        ) : (
                          <span className={styles.typingDots}>
                            <span></span><span></span><span></span>
                          </span>
                        )
                      ) : (
                        message.text
                      )}
                    </div>

                    {message.sender === "ai" && !isStreamingNow && message.text && (
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
