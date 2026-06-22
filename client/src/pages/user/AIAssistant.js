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

  const [allMessages, setAllMessages] = useState([])
  const [visibleCount, setVisibleCount] = useState(15)
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [activeModel, setActiveModel] = useState(null)
  const [toast, setToast] = useState(null)
  const [viewMode, setViewMode] = useState("landing")
  
  // NEW: Image Upload State
  const [selectedImage, setSelectedImage] = useState(null)

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const recognitionRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const getUserName = () => {
    if (!user?.fullName) return "there"
    const nameParts = user.fullName.trim().split(/\s+/)
    return nameParts[0]
  }

  useEffect(() => {
    const saved = localStorage.getItem("chatHistory")
    if (saved) setAllMessages(JSON.parse(saved))
  }, [])

  useEffect(() => {
    if (allMessages.length > 0) {
      localStorage.setItem("chatHistory", JSON.stringify(allMessages))
    }
  }, [allMessages])

  useEffect(() => {
    if (viewMode === "chat" && allMessages.length === 0 && !isLoading) {
      setViewMode("landing")
    }
  }, [viewMode, allMessages.length, isLoading])

  useEffect(() => {
    if (!isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [allMessages, isLoading])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputMessage])

  const handleScroll = () => {
    if (chatContainerRef.current.scrollTop === 0) {
      if (visibleCount < allMessages.length) {
        setVisibleCount(prev => Math.min(prev + 15, allMessages.length))
      }
    }
  }

  // --- Image Handling ---
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setToast("Image is too large (max 5MB).")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedImage({
        file: file,
        base64: reader.result,
        mimeType: file.type
      })
      // Ensure input focuses back after selection
      textareaRef.current?.focus()
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }
  // ----------------------

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

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const sendMessage = async (overrideText = null) => {
    const textToSend = overrideText || inputMessage
    if (!textToSend.trim() && !selectedImage) return // allow sending just an image

    setViewMode("chat")

    const userMsg = {
      id: Date.now(),
      text: textToSend,
      sender: "user",
      timestamp: new Date().toISOString(),
      // Display a tiny thumbnail placeholder in the chat log if sent an image
      hasImage: !!selectedImage 
    }

    setAllMessages(prev => [...prev, userMsg])
    
    // Clear inputs immediately
    if (!overrideText) setInputMessage("")
    const currentImage = selectedImage
    removeImage() 
    
    setIsLoading(true)
    setActiveModel(null)

    const aiMsgId = Date.now() + 1
    setAllMessages(prev => [...prev, { id: aiMsgId, text: "", sender: "ai", timestamp: new Date().toISOString() }])

    try {
      const token = localStorage.getItem("token")
      const contextHistory = allMessages.slice(-10)

      const payload = {
        message: textToSend,
        history: contextHistory
      }

      // Append image data if present
      if (currentImage) {
        payload.imageBase64 = currentImage.base64
        payload.mimeType = currentImage.mimeType
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() 

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "")
            if (dataStr === "[DONE]") continue

            try {
              const data = JSON.parse(dataStr)
              if (data.model) setActiveModel(data.model)
              if (data.text) {
                setAllMessages(prev => prev.map(msg =>
                  msg.id === aiMsgId ? { ...msg, text: msg.text + data.text } : msg
                ))
              }
              if (data.error) throw new Error(data.error)
            } catch (e) {
              if(dataStr.includes("error")) console.error("Stream parse issue:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      setAllMessages(prev => prev.map(msg =>
        msg.id === aiMsgId ? { ...msg, text: `⚠️ Error: ${error.message}`, isError: true } : msg
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
              const isStreamingNow = isLoading && message.sender === "ai" && trueIndex === allMessages.length - 1
              return (
                <div key={message.id} className={`${styles.message} ${styles[message.sender]}`}>
                  <div className={styles.messageContent}>
                    <div className={styles.messageText}>
                      {message.hasImage && (
                         <div className={styles.chatImageIndicator}>
                           <i className="fas fa-image"></i> Image attached
                         </div>
                      )}
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
          {selectedImage && (
            <div className={styles.imagePreviewContainer}>
              <img src={selectedImage.base64} alt="Preview" className={styles.imagePreview} />
              <button className={styles.removeImageBtn} onClick={removeImage}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          <div className={styles.inputWrapper}>
            {/* Hidden File Input */}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              onChange={handleImageSelect} 
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className={styles.attachBtn}
              aria-label="Attach Image"
            >
              <i className="fas fa-paperclip"></i>
            </button>

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
              disabled={(!inputMessage.trim() && !selectedImage) || isLoading}
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
