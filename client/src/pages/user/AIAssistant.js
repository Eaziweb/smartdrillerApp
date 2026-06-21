// AIAssistant.jsx
"use client"

import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/AIAssistant.module.css"

const AIAssistant = () => {
  const { user } = useAuth()
  
  const [allMessages, setAllMessages] = useState([])
  const [visibleCount, setVisibleCount] = useState(15)
  
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)

  // Dynamically get user's first name
  const getUserName = () => {
    if (!user?.fullName) return "there"
    const nameParts = user.fullName.trim().split(/\s+/)
    return nameParts[0]
  }

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("chatHistory")
    if (saved) {
      setAllMessages(JSON.parse(saved))
    }
  }, [])

  // Save to local storage
  useEffect(() => {
    if (allMessages.length > 0) {
      localStorage.setItem("chatHistory", JSON.stringify(allMessages))
    }
  }, [allMessages])

  // Scroll to bottom
  useEffect(() => {
    if (!isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [allMessages, isLoading])

  // Pagination
  const handleScroll = () => {
    if (chatContainerRef.current.scrollTop === 0) {
      if (visibleCount < allMessages.length) {
        setVisibleCount(prev => Math.min(prev + 15, allMessages.length))
      }
    }
  }

  // Speech to Text
  const toggleListening = () => {
    if (isListening) stopListening()
    else startListening()
  }

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Browser doesn't support speech recognition.")
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

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
    }
  }, [])

  // Send Message & Stream Logic
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

    const aiMsgId = Date.now() + 1
    setAllMessages(prev => [...prev, { id: aiMsgId, text: "", sender: "ai", timestamp: new Date().toISOString() }])

    try {
      const token = localStorage.getItem("token")
      const contextHistory = allMessages.slice(-10)

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: textToSend, history: contextHistory }),
      })

      if (!response.ok) throw new Error("Failed to connect to AI")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "")
            if (dataStr === "[DONE]") break
            
            try {
              const data = JSON.parse(dataStr)
              if (data.text) {
                setAllMessages(prev => prev.map(msg => 
                  msg.id === aiMsgId ? { ...msg, text: msg.text + data.text } : msg
                ))
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      setAllMessages(prev => prev.map(msg => 
        msg.id === aiMsgId ? { ...msg, text: "Sorry, I encountered an error communicating with the AI. Please try again." } : msg
      ))
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
  }

  const retryMessage = (index) => {
    const lastUserMsg = allMessages.slice(0, index).reverse().find(m => m.sender === "user")
    if (lastUserMsg) sendMessage(lastUserMsg.text)
  }

  const clearChat = () => {
    setAllMessages([])
    localStorage.removeItem("chatHistory")
  }

  const displayedMessages = allMessages.slice(-visibleCount)

  return (
    <div className={styles.aiAssistant}>
      <div className={styles.aiHeader}>
        <button className={styles.iconBtn} onClick={() => window.history.back()}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className={styles.aiTitle}>
          <h1>SmartDriller AI</h1>
        </div>
        <button className={styles.iconBtn} onClick={clearChat} title="Clear Chat">
          <i className="fas fa-trash"></i>
        </button>
      </div>
      
      <div className={styles.chatContainer}>
        {allMessages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.glowingOrb}></div>
            <h2>Ask me anything, {getUserName()} ⚡</h2>
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

            {displayedMessages.map((message, index) => (
              <div key={message.id} className={`${styles.message} ${styles[message.sender]}`}>
                <div className={styles.messageContent}>
                  <div className={styles.messageText}>
                    {message.sender === "ai" ? (
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    ) : (
                      message.text
                    )}
                  </div>
                  
                  {message.sender === "ai" && !isLoading && (
                    <div className={styles.messageActions}>
                      <button onClick={() => copyToClipboard(message.text)} title="Copy">
                        <i className="far fa-copy"></i>
                      </button>
                      <button onClick={() => retryMessage(allMessages.indexOf(message))} title="Regenerate">
                        <i className="fas fa-sync-alt"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <div ref={messagesEndRef} />
          </div>
        )}
        
        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <button 
              onClick={toggleListening}
              className={`${styles.micBtn} ${isListening ? styles.listening : ""}`}
            >
              <i className={`fas fa-microphone${isListening ? "-slash" : ""}`}></i>
            </button>

            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Message AI..."}
              disabled={isLoading}
              className={styles.messageInput}
            />
            
            <button 
              onClick={() => sendMessage()} 
              disabled={!inputMessage.trim() || isLoading} 
              className={styles.sendBtn}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIAssistant
