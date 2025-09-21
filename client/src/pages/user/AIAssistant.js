"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/AIAssistant.module.css"
import api from "../../utils/api"

const AIAssistant = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    // Initial greeting when component mounts
    if (user?.fullName) {
      const greeting = {
        id: Date.now(),
        text: `Hi ${user.fullName.trim().split(/\s+/)[1]}! How can I help you today?`,
        sender: "ai",
        timestamp: new Date(),
      }
      setMessages([greeting])
    }
    // Clear history when component unmounts (user leaves)
    return () => {
      setMessages([])
    }
  }, [user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const token = localStorage.getItem("token")
      const response = await api.post(
        "/api/ai/chat",
        {
          message: inputMessage,
          userName: user?.fullName,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          text: response.data.response,
          sender: "ai",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMessage])
      } else {
        throw new Error(response.data.message || "Failed to get AI response")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I encountered an error. Please try again.",
        sender: "ai",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    const greeting = {
      id: Date.now(),
      text: `Hi ${user?.fullName}! How can I help you today?`,
      sender: "ai",
      timestamp: new Date(),
    }
    setMessages([greeting])
  }

  const goBack = () => {
    window.history.back()
  }

  return (
    <div className={styles.aiAssistant}>
      <div className={styles.aiHeader}>
        <button className={styles.backBtn} onClick={goBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className={styles.aiTitle}>
          <h1>AI Assistant</h1>
          <p>Powered by Gemini 2.0</p>
        </div>
        <button className={styles.clearBtn} onClick={clearChat}>
          <i className="fas fa-trash"></i>
        </button>
      </div>
      
      <div className={styles.chatContainer}>
        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div key={message.id} className={`${styles.message} ${styles[message.sender]}`}>
              <div className={styles.messageContent}>
                <div className={styles.messageText}>{message.text}</div>
                <div className={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className={`${styles.message} ${styles.ai}`}>
              <div className={styles.messageContent}>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              rows="1"
              disabled={isLoading}
              className={styles.messageInput}
            />
            <button 
              onClick={sendMessage} 
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