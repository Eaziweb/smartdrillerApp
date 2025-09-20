"use client"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import styles from "../../styles/CompetitionQuiz.module.css"
// Import KaTeX CSS
import 'katex/dist/katex.min.css'
import api from "../../utils/api";


const CompetitionQuiz = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [competitionData, setCompetitionData] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentCourseIndex, setCurrentCourseIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportDescription, setReportDescription] = useState("")
  const [submittingReport, setSubmittingReport] = useState(false)
  const [showQuitModal, setShowQuitModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [courseQuestions, setCourseQuestions] = useState({})
  const [courseTabs, setCourseTabs] = useState([])
  const [katexLoaded, setKatexLoaded] = useState(false)
  const [showBackModal, setShowBackModal] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  const timerRef = useRef(null)
  const contentRef = useRef(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    // Check subscription
    if (!user?.isSubscribed) {
      navigate("/home")
      return
    }
    
    loadCompetitionData()
    
    // Load KaTeX dynamically
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
    
    // Prevent cheating measures
    const preventCheating = () => {
      // Prevent right-click
      document.addEventListener('contextmenu', (e) => e.preventDefault())
      
      // Prevent text selection
      document.addEventListener('selectstart', (e) => {
        // Allow selection in report modal textarea
        if (e.target.tagName !== 'TEXTAREA' || !e.target.closest(`.${styles.modal}`)) {
          e.preventDefault()
        }
      })
      
      // Prevent copy, cut, paste
      document.addEventListener('copy', (e) => {
        if (e.target.tagName !== 'TEXTAREA' || !e.target.closest(`.${styles.modal}`)) {
          e.preventDefault()
        }
      })
      document.addEventListener('cut', (e) => {
        if (e.target.tagName !== 'TEXTAREA' || !e.target.closest(`.${styles.modal}`)) {
          e.preventDefault()
        }
      })
      document.addEventListener('paste', (e) => {
        if (e.target.tagName !== 'TEXTAREA' || !e.target.closest(`.${styles.modal}`)) {
          e.preventDefault()
        }
      })
      
      // Prevent keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)
      document.addEventListener('keydown', (e) => {
        if (
          (e.ctrlKey || e.metaKey) && 
          (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a') &&
          (e.target.tagName !== 'TEXTAREA' || !e.target.closest(`.${styles.modal}`))
        ) {
          e.preventDefault()
        }
      })
    }
    
    preventCheating()
    
    // Handle browser back button and mobile back gestures
    const handlePopState = (e) => {
      e.preventDefault()
      if (!isSubmitted) {
        setShowBackModal(true)
        // Push a new state to prevent the user from going back without our modal
        window.history.pushState({ noBack: true }, '')
      }
    }
    
    // Initial push state to enable popstate detection
    window.history.pushState({ noBack: true }, '')
    window.addEventListener('popstate', handlePopState)
    
    // Handle beforeunload (refresh, close tab)
    const handleBeforeUnload = (e) => {
      if (isSubmitted) return
      e.preventDefault()
      e.returnValue = 'Your quiz progress will be lost. Are you sure you want to leave?'
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user, navigate])

  // Load progress after competition data is available
  useEffect(() => {
    if (competitionData && isInitialMount.current) {
      loadProgress()
      isInitialMount.current = false
    }
  }, [competitionData])

  // Process content with KaTeX when it changes
  useEffect(() => {
    if (katexLoaded && competitionData && contentRef.current) {
      processMathContent()
    }
  }, [katexLoaded, currentQuestionIndex, currentCourseIndex, competitionData])

  useEffect(() => {
    if (timeRemaining > 0) {
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
  }, [timeRemaining])

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

  const renderContentWithMath = (content, isDisplayMode = false) => {
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

  const loadCompetitionData = () => {
    try {
      const storedData = localStorage.getItem("currentCompetition")
      if (!storedData) {
        navigate("/competitions")
        return
      }
      const data = JSON.parse(storedData)
      if (data.examType !== "competition") {
        navigate("/competitions")
        return
      }
      setCompetitionData(data)
      setTimeRemaining(data.totalTime * 60)
      
      const questionsByCourse = {}
      const tabs = []
      data.selectedCourses.forEach((courseCode) => {
        const courseQuestions = data.questions.filter((q) => q.courseCode === courseCode)
        questionsByCourse[courseCode] = courseQuestions
        tabs.push({
          courseCode,
          courseName: courseCode,
          questionCount: courseQuestions.length,
        })
      })
      setCourseQuestions(questionsByCourse)
      setCourseTabs(tabs)
      setLoading(false)
    } catch (error) {
      console.error("Failed to load competition data:", error)
      navigate("/competitions")
    }
  }

  const loadProgress = () => {
    try {
      const progressKey = `competition_progress_${competitionData?.competitionId}`
      const savedProgress = localStorage.getItem(progressKey)
      if (savedProgress) {
        const progress = JSON.parse(savedProgress)
        setUserAnswers(progress.userAnswers || {})
        setCurrentQuestionIndex(progress.currentQuestionIndex || 0)
        setCurrentCourseIndex(progress.currentCourseIndex || 0)
        setTimeRemaining(progress.timeRemaining || competitionData?.totalTime * 60)
      }
    } catch (error) {
      console.error("Failed to load progress:", error)
    }
  }

  const saveProgress = () => {
    if (!competitionData) return
    try {
      const progressKey = `competition_progress_${competitionData.competitionId}`
      const progress = {
        userAnswers,
        currentQuestionIndex,
        currentCourseIndex,
        timeRemaining,
        timestamp: Date.now(),
      }
      localStorage.setItem(progressKey, JSON.stringify(progress))
    } catch (error) {
      console.error("Failed to save progress:", error)
    }
  }

  useEffect(() => {
    saveProgress()
  }, [userAnswers, currentQuestionIndex, currentCourseIndex, timeRemaining])

  const handleAnswerSelect = (questionId, optionIndex) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }))
  }

  const handleReport = async () => {
    if (!reportDescription.trim()) {
      showMessage("Please describe the problem", "warning")
      return
    }
    setSubmittingReport(true)
    try {
      const currentQuestion = getCurrentQuestion()
      await api.post("/api/reports/submit", {
        questionId: currentQuestion._id,
        description: reportDescription,
      })
      showMessage("Report submitted successfully", "success")
      setShowReportModal(false)
      setReportDescription("")
    } catch (error) {
      console.error("Report error:", error)
      showMessage("Failed to submit report", "error")
    } finally {
      setSubmittingReport(false)
    }
  }

  const handleBack = () => {
    setShowQuitModal(true)
  }

  const handleQuit = () => {
    const progressKey = `competition_progress_${competitionData?.competitionId}`
    localStorage.removeItem(progressKey)
    navigate("/competitions")
  }

  const handleAutoSubmit = () => {
    showMessage("Time's up! Submitting your answers...", "warning")
    setTimeout(() => {
      submitCompetition()
    }, 2000)
  }

  const submitCompetition = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const allAnswers = competitionData.questions.map((question) => ({
        questionId: question._id,
        selectedOption: userAnswers[question._id] || 0,
      }))
      const timeUsed = competitionData.totalTime - Math.floor(timeRemaining / 60)
      const submissionData = {
        selectedCourses: competitionData.selectedCourses,
        answers: allAnswers,
        timeUsed: Math.max(timeUsed, 0),
        totalTime: competitionData.totalTime,
      }
      const response = await api.post(`/api/competitions/${competitionData.competitionId}/submit`, submissionData)
      if (response.data.submission) {
        localStorage.setItem("competitionResult", JSON.stringify(response.data.submission))
        const progressKey = `competition_progress_${competitionData.competitionId}`
        localStorage.removeItem(progressKey)
        localStorage.removeItem("currentCompetition")
        setIsSubmitted(true)
        navigate("/competition-completion")
      }
    } catch (error) {
      console.error("Submit error:", error)
      showMessage(error.response?.data?.message || "Failed to submit competition", "error")
    } finally {
      setSubmitting(false)
    }
  }

  const getCurrentQuestion = () => {
    const currentCourse = courseTabs[currentCourseIndex]
    if (!currentCourse) return null
    const questions = courseQuestions[currentCourse.courseCode]
    return questions?.[currentQuestionIndex] || null
  }

  const navigateToQuestion = (questionIndex) => {
    const currentCourse = courseTabs[currentCourseIndex]
    const questions = courseQuestions[currentCourse.courseCode]
    if (questionIndex >= 0 && questionIndex < questions.length) {
      setCurrentQuestionIndex(questionIndex)
    }
  }

  const navigateToCourse = (courseIndex) => {
    if (courseIndex >= 0 && courseIndex < courseTabs.length) {
      setCurrentCourseIndex(courseIndex)
      setCurrentQuestionIndex(0)
    }
  }

  const isLastQuestionOfLastCourse = () => {
    const isLastCourse = currentCourseIndex === courseTabs.length - 1
    const currentCourse = courseTabs[currentCourseIndex]
    const questions = courseQuestions[currentCourse?.courseCode]
    const isLastQuestion = currentQuestionIndex === (questions?.length || 0) - 1
    return isLastCourse && isLastQuestion
  }

  const goToNextQuestion = () => {
    const currentCourse = courseTabs[currentCourseIndex]
    const questions = courseQuestions[currentCourse.courseCode]
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else if (currentCourseIndex < courseTabs.length - 1) {
      setCurrentCourseIndex(currentCourseIndex + 1)
      setCurrentQuestionIndex(0)
    }
  }

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    } else if (currentCourseIndex > 0) {
      const prevCourseIndex = currentCourseIndex - 1
      const prevCourse = courseTabs[prevCourseIndex]
      const prevQuestions = courseQuestions[prevCourse.courseCode]
      setCurrentCourseIndex(prevCourseIndex)
      setCurrentQuestionIndex(prevQuestions.length - 1)
    }
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

  const showMessage = (message, type = "info") => {
    const messageEl = document.createElement("div")
    messageEl.className = `message-toast ${type}`
    messageEl.innerHTML = `
      <i class="fas ${type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-triangle" : "fa-info-circle"}"></i>
      <span>${message}</span>
    `
    document.body.appendChild(messageEl)
    setTimeout(() => {
      messageEl.style.animation = "slideOutRight 0.3s ease forwards"
      setTimeout(() => messageEl.remove(), 300)
    }, 3000)
  }

  const getTotalAnsweredQuestions = () => {
    return Object.keys(userAnswers).length
  }

  const getTotalQuestions = () => {
    return competitionData?.questions?.length || 0
  }

  if (loading || !competitionData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading competition...</p>
      </div>
    )
  }

  const currentQuestion = getCurrentQuestion()
  const currentCourse = courseTabs[currentCourseIndex]
  const currentCourseQuestions = courseQuestions[currentCourse?.courseCode] || []
  const userAnswer = currentQuestion ? userAnswers[currentQuestion._id] : null

  if (!currentQuestion) {
    return (
      <div className={styles.errorContainer}>
        <h3>No questions available</h3>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate("/competitions")}>
          Back to Competitions
        </button>
      </div>
    )
  }

  return (
    <div className={`${styles.competitionQuizPage} ${styles.noSelect}`} ref={contentRef}>
      {/* Header */}
      <div className={styles.quizHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={handleBack}>
            <i className="fa fa-arrow-left"></i>
          </button>
          <div className={styles.subjectInfo}>
            <h2>{competitionData.competitionName}</h2>
            <span>
              {currentCourse.courseCode} - Question {currentQuestionIndex + 1} of {currentCourseQuestions.length}
            </span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.timer}>
            <i className="fas fa-clock"></i>
            <span className={timeRemaining < 300 ? styles.timeWarning : ""}>{formatTime(timeRemaining)}</span>
          </div>
          <button className={styles.submitBtnHeader} onClick={submitCompetition} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
          <button className={`${styles.iconBtn} ${styles.menuBtn}`} onClick={() => setShowReportModal(true)}>
            <i className="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>
      
      {/* Course Tabs */}
      <div className={styles.courseTabs}>
        {courseTabs.map((course, index) => (
          <button
            key={course.courseCode}
            className={`${styles.courseTab} ${index === currentCourseIndex ? styles.active : ""}`}
            onClick={() => navigateToCourse(index)}
          >
            <span className={styles.courseName}>{course.courseCode}</span>
            <span className={styles.courseProgress}>
              {courseQuestions[course.courseCode]?.filter((q) => userAnswers[q._id]).length || 0}/{course.questionCount}
            </span>
          </button>
        ))}
      </div>
      
      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${(getTotalAnsweredQuestions() / getTotalQuestions()) * 100}%`,
            }}
          ></div>
        </div>
        <div className={styles.progressText}>
          {getTotalAnsweredQuestions()}/{getTotalQuestions()} questions answered
        </div>
      </div>
      
      {/* Question Content */}
      <div className={styles.questionContainer}>
        {currentQuestion.image && (
          <div className={styles.questionImageContainer}>
            <img 
              src={currentQuestion.image} 
              alt="Question illustration" 
              className={styles.questionImage}
              draggable="false"
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
      
      {/* Question Grid for Current Course */}
      <div className={styles.questionGrid}>
        {currentCourseQuestions.map((question, index) => {
          const isCurrentQuestion = index === currentQuestionIndex
          const isAnswered = userAnswers[question._id]
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
      
      {/* Submit Button (shown at end of last course) */}
      {isLastQuestionOfLastCourse() && (
        <div className={styles.actionButtons}>
          <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`} onClick={submitCompetition} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Competition"}
          </button>
        </div>
      )}
      
      {/* Navigation */}
      <div className={styles.navigationContainer}>
        <button
          className={styles.navBtn}
          onClick={goToPreviousQuestion}
          disabled={currentCourseIndex === 0 && currentQuestionIndex === 0}
        >
          <i className="fas fa-chevron-left"></i>
          Previous
        </button>
        <button className={styles.navBtn} onClick={goToNextQuestion} disabled={isLastQuestionOfLastCourse()}>
          Next
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
      
      {/* Quit Modal */}
      {showQuitModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Quit Competition</h3>
            </div>
            <div className={styles.modalBody}>
              <p>
                Are you sure you want to quit? Your progress will be lost and the competition will not be submitted.
              </p>
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
      
      {/* Back Navigation Modal */}
      {showBackModal && (
        <div className={styles.modalOverlay} key="backModal">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Leave Quiz</h3>
            </div>
            <div className={styles.modalBody}>
              <p>
                If you go back, your test will be submitted.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setShowBackModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={submitCompetition}>
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Report Modal */}
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
                className={styles.reportTextarea}
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
    </div>
  )
}

export default CompetitionQuiz