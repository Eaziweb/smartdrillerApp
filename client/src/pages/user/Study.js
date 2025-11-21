"use client"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
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

  // Update ref when state changes
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
      if (!examData) return
      
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
  }, [currentQuestionIndex, examData, studiedQuestions])

  // Stop speech function
  const stopSpeech = () => {
    if (speechRef.current) {
      speechRef.current.cancel()
      setIsReading(false)
      setVoiceReaderOn(false)
    }
  }

  // Read question and options only
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

  // Read question content (for studied questions)
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

  // Toggle voice reader
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

  // Handle study action
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

  // Navigate to question
  const navigateToQuestion = (index) => {
    stopSpeech()
    setCurrentQuestionIndex(index)
  }

  // Handle back navigation
  const handleBack = () => {
    stopSpeech()
    const progressKey = `study_progress_${examData?.course}_${examData?.year}`
    localStorage.removeItem(progressKey)
    navigate("/course-selection?type=study")
  }

  // Initialize component
  useEffect(() => {
    if (!user?.isSubscribed) {
      navigate("/home")
      return
    }
    
    loadExamData()
    loadBookmarks()
    
    const loadKaTeX = async () => {
      try {
        const katexModule = await import('katex')
        const { render, renderToString } = katexModule
        
        window.katex = {
          render,
          renderToString
        }
        
        setKatexLoaded(true)
      } catch (error) {
        console.error("Failed to load KaTeX:", error)
      }
    }
    
    loadKaTeX()
  }, [user, navigate])
  
  // Load progress when exam data is available
  useEffect(() => {
    if (examData && !progressLoaded) {
      loadProgress()
      setProgressLoaded(true)
    }
  }, [examData, progressLoaded])
  
  // Load exam data
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
  
  // Load bookmarks
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
  
  // Load progress
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
  
  // Save progress
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
  
  // Save progress when relevant data changes
  useEffect(() => {
    if (progressLoaded) {
      saveProgress()
    }
  }, [userAnswers, studiedQuestions, showExplanation, currentQuestionIndex, progressLoaded])
  
  // Handle answer selection
  const handleAnswerSelect = (questionId, optionIndex) => {
    if (studiedQuestions.has(questionId)) return
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }))
  }
  
  // Handle bookmark
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
  
  // Handle report submission
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
  
  // Render content with math - FIXED VERSION
  const renderContentWithMath = (content) => {
    if (!content) return null

    if (!katexLoaded) {
      return <span>{content}</span>
    }

    // Improved regex to capture LaTeX expressions
    const latexPattern = /(\\\(.*?\\\)|\\\[.*?\\\]|\$\$.*?\$\$|\$.*?\$|\\[a-zA-Z]+\{.*?\}|\\[a-zA-Z]+)/g
    const parts = content.split(latexPattern)

    return parts.map((part, index) => {
      if (latexPattern.test(part)) {
        let latexContent = part
        let displayMode = false

        // Handle different LaTeX delimiters
        if (part.startsWith('\\(') && part.endsWith('\\)')) {
          latexContent = part.slice(2, -2)
          displayMode = false
        } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
          latexContent = part.slice(2, -2)
          displayMode = true
        } else if (part.startsWith('$$') && part.endsWith('$$')) {
          latexContent = part.slice(2, -2)
          displayMode = true
        } else if (part.startsWith('$') && part.endsWith('$') && part.length > 1) {
          latexContent = part.slice(1, -1)
          displayMode = false
        }

        // Fix common LaTeX formatting issues
        latexContent = latexContent
          .replace(/frac\s*([^\s]+)\s*([^\s]+)/g, '\\frac{$1}{$2}')
          .replace(/sqrt\s*([^\s]+)/g, '\\sqrt{$1}')
          .replace(/([a-zA-Z]+)(\d+)/g, '$1^{$2}')
          .replace(/leq?/g, '\\leq')
          .replace(/geq?/g, '\\geq')
          .replace(/neq/g, '\\neq')
          .replace(/cap/g, '\\cap')
          .replace(/cup/g, '\\cup')
          .replace(/phi/g, '\\phi')
          .replace(/alpha/g, '\\alpha')
          .replace(/beta/g, '\\beta')
          .replace(/gamma/g, '\\gamma')
          .replace(/delta/g, '\\delta')
          .replace(/theta/g, '\\theta')
          .replace(/pi/g, '\\pi')
          .replace(/sigma/g, '\\sigma')
          .replace(/sum/g, '\\sum')
          .replace(/int/g, '\\int')
          .replace(/infty/g, '\\infty')
          .replace(/pm/g, '\\pm')
          .replace(/times/g, '\\times')
          .replace(/div/g, '\\div')
          .replace(/cdot/g, '\\cdot')
          .replace(/ldots/g, '\\ldots')
          .replace(/cdots/g, '\\cdots')
          .replace(/vdots/g, '\\vdots')
          .replace(/ddots/g, '\\ddots')
          .replace(/forall/g, '\\forall')
          .replace(/exists/g, '\\exists')
          .replace(/partial/g, '\\partial')
          .replace(/nabla/g, '\\nabla')

        try {
          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{
                __html: window.katex.renderToString(latexContent, {
                  throwOnError: false,
                  displayMode: displayMode,
                }),
              }}
            />
          )
        } catch (e) {
          console.error("KaTeX render error:", e, "with content:", latexContent)
          return <span key={index}>{part}</span>
        }
      } else {
        return <span key={index}>{part}</span>
      }
    })
  }
  
  // Get image URL with proper fallback
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    
    if (imagePath.startsWith('http')) {
      return imagePath
    }
    if (imagePath.startsWith('/uploads')) {
      return imagePath
    }
    return `/uploads${imagePath}`
  }
  
  // Handle image error
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
  
  // Loading state
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
          {katexLoaded && renderContentWithMath(currentQuestion.question)}
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
                  {katexLoaded && renderContentWithMath(option)}
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
              {katexLoaded && renderContentWithMath(currentQuestion.explanation)}
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
    </div>
  )
}

export default Study