"use client"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/mock.module.css"
// Import KaTeX CSS
import 'katex/dist/katex.min.css'
import api from "../../utils/api";

const Mock = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [examData, setExamData] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportDescription, setReportDescription] = useState("")
  const [submittingReport, setSubmittingReport] = useState(false)
  const [showQuitModal, setShowQuitModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [katexLoaded, setKatexLoaded] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState(false)
  
  // Voice reader states
  const [voiceReaderOn, setVoiceReaderOn] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isReading, setIsReading] = useState(false)
  
  const timerRef = useRef(null)
  const contentRef = useRef(null)
  const speechRef = useRef(null)
  const voiceReaderOnRef = useRef(voiceReaderOn)

  // Update ref when state changes
  useEffect(() => {
    voiceReaderOnRef.current = voiceReaderOn;
  }, [voiceReaderOn]);

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

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!examData) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          if (currentQuestionIndex > 0) {
            navigateToQuestion(currentQuestionIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (currentQuestionIndex < examData.questions.length - 1) {
            navigateToQuestion(currentQuestionIndex + 1);
          }
          break;
        case 'Enter':
          submitMock();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentQuestionIndex, examData, userAnswers]);

  // Load KaTeX
  useEffect(() => {
    if (!user?.isSubscribed) {
      navigate("/home")
      return
    }
    
    loadExamData()
    
    // Load KaTeX dynamically
    const loadKaTeX = async () => {
      try {
        const katexModule = await import('katex')
        const { render, renderToString } = katexModule
        
        // Store KaTeX functions globally for easy access
        window.katex = {
          render,
          renderToString
        }
        
        setKatexLoaded(true)
        console.log("KaTeX loaded successfully")
      } catch (error) {
        console.error("Failed to load KaTeX:", error)
      }
    }
    
    loadKaTeX()
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [user, navigate])
  
  // Process content with KaTeX when it changes
  useEffect(() => {
    if (katexLoaded && examData && contentRef.current) {
      processMathContent()
    }
  }, [katexLoaded, currentQuestionIndex, examData])
  
  const processMathContent = () => {
    if (!window.katex) return
    
    // Find all elements with math content
    const mathElements = contentRef.current.querySelectorAll('.math-content')
    
    mathElements.forEach(element => {
      const content = element.getAttribute('data-math')
      if (content) {
        try {
          // Render the math content
          const renderedMath = window.katex.renderToString(content, {
            throwOnError: false,
            displayMode: element.classList.contains('display-math')
          })
          element.innerHTML = renderedMath
        } catch (e) {
          console.error("KaTeX rendering error:", e)
          element.innerHTML = content // Fallback to raw content
        }
      }
    })
  }
  
  // Helper function to render content with math - FIXED VERSION
  const renderContentWithMath = (content, isDisplayMode = false) => {
    if (!content) return null
    
    // Simple regex to find LaTeX patterns - FIXED
    const latexPattern = /(\\\(.*?\\\)|\\\[.*?\\\]|\$\$.*?\$\$|\$.*?\$)/g
    
    // Split content by LaTeX patterns
    const parts = content.split(latexPattern)
    
    return parts.map((part, index) => {
      if (index % 2 === 1) { // This is a LaTeX expression
        // Determine if it's display mode
        const isDisplay = part.startsWith('\\[') || part.startsWith('$$')
        
        // Extract the actual LaTeX content
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
        // Regular HTML content
        return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />
      }
    })
  }
  
  // Load progress only after exam data is available
  useEffect(() => {
    if (examData && !progressLoaded) {
      loadProgress()
      setProgressLoaded(true)
    }
  }, [examData, progressLoaded])
  
  useEffect(() => {
    if (progressLoaded && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [timeRemaining, progressLoaded])
  
  // Handle voice reader when question changes
  useEffect(() => {
    if (voiceReaderOnRef.current && speechSupported && examData) {
      const currentQuestion = examData.questions[currentQuestionIndex]
      
      // Stop any ongoing speech
      stopSpeech()
      
      // Read question and options
      readQuestionAndOptions(currentQuestion)
    }
    
    return () => {
      stopSpeech()
    }
  }, [currentQuestionIndex, examData, speechSupported])

  // Function to stop speech and reset states
  const stopSpeech = () => {
    if (speechRef.current) {
      speechRef.current.cancel()
      setIsReading(false)
      setVoiceReaderOn(false)
    }
  }

  // Function to read question and options only
  const readQuestionAndOptions = (question) => {
    if (!speechRef.current) return
    
    // Clean LaTeX expressions from text
    const cleanText = (text) => {
      return text
        .replace(/\\\(.*?\\\)/g, '') // Remove inline math
        .replace(/\\\[.*?\\\]/g, '') // Remove display math
        .replace(/\$\$.*?\$\$/g, '') // Remove display math with $$         
        .replace(/\$.*?\$/g, '')     // Remove inline math with $         
        .replace(/\\[a-zA-Z]+/g, '') // Remove LaTeX commands
        .replace(/[{}]/g, '')        // Remove braces
        .trim()
    }
    
    // Prepare text to read
    let textToRead = `Question: ${cleanText(question.question)}. Options: `
    
    // Add all options
    question.options.forEach((option, index) => {
      textToRead += `${String.fromCharCode(65 + index)}. ${cleanText(option)}. `
    })
    
    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(textToRead)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    
    // Set up event handlers
    utterance.onstart = () => setIsReading(true)
    utterance.onend = () => {
      setIsReading(false)
      setVoiceReaderOn(false)
    }
    utterance.onerror = () => {
      setIsReading(false)
      setVoiceReaderOn(false)
    }
    
    // Speak the text
    speechRef.current.speak(utterance)
  }

  // Toggle voice reader
  const toggleVoiceReader = () => {
    // If currently reading, just stop and turn off
    if (isReading) {
      stopSpeech()
      return
    }
    
    // If not reading, toggle the state
    const newState = !voiceReaderOn
    setVoiceReaderOn(newState)
    
    if (newState && speechSupported && examData) {
      const currentQuestion = examData.questions[currentQuestionIndex]
      
      // Cancel any ongoing speech (shouldn't be any because isReading is false, but just in case)
      if (speechRef.current) {
        speechRef.current.cancel()
      }
      
      readQuestionAndOptions(currentQuestion)
    }
  }
  
  const loadExamData = () => {
    try {
      const storedData = localStorage.getItem("currentExam")
      if (!storedData) {
        navigate("/course-selection?type=mock")
        return
      }
      const data = JSON.parse(storedData)
      if (data.examType !== "mock") {
        navigate("/course-selection?type=mock")
        return
      }
      
      // Validate timeAllowed is set and is a positive number
      if (!data.timeAllowed || data.timeAllowed <= 0) {
        console.error("Invalid timeAllowed in exam data:", data.timeAllowed)
        navigate("/course-selection?type=mock")
        return
      }
      
      setExamData(data)
      setLoading(false)
    } catch (error) {
      console.error("Failed to load exam data:", error)
      navigate("/course-selection?type=mock")
    }
  }
  
  const loadProgress = () => {
    if (!examData) return
    try {
      const progressKey = `mock_progress_${examData.course}_${examData.year}`
      const savedProgress = localStorage.getItem(progressKey)
      if (savedProgress) {
        const progress = JSON.parse(savedProgress)
        setUserAnswers(progress.userAnswers || {})
        setCurrentQuestionIndex(progress.currentQuestionIndex || 0)
        // Use saved time if available, otherwise use the exam time allowed
        setTimeRemaining(progress.timeRemaining || (examData.timeAllowed * 60))
      } else {
        // Set initial time from exam data
        setTimeRemaining(examData.timeAllowed * 60)
      }
    } catch (error) {
      console.error("Failed to load progress:", error)
      // Set default time if there's an error
      setTimeRemaining(examData.timeAllowed * 60)
    }
  }
  
  const saveProgress = () => {
    if (!examData || !progressLoaded) return
    try {
      const progressKey = `mock_progress_${examData.course}_${examData.year}`
      const progress = {
        userAnswers,
        currentQuestionIndex,
        timeRemaining,
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
  }, [userAnswers, currentQuestionIndex, timeRemaining, progressLoaded])
  
  const handleAnswerSelect = (questionId, optionIndex) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }))
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
  
  const handleBack = () => {
    stopSpeech()
    setShowQuitModal(true)
  }
  
  const handleQuit = () => {
    const progressKey = `mock_progress_${examData?.course}_${examData?.year}`
    localStorage.removeItem(progressKey)
    navigate("/course-selection?type=mock")
  }
  
  const handleAutoSubmit = () => {
    // Clear the timer first
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    // Show a message that time is up
    setTimeout(() => {
      submitMock()
    }, 2000) // Wait 2 seconds before auto-submitting
  }
  
  const submitMock = async () => {
    if (submitting) return
    setSubmitting(true)
    setSubmitError("")
    setSubmitSuccess(false)
    
    try {
      const questions = examData.questions.map((question) => {
        const selectedOption = userAnswers[question._id] || 0
        const isCorrect = selectedOption === question.correctOption
        return {
          questionId: question._id,
          selectedOption,
          isCorrect,
        }
      })
      
      const timeUsed = examData.timeAllowed - Math.floor(timeRemaining / 60)
      
      const resultData = {
        course: examData.course,
        year: examData.year,
        topics: examData.topics === "all" ? [] : examData.topics.split(","),
        totalQuestions: examData.questions.length,
        timeAllowed: examData.timeAllowed,
        timeUsed: Math.max(timeUsed, 0),
        questions,
      }

      const response = await api.post("/api/results/submit", resultData)
      
      if (!response.data) {
        throw new Error("No response from server")
      }
      
      if (response.data.result) {
        setSubmitSuccess(true)
        localStorage.setItem("latestResult", JSON.stringify(response.data.result))
        const progressKey = `mock_progress_${examData.course}_${examData.year}`
        localStorage.removeItem(progressKey)
        
        setTimeout(() => {
          navigate("/results")
        }, 1000)
      } else if (response.data.error) {
        setSubmitError(response.data.error)
      } else {
        setSubmitError("Failed to submit. Please try again.")
      }
    } catch (error) {
      console.error("Submit error:", error)
      if (error.response?.status === 401) {
        setSubmitError("Session expired. Please login again.")
      } else if (error.response?.status === 400) {
        setSubmitError(error.response.data?.message || "Invalid test data. Please try again.")
      } else if (error.response?.status === 500) {
        setSubmitError("Server error. Please try again later.")
      } else if (error.message === "Network Error") {
        setSubmitError("Network connection error. Check your internet.")
      } else {
        setSubmitError("Failed to submit. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }
  
  const navigateToQuestion = (index) => {
    stopSpeech()
    setCurrentQuestionIndex(index)
  }
  
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }
  
  // Get image URL with proper fallback for Cloudinary and local images
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    
    // If it's a full URL (Cloudinary), return as is
    if (imagePath.startsWith('http')) {
      return imagePath
    }
    
    // If it's a local path starting with /uploads, return as is
    if (imagePath.startsWith('/uploads')) {
      return imagePath
    }
    
    // Otherwise, prepend /uploads
    return `/uploads${imagePath}`
  }
  
  // Handle image error with better fallback
  const handleImageError = (e) => {
    // Prevent infinite loop by removing the error handler
    e.target.onerror = null
    
    // Hide the broken image
    e.target.style.display = 'none'
    
    // If there's a container, show a placeholder
    const container = e.target.parentElement
    if (container && container.classList.contains(styles.questionImage)) {
      // Create a fallback element if it doesn't exist
      if (!container.querySelector('.image-fallback')) {
        const fallback = document.createElement('div')
        fallback.className = 'image-fallback'
        fallback.innerHTML = '<i class="fas fa-image"></i><span>Image not available</span>'
        fallback.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #666;'
        container.appendChild(fallback)
      }
    }
  }
  
  if (loading || !examData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading mock test...</p>
      </div>
    )
  }
  
  const currentQuestion = examData.questions[currentQuestionIndex]
  const userAnswer = userAnswers[currentQuestion._id]
  const isLastQuestion = currentQuestionIndex === examData.questions.length - 1
  
  return (
    <div className={styles.mockPage} ref={contentRef}>
      <div className={styles.quizHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={handleBack}>
            <i className="fa fa-arrow-left"></i>
          </button>
          <div className={styles.subjectInfo}>
            <h2 title={examData.course}>{examData.course.toUpperCase()}</h2>
            <span>Question {currentQuestionIndex + 1} of {examData.questions.length}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.timer}>
            <i className="fas fa-clock"></i>
            <span className={timeRemaining < 300 ? styles.timeWarning : ""}>{formatTime(timeRemaining)}</span>
          </div>
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
              width: `${(Object.keys(userAnswers).length / examData.questions.length) * 100}%`,
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
            const showCorrect = false // Mock doesn't show correct answers during test
            const showWrong = false // Mock doesn't show wrong answers during test
            
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
      </div>
      
      <div className={styles.questionGrid}>
        {examData.questions.map((_, index) => {
          const questionId = examData.questions[index]._id
          const isCurrentQuestion = index === currentQuestionIndex
          const isAnswered = userAnswers[questionId]
          return (
            <button
              key={index}
              className={`${styles.gridItem} ${isCurrentQuestion ? styles.current : ""} ${isAnswered ? styles.answered : ""}`}
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
        
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <button
            className={`${styles.submitBtn} ${submitting ? styles.submitting : ""}`}
            onClick={submitMock}
            disabled={submitting}
            title="Submit Test (Enter)"
            style={{
              minWidth: "160px",
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: submitSuccess ? "#10b981" : submitting ? "#94a3b8" : "linear-gradient(135deg, #0066ff 0%, #002060 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
            }}
          >
            {submitting ? (
              <>
                <span style={{
                  display: "inline-block",
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  borderTop: "2px solid white",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite"
                }}></span>
                Submitting...
              </>
            ) : submitSuccess ? (
              <>
                <i className="fas fa-check"></i>
                Submitted!
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i>
                Submit Test
              </>
            )}
          </button>
        </div>
        
        <button
          className={styles.navBtn}
          onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
          disabled={currentQuestionIndex === examData.questions.length - 1}
          title="Next Question (Right Arrow)"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
      
      {submitError && (
        <div style={{
          position: "fixed",
          bottom: "100px",
          left: "20px",
          right: "20px",
          background: "#fee2e2",
          border: "2px solid #ef4444",
          borderRadius: "8px",
          padding: "16px",
          color: "#991b1b",
          fontSize: "14px",
          zIndex: "1000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
        }}>
          <div>
            <strong>Submission Error:</strong> {submitError}
          </div>
          <button onClick={() => setSubmitError("")} style={{
            background: "none",
            border: "none",
            color: "#991b1b",
            fontSize: "20px",
            cursor: "pointer",
            padding: "0"
          }}>×</button>
        </div>
      )}
      
      {showQuitModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Quit Mock Test</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to quit? Your progress will be lost and the test will not be submitted.</p>
            </div>
            <div className={styles.modalFooter}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowQuitModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleQuit}>
                Yes, Quit
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showReportModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Report Question</h3>
              <button className={styles.closeBtn} onClick={() => setShowReportModal(false)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe the problem with this question..."
                rows="4"
              />
            </div>
            <div className={styles.modalFooter}>
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
      
      {/* Time Up Modal */}
      {timeRemaining === 0 && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Time's Up!</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Your time has expired. The test will be submitted automatically.</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Mock