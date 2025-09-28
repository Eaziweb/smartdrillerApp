"use client"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import api from "../../utils/api";
import styles from "../../styles/study.module.css"
// Import KaTeX CSS
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

  // Handle voice reader when question changes
  useEffect(() => {
    if (voiceReaderOnRef.current && speechSupported && examData) {
      const currentQuestion = examData.questions[currentQuestionIndex]
      const isStudied = studiedQuestions.has(currentQuestion._id)
      
      // Stop any ongoing speech
      stopSpeech()
      
      // Read appropriate content based on study status
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
          if (!studiedQuestions.has(examData.questions[currentQuestionIndex]._id)) {
            handleStudy(examData.questions[currentQuestionIndex]._id);
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
  }, [currentQuestionIndex, examData, studiedQuestions]);

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

  // Function to read question content (for studied questions)
  const readQuestionContent = (question, isStudied) => {
    if (!speechRef.current || !isStudied) return
    
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
    let textToRead = `Question: ${cleanText(question.question)}. `
    
    // Add correct answer
    const correctOptionIndex = question.correctOption - 1
    textToRead += `The correct answer is: ${String.fromCharCode(65 + correctOptionIndex)}. ${cleanText(question.options[correctOptionIndex])}. `
    
    // Add user's answer if it's wrong
    const userAnswer = userAnswers[question._id]
    if (userAnswer !== undefined && userAnswer !== question.correctOption) {
      const wrongOptionIndex = userAnswer - 1
      textToRead += `Your answer was: ${String.fromCharCode(65 + wrongOptionIndex)}. ${cleanText(question.options[wrongOptionIndex])}. `
    }
    
    // Add explanation
    textToRead += `Explanation: ${cleanText(question.explanation)}`
    
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
      const isStudied = studiedQuestions.has(currentQuestion._id)
      
      // Cancel any ongoing speech (shouldn't be any because isReading is false, but just in case)
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

  // Modified handleStudy to trigger voice reading
  const handleStudy = async (questionId) => {
    setStudiedQuestions((prev) => new Set([...prev, questionId]));
    setShowExplanation((prev) => ({ ...prev, [questionId]: true }));

    // Trigger voice reading if enabled
    if (voiceReaderOn && speechSupported && examData) {
      const currentQuestion = examData.questions[currentQuestionIndex];
      if (currentQuestion._id === questionId) {
        stopSpeech();
        readQuestionContent(currentQuestion, true);
      }
    }

    try {
      await api.post("/api/questions/study-progress", { questionId });
    } catch (error) {
      console.error("Failed to record study progress:", error);
    }
  };

  // Modified navigateToQuestion to stop speech
  const navigateToQuestion = (index) => {
    stopSpeech()
    setCurrentQuestionIndex(index)
  }

  // Modified handleBack to stop speech
  const handleBack = () => {
    stopSpeech()
    const progressKey = `study_progress_${examData?.course}_${examData?.year}`
    localStorage.removeItem(progressKey)
    navigate("/course-selection?type=study")
  }

  useEffect(() => {
    if (!user?.isSubscribed) {
      navigate("/home")
      return
    }
    
    loadExamData()
    loadBookmarks()
    
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
        console.log("KaTeX loaded successfully")
      } catch (error) {
        console.error("Failed to load KaTeX:", error)
      }
    }
    
    loadKaTeX()
  }, [user, navigate])
  
  // Load progress only after exam data is available
  useEffect(() => {
    if (examData && !progressLoaded) {
      loadProgress()
      setProgressLoaded(true)
    }
  }, [examData, progressLoaded])
  
  // Process content with KaTeX when it changes
  useEffect(() => {
    if (katexLoaded && contentRef.current) {
      processMathContent()
    }
  }, [katexLoaded, currentQuestionIndex, examData, showExplanation])
  
  const processMathContent = () => {
    if (!window.katex || !contentRef.current) return
    
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
    <div className={styles.studyPage} ref={contentRef}>
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
            const isCorrect = currentQuestion.correctOption === optionNumber
            const showCorrect = isStudied && isCorrect
            // Only show wrong if the user selected this option and it's not correct
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
      
      {/* Navigation with study button in the middle */}
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