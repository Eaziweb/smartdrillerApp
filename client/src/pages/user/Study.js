"use client"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import { useAuth } from "../../contexts/AuthContext"
import api from "../../utils/api"
import styles from "../../styles/study.module.css"
import 'katex/dist/katex.min.css'

const Study = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [examData, setExamData] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [studiedQuestions, setStudiedQuestions] = useState(new Set())
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState(new Set())
  const [showExplanation, setShowExplanation] = useState({})
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportDescription, setReportDescription] = useState("")
  const [submittingReport, setSubmittingReport] = useState(false)
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [katexLoaded, setKatexLoaded] = useState(false)
  
  // Voice reader states
  const [voiceReaderOn, setVoiceReaderOn] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const speechRef = useRef(null)
  const contentRef = useRef(null)
  const voiceReaderOnRef = useRef(voiceReaderOn)

  // AI Integration States
  const [showAiModal, setShowAiModal] = useState(false)
  const [showSubWarning, setShowSubWarning] = useState(false)
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const chatEndRef = useRef(null)

  // Update voice ref when state changes
  useEffect(() => {
    voiceReaderOnRef.current = voiceReaderOn
  }, [voiceReaderOn])

  // Check if speech synthesis is supported
  useEffect(() => {
    setSpeechSupported('speechSynthesis' in window)
  }, [])

  // Initialize speech synthesis
  useEffect(() => {
    if (speechSupported) {
      speechRef.current = window.speechSynthesis
    }
  }, [speechSupported])

  // Scroll to bottom of AI chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [aiMessages, isAiLoading])

  // Handle voice reader when question changes
  useEffect(() => {
    if (voiceReaderOnRef.current && speechSupported && examData) {
      const currentQuestion = examData.questions[currentQuestionIndex]
      const isStudied = studiedQuestions.has(currentQuestion._id)
      
      stopSpeech()
      
      if (isStudied) {
        readQuestionContent(currentQuestion, true)
      } else {
        readQuestionAndOptions(currentQuestion)
      }
    }
    
    return () => {
      stopSpeech()
    }
  }, [currentQuestionIndex, examData, speechSupported])

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger keyboard nav if the user is typing in a modal
      if (!examData || showReportModal || showAiModal) return
      
      switch(e.key) {
        case 'ArrowLeft':
          if (currentQuestionIndex > 0) {
            navigateToQuestion(currentQuestionIndex - 1)
          }
          break
        case 'ArrowRight':
          if (currentQuestionIndex < examData.questions.length - 1) {
            navigateToQuestion(currentQuestionIndex + 1)
          }
          break
        case 'Enter':
          if (!studiedQuestions.has(examData.questions[currentQuestionIndex]._id)) {
            handleStudy(examData.questions[currentQuestionIndex]._id)
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentQuestionIndex, examData, studiedQuestions, showReportModal, showAiModal])

  // Process content with KaTeX when it changes
  useEffect(() => {
    if (katexLoaded && examData && contentRef.current) {
      processMathContent()
    }
  }, [katexLoaded, currentQuestionIndex, examData, showExplanation])

  const processMathContent = () => {
    if (!window.katex) return
    
    const mathElements = contentRef.current.querySelectorAll('.math-content')
    
    mathElements.forEach(element => {
      const content = element.getAttribute('data-math')
      if (content) {
        try {
          const renderedMath = window.katex.renderToString(content, {
            throwOnError: false,
            displayMode: element.classList.contains('display-math')
          })
          element.innerHTML = renderedMath
        } catch (e) {
          console.error("KaTeX rendering error:", e)
          element.innerHTML = content 
        }
      }
    })
  }

  // --- Voice Reader Functions ---
  const stopSpeech = () => {
    if (speechRef.current) {
      speechRef.current.cancel()
      setIsReading(false)
      setVoiceReaderOn(false)
    }
  }

  const readQuestionAndOptions = (question) => {
    if (!speechRef.current) return
    
    const cleanText = (text) => {
      return text
        .replace(/\\\(.*?\\\)/g, '')
        .replace(/\\\[.*?\\\]/g, '')
        .replace(/\$\$.*?\$\$/g, '')
        .replace(/\$.*?\$/g, '')
        .replace(/\\[a-zA-Z]+/g, '')
        .replace(/[{}]/g, '')
        .replace(/<[^>]*>?/gm, '') // strip HTML
        .trim()
    }
    
    let textToRead = `Question: ${cleanText(question.question)}. Options: `
    
    question.options.forEach((option, index) => {
      textToRead += `${String.fromCharCode(65 + index)}. ${cleanText(option)}. `
    })
    
    const utterance = new SpeechSynthesisUtterance(textToRead)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onstart = () => setIsReading(true)
    utterance.onend = () => {
      setIsReading(false)
      setVoiceReaderOn(false)
    }
    utterance.onerror = () => {
      setIsReading(false)
      setVoiceReaderOn(false)
    }
    
    speechRef.current.speak(utterance)
  }

  const readQuestionContent = (question, isStudied) => {
    if (!speechRef.current || !isStudied) return
    
    const cleanText = (text) => {
      return text
        .replace(/\\\(.*?\\\)/g, '')
        .replace(/\\\[.*?\\\]/g, '')
        .replace(/\$\$.*?\$\$/g, '')
        .replace(/\$.*?\$/g, '')
        .replace(/\\[a-zA-Z]+/g, '')
        .replace(/[{}]/g, '')
        .replace(/<[^>]*>?/gm, '') // strip HTML
        .trim()
    }
    
    let textToRead = `Question: ${cleanText(question.question)}. `
    
    const correctOptionIndex = question.correctOption - 1
    textToRead += `The correct answer is: ${String.fromCharCode(65 + correctOptionIndex)}. ${cleanText(question.options[correctOptionIndex])}. `
    
    const userAnswer = userAnswers[question._id]
    if (userAnswer !== undefined && userAnswer !== question.correctOption) {
      const wrongOptionIndex = userAnswer - 1
      textToRead += `Your answer was: ${String.fromCharCode(65 + wrongOptionIndex)}. ${cleanText(question.options[wrongOptionIndex])}. `
    }
    
    textToRead += `Explanation: ${cleanText(question.explanation)}`
    
    const utterance = new SpeechSynthesisUtterance(textToRead)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onstart = () => setIsReading(true)
    utterance.onend = () => {
      setIsReading(false)
      setVoiceReaderOn(false)
    }
    utterance.onerror = () => {
      setIsReading(false)
      setVoiceReaderOn(false)
    }
    
    speechRef.current.speak(utterance)
  }

  const toggleVoiceReader = () => {
    if (isReading) {
      stopSpeech()
      return
    }
    
    const newState = !voiceReaderOn
    setVoiceReaderOn(newState)
    
    if (newState && speechSupported && examData) {
      const currentQuestion = examData.questions[currentQuestionIndex]
      const isStudied = studiedQuestions.has(currentQuestion._id)
      
      if (speechRef.current) {
        speechRef.current.cancel()
      }
      
      if (isStudied) {
        readQuestionContent(currentQuestion, true)
      } else {
        readQuestionAndOptions(currentQuestion)
      }
    }
  }

  // --- AI Integration Functions ---
  const handleAiClick = () => {
    if (!user?.isSubscribed) {
      setShowSubWarning(true)
      return
    }
    setShowAiModal(true)
  }

  const sendAiMessage = async (textToSend = aiInput) => {
    if (!textToSend.trim() || isAiLoading) return

    const userMsg = { id: Date.now(), text: textToSend, sender: "user" }
    setAiMessages(prev => [...prev, userMsg])
    if (textToSend === aiInput) setAiInput("") 
    setIsAiLoading(true)

    try {
      const response = await api.post("/api/ai/chat", {
        message: textToSend,
        history: aiMessages.slice(-10),
        userName: user?.fullName?.split(' ')[0] || "Student"
      })

      if (response.data.success) {
        setAiMessages(prev => [...prev, {
          id: Date.now(),
          text: response.data.text,
          sender: "ai"
        }])
      }
    } catch (error) {
      console.error("AI Error:", error)
      setAiMessages(prev => [...prev, {
        id: Date.now(),
        text: "Sorry, I ran into an error connecting to the server. Please try again.",
        sender: "ai",
        isError: true
      }])
    } finally {
      setIsAiLoading(false)
    }
  }

  const askAboutCurrentQuestion = () => {
    const q = examData.questions[currentQuestionIndex]
    const cleanText = (text) => text.replace(/<[^>]*>?/gm, '') 
    
    let prompt = `Can you explain this question and help me find the answer?\n\nQuestion: ${cleanText(q.question)}\nOptions:\n`
    q.options.forEach((opt, i) => {
      prompt += `${String.fromCharCode(65 + i)}. ${cleanText(opt)}\n`
    })
    
    sendAiMessage(prompt)
  }

  const generateSimilarQuestion = () => {
    const q = examData.questions[currentQuestionIndex]
    const cleanText = (text) => text.replace(/<[^>]*>?/gm, '')
    
    const prompt = `Based on this concept, please generate a brand new, similar practice question to test my knowledge.\n\nOriginal Question: ${cleanText(q.question)}\n\nPlease provide 4 options, indicate the correct answer, and give a brief explanation.`
    
    sendAiMessage(prompt)
  }

  // --- Core Study Functions ---
  const handleStudy = async (questionId) => {
    setStudiedQuestions((prev) => new Set([...prev, questionId]))
    setShowExplanation((prev) => ({ ...prev, [questionId]: true }))

    if (voiceReaderOn && speechSupported && examData) {
      const currentQuestion = examData.questions[currentQuestionIndex]
      if (currentQuestion._id === questionId) {
        stopSpeech()
        readQuestionContent(currentQuestion, true)
      }
    }

    try {
      await api.post("/api/questions/study-progress", { questionId })
    } catch (error) {
      console.error("Failed to record study progress:", error)
    }
  }

  const navigateToQuestion = (index) => {
    stopSpeech()
    setCurrentQuestionIndex(index)
  }

  const handleBack = () => {
    stopSpeech()
    const progressKey = `study_progress_${examData?.course}_${examData?.year}`
    localStorage.removeItem(progressKey)
    navigate("/course-selection?type=study")
  }

  // Initialize component
  useEffect(() => {
    loadExamData()
    loadBookmarks()
    
    const loadKaTeX = async () => {
      try {
        const katexModule = await import('katex')
        const { render, renderToString } = katexModule
        
        window.katex = { render, renderToString }
        setKatexLoaded(true)
      } catch (error) {
        console.error("Failed to load KaTeX:", error)
      }
    }
    
    loadKaTeX()
  }, [navigate])
  
  // Load progress when exam data is available
  useEffect(() => {
    if (examData && !progressLoaded) {
      loadProgress()
      setProgressLoaded(true)
    }
  }, [examData, progressLoaded])
  
  const loadExamData = () => {
    try {
      const storedData = localStorage.getItem("currentExam")
      if (!storedData) {
        navigate("/course-selection?type=study")
        return
      }
      const data = JSON.parse(storedData)
      if (data.examType !== "study") {
        navigate("/course-selection?type=study")
        return
      }
      setExamData(data)
      setLoading(false)
    } catch (error) {
      console.error("Failed to load exam data:", error)
      navigate("/course-selection?type=study")
    }
  }
  
  const loadBookmarks = async () => {
    try {
      const response = await api.get("/api/bookmarks")
      const bookmarks = new Set()
      Object.values(response.data.bookmarks).forEach((courseBookmarks) => {
        courseBookmarks.forEach((bookmark) => {
          bookmarks.add(bookmark.question._id)
        })
      })
      setBookmarkedQuestions(bookmarks)
    } catch (error) {
      console.error("Failed to load bookmarks:", error)
    }
  }
  
  const loadProgress = () => {
    if (!examData) return
    try {
      const progressKey = `study_progress_${examData.course}_${examData.year}`
      const savedProgress = localStorage.getItem(progressKey)
      if (savedProgress) {
        const progress = JSON.parse(savedProgress)
        setUserAnswers(progress.userAnswers || {})
        setStudiedQuestions(new Set(progress.studiedQuestions || []))
        setShowExplanation(progress.showExplanation || {})
        setCurrentQuestionIndex(progress.currentQuestionIndex || 0)
      }
    } catch (error) {
      console.error("Failed to load progress:", error)
    }
  }
  
  const saveProgress = () => {
    if (!examData) return
    try {
      const progressKey = `study_progress_${examData.course}_${examData.year}`
      const progress = {
        userAnswers,
        studiedQuestions: Array.from(studiedQuestions),
        showExplanation,
        currentQuestionIndex,
        timestamp: Date.now(),
      }
      localStorage.setItem(progressKey, JSON.stringify(progress))
    } catch (error) {
      console.error("Failed to save progress:", error)
    }
  }
  
  useEffect(() => {
    if (progressLoaded) {
      saveProgress()
    }
  }, [userAnswers, studiedQuestions, showExplanation, currentQuestionIndex, progressLoaded])
  
  const handleAnswerSelect = (questionId, optionIndex) => {
    if (studiedQuestions.has(questionId)) return
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }))
  }
  
  const handleBookmark = async (questionId) => {
    try {
      if (bookmarkedQuestions.has(questionId)) {
        await api.delete(`/api/bookmarks/${questionId}`)
        setBookmarkedQuestions((prev) => {
          const newSet = new Set(prev)
          newSet.delete(questionId)
          return newSet
        })
      } else {
        await api.post("/api/bookmarks/add", { questionId })
        setBookmarkedQuestions((prev) => new Set([...prev, questionId]))
      }
    } catch (error) {
      console.error("Bookmark error:", error)
    }
  }
  
  const handleReport = async () => {
    if (!reportDescription.trim()) return
    setSubmittingReport(true)
    try {
      const currentQuestion = examData.questions[currentQuestionIndex]
      await api.post("/api/reports/submit", {
        questionId: currentQuestion._id,
        description: reportDescription,
      })
      setShowReportModal(false)
      setReportDescription("")
    } catch (error) {
      console.error("Report error:", error)
    } finally {
      setSubmittingReport(false)
    }
  }
  
  const renderContentWithMath = (content) => {
    if (!content) return null
    
    const latexPattern = /(\\\(.*?\\\)|\\\[.*?\\\]|\$\$.*?\$\$|\$.*?\$)/g
    const parts = content.split(latexPattern)
    
    return parts.map((part, index) => {
      if (index % 2 === 1) { 
        const isDisplay = part.startsWith('\\[') || part.startsWith('$$')
        
        let latexContent = part
        if (part.startsWith('\\(')) latexContent = part.slice(2, -2)
        if (part.startsWith('\\[')) latexContent = part.slice(2, -2)
        if (part.startsWith('$') && !part.startsWith('$$')) latexContent = part.slice(1, -1)
        if (part.startsWith('$$')) latexContent = part.slice(2, -2)
        
        return (
          <span 
            key={index} 
            className={`math-content ${isDisplay ? 'display-math' : 'inline-math'}`}
            data-math={latexContent}
          />
        )
      } else {
        return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />
      }
    })
  }
  
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    if (imagePath.startsWith('/uploads')) return imagePath
    return `/uploads${imagePath}`
  }
  
  const handleImageError = (e) => {
    e.target.onerror = null
    e.target.style.display = 'none'
    
    const container = e.target.parentElement
    if (container && container.classList.contains(styles.questionImage)) {
      if (!container.querySelector('.image-fallback')) {
        const fallback = document.createElement('div')
        fallback.className = 'image-fallback'
        fallback.innerHTML = '<i class="fas fa-image"></i><span>Image not available</span>'
        fallback.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #666;'
        container.appendChild(fallback)
      }
    }
  }
  
  // Render loading state
  if (loading || !examData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading questions...</p>
      </div>
    )
  }
  
  const currentQuestion = examData.questions[currentQuestionIndex]
  const isStudied = studiedQuestions.has(currentQuestion._id)
  const userAnswer = userAnswers[currentQuestion._id]
  const showExp = showExplanation[currentQuestion._id]
  
  return (
    <div className={styles.studyPage} ref={contentRef}>
      <div className={styles.quizHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={handleBack}>
            <i className="fa fa-arrow-left"></i>
          </button>
          <div className={styles.subjectInfo}>
            <h2>{examData.course.toUpperCase()}</h2>
            <span>Question {currentQuestionIndex + 1} of {examData.questions.length}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          {/* AI Tutor Button */}
          <button 
            className={`${styles.iconBtn} ${styles.aiBtn}`} 
            onClick={handleAiClick}
            title="Ask AI Tutor"
          >
            <i className="fas fa-robot"></i>
          </button>

          {speechSupported && (
            <button 
              className={`${styles.iconBtn} ${isReading ? styles.active : ''}`}
              onClick={toggleVoiceReader}
              title={isReading ? "Stop reading" : "Start voice reader"}
            >
              <i className={`fas ${isReading ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
              {isReading && <span className={styles.readingIndicator}></span>}
            </button>
          )}
          <button
            className={`${styles.iconBtn} ${styles.bookmarkBtn} ${bookmarkedQuestions.has(currentQuestion._id) ? styles.active : ""}`}
            onClick={() => handleBookmark(currentQuestion._id)}
          >
            <i className="fas fa-bookmark"></i>
          </button>
          <button className={styles.iconBtn} onClick={() => setShowReportModal(true)}>
            <i className="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>
      
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${(studiedQuestions.size / examData.questions.length) * 100}%`,
            }}
          ></div>
        </div>
      </div>
      
      <div className={styles.questionContainer}>
        {(currentQuestion.cloudinaryUrl || currentQuestion.image) && (
          <div className={styles.questionImage}>
            <img 
              src={getImageUrl(currentQuestion.cloudinaryUrl || currentQuestion.image)} 
              alt="Question illustration" 
              onError={handleImageError}
            />
          </div>
        )}
        <div className={styles.questionText}>
          {renderContentWithMath(currentQuestion.question)}
        </div>
        <div className={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const optionNumber = index + 1
            const isSelected = userAnswer === optionNumber
            const isCorrect = currentQuestion.correctOption === optionNumber
            const showCorrect = isStudied && isCorrect
            const showWrong = isStudied && isSelected && !isCorrect
            
            return (
              <div
                key={index}
                className={`${styles.option} ${isSelected ? styles.selected : ""} ${showCorrect ? styles.correct : ""} ${showWrong ? styles.wrong : ""}`}
                onClick={() => handleAnswerSelect(currentQuestion._id, optionNumber)}
              >
                <div className={styles.optionLetter}>{String.fromCharCode(65 + index)}</div>
                <div className={styles.optionText}>
                  {renderContentWithMath(option)}
                </div>
                {showCorrect && <i className={`fas fa-check ${styles.optionIcon} ${styles.correctIcon}`}></i>}
                {showWrong && <i className={`fas fa-times ${styles.optionIcon} ${styles.wrongIcon}`}></i>}
              </div>
            )
          })}
        </div>
        {showExp && (
          <div className={styles.explanationContainer}>
            <div className={styles.explanationHeader}>
              <i className="fas fa-lightbulb"></i>
              <span>Explanation</span>
            </div>
            <div className={styles.explanationText}>
              {renderContentWithMath(currentQuestion.explanation)}
            </div>
          </div>
        )}
      </div>
      
      <div className={styles.questionGrid}>
        {examData.questions.map((_, index) => {
          const questionId = examData.questions[index]._id
          const isCurrentQuestion = index === currentQuestionIndex
          const isStudiedQuestion = studiedQuestions.has(questionId)
          return (
            <button
              key={index}
              className={`${styles.gridItem} ${isCurrentQuestion ? styles.current : ""} ${isStudiedQuestion ? styles.studied : ""}`}
              onClick={() => navigateToQuestion(index)}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
      
      <div className={styles.navigationContainer}>
        <button
          className={styles.navBtn}
          onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
          title="Previous Question (Left Arrow)"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        
        <button 
          className={`${styles.studyBtn} ${isStudied ? styles.studiedBtn : ''}`}
          onClick={() => handleStudy(currentQuestion._id)}
          disabled={isStudied}
          title="Study Question (Enter)"
        >
          {isStudied ? "Studied" : "Study"}
        </button>
        
        <button
          className={styles.navBtn}
          onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
          disabled={currentQuestionIndex === examData.questions.length - 1}
          title="Next Question (Right Arrow)"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
      
      {/* Report Modal */}
      {showReportModal && (
        <div className={styles.reportModalOverlay}>
          <div className={styles.reportModal}>
            <div className={styles.reportModalHeader}>
              <h3>Report Question</h3>
              <button className={styles.closeBtn} onClick={() => setShowReportModal(false)}>
                &times;
              </button>
            </div>
            <div className={styles.reportModalBody}>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe the problem with this question..."
                rows="4"
              />
            </div>
            <div className={styles.reportModalFooter}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowReportModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleReport} disabled={submittingReport}>
                {submittingReport ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Warning Modal */}
      {showSubWarning && (
        <div className={styles.reportModalOverlay}>
          <div className={styles.reportModal} style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: '1rem' }}>
              <i className="fas fa-crown"></i>
            </div>
            <h3 style={{ marginBottom: '1rem' }}>Premium Feature</h3>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
              The SmartDriller AI Tutor is available exclusively to subscribed students. Upgrade to get instant explanations and custom practice questions!
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowSubWarning(false)}>
                Maybe Later
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate('/subscription')}>
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen AI Modal */}
      {showAiModal && (
        <div className={styles.aiModalOverlay}>
          <div className={styles.aiModalContainer}>
            <div className={styles.aiModalHeader}>
              <div>
                <h3><i className="fas fa-robot"></i> SmartDriller AI Tutor</h3>
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Powered by Gemini</span>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowAiModal(false)}>
                &times;
              </button>
            </div>

            <div className={styles.aiChatArea}>
              {aiMessages.length === 0 ? (
                <div className={styles.aiEmptyState}>
                  <p>How can I help you with this topic?</p>
                  <div className={styles.quickActionsGrid}>
                    <button onClick={askAboutCurrentQuestion} className={styles.quickActionBtn}>
                      <i className="fas fa-question-circle"></i> Explain Current Question
                    </button>
                    <button onClick={generateSimilarQuestion} className={styles.quickActionBtn}>
                      <i className="fas fa-random"></i> Generate Similar Question
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.messagesList}>
                  {aiMessages.map(msg => (
                    <div key={msg.id} className={`${styles.chatMsg} ${styles[msg.sender]}`}>
                      <div className={styles.msgBubble}>
                        {msg.sender === "ai" ? (
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </div>
                  ))}
                  {isAiLoading && (
                    <div className={`${styles.chatMsg} ${styles.ai}`}>
                      <div className={styles.msgBubble}>
                        <i className="fas fa-spinner fa-spin"></i> Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className={styles.aiInputArea}>
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendAiMessage()
                  }
                }}
                placeholder="Ask a question..."
                rows="2"
                disabled={isAiLoading}
              />
              <button 
                onClick={() => sendAiMessage()} 
                disabled={!aiInput.trim() || isAiLoading}
                className={styles.sendAiBtn}
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Study
