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
  
  // Voice reader states
  const [voiceReaderOn, setVoiceReaderOn] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isReading, setIsReading] = useState(false)
  
  const timerRef = useRef(null)
  const contentRef = useRef(null)
  const speechRef = useRef(null)
  const voiceReaderOnRef = useRef(voiceReaderOn) // Ref to track the latest state

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
          if (currentQuestionIndex === examData.questions.length - 1) {
            submitMock();
          }
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
        // Import KaTeX components
        const katexModule = await import('katex')
        const { render, renderToString } = katexModule
        
        // Store KaTeX functions globally for easy access
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
  
  // Helper function to render content with math
  const renderContentWithMath = (content, isDisplayMode = false) => {
    if (!content) return null
    
    // Simple regex to find LaTeX patterns
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
      setVoiceReaderOn(false) // Turn off voice reader when stopped
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
        .replace(/\$\$.*?\$\$/g, '') // Remove display math with $$         .replace(/\$.*?\$/g, '')     // Remove inline math with $         .replace(/\\[a-zA-Z]+/g, '') // Remove LaTeX commands
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
      setVoiceReaderOn(false) // Turn off voice reader when finished
    }
    utterance.onerror = () => {
      setIsReading(false)
      setVoiceReaderOn(false) // Turn off voice reader on error
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
    stopSpeech() // Stop voice reader when back button is clicked
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
      
      // Calculate time used in minutes
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
      if (response.data.result) {
        localStorage.setItem("latestResult", JSON.stringify(response.data.result))
        const progressKey = `mock_progress_${examData.course}_${examData.year}`
        localStorage.removeItem(progressKey)
        navigate("/results")
      }
    } catch (error) {
      console.error("Submit error:", error)
    } finally {
      setSubmitting(false)
    }
  }
  
  const navigateToQuestion = (index) => {
    stopSpeech() // Stop voice reader when navigating to another question
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
  
  // Improved image URL handling with better fallback
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null // Return null if no image path provided
    if (imagePath.startsWith('http')) {
      return imagePath
    }
    if (imagePath.startsWith('/uploads')) {
      return imagePath
    }
    return `/uploads${imagePath}` // Fixed: Added leading slash
  }
  
  // Handle image error with better fallback
  const handleImageError = (e) => {
    // Prevent infinite loop by removing the error handler
    e.target.onerror = null;
    
    // Hide the broken image
    e.target.style.display = 'none';
    
    // If there's a container, we could show a placeholder text or icon
    const container = e.target.parentElement;
    if (container && container.classList.contains(styles.questionImage)) {
      // Create a fallback element if it doesn't exist
      if (!container.querySelector('.image-fallback')) {
        const fallback = document.createElement('div');
        fallback.className = 'image-fallback';
        fallback.innerHTML = '<i class="fas fa-image"></i><span>Image not available</span>';
        fallback.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #666;';
        container.appendChild(fallback);
      }
    }
  }
  
  return (
    <div className={styles.mockPage} ref={contentRef}>
      <div className={styles.quizHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={handleBack}>
            <i className="fa fa-arrow-left"></i>
          </button>
          <div className={styles.subjectInfo}>
            <h2>{examData.course.toUpperCase()}</h2> {/* Display course code in caps */}
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
          {isLastQuestion && (
            <button 
              className={`${styles.iconBtn} ${styles.submitBtn}`}
              onClick={submitMock}
              disabled={submitting}
              title="Submit Test (Enter)"
            >
              <i className="fas fa-paper-plane"></i>
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
        {currentQuestion.image && getImageUrl(currentQuestion.image) && (
          <div className={styles.questionImage}>
            <img 
              src={getImageUrl(currentQuestion.image)} 
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
            return (
              <div
                key={index}
                className={`${styles.option} ${isSelected ? styles.selected : ""}`}
                onClick={() => handleAnswerSelect(currentQuestion._id, optionNumber)}
              >
                <div className={styles.optionLetter}>{String.fromCharCode(65 + index)}</div>
                <div className={styles.optionText}>
                  {renderContentWithMath(option)}
                </div>
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
      
      {isLastQuestion && (
        <div className={styles.actionButtons}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={submitMock} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Test"}
          </button>
        </div>
      )}
      
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
          className={styles.navBtn}
          onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
          disabled={currentQuestionIndex === examData.questions.length - 1}
          title="Next Question (Right Arrow)"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
      
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
    </div>
  )
}

export default Mock