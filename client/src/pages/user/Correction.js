"use client"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import axios from "axios"
import styles from "../../styles/correction.module.css"

// Import KaTeX CSS
import 'katex/dist/katex.min.css'

const Correction = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [correctionData, setCorrectionData] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [katexLoaded, setKatexLoaded] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    // Check subscription
    if (!user?.isSubscribed) {
      navigate("/home")
      return
    }
    
    loadCorrectionData()
    
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

  // Process content with KaTeX when it changes
  useEffect(() => {
    if (katexLoaded && correctionData && contentRef.current) {
      processMathContent()
    }
  }, [katexLoaded, currentQuestionIndex, correctionData])

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

  const loadCorrectionData = async () => {
    try {
      const storedResult = localStorage.getItem("latestResult")
      if (!storedResult) {
        navigate("/results")
        return
      }
      const result = JSON.parse(storedResult)
      // Fetch the full result with questions
      const response = await axios.get(`/api/results/${result._id}`)
      setCorrectionData(response.data)
      setLoading(false)
    } catch (error) {
      console.error("Failed to load correction data:", error)
      navigate("/results")
    }
  }

  const handleBack = () => {
      navigate("/results")
  }

  const navigateToQuestion = (index) => {
    setCurrentQuestionIndex(index)
  }

  if (loading || !correctionData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading correction...</p>
      </div>
    )
  }

  const currentQuestionData = correctionData.questions[currentQuestionIndex]
  const currentQuestion = currentQuestionData.questionId
  const userAnswer = currentQuestionData.selectedOption
  const isCorrect = currentQuestionData.isCorrect
  
  return (
    <div className={styles.correctionPage} ref={contentRef}>
      {/* Header */}
      <div className={styles.quizHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={handleBack}>
            <i className="fa fa-arrow-left"></i>
          </button>
          <div className={styles.subjectInfo}>
            <h2>Correction View</h2>
            <span>
              Question {currentQuestionIndex + 1} of {correctionData.questions.length}
            </span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.scoreDisplay}>
            <span>Score: {correctionData.percentage}%</span>
          </div>
        </div>
      </div>
      
      {/* Question Content */}
      <div className={styles.questionContainer}>
        <div className={styles.questionText}>
          {renderContentWithMath(currentQuestion.question)}
        </div>
        
        <div className={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const optionNumber = index + 1
            const isSelected = userAnswer === optionNumber
            const isCorrectOption = currentQuestion.correctOption === optionNumber
            const showCorrect = isCorrectOption
            const showWrong = isSelected && !isCorrectOption
            
            return (
              <div
                key={index}
                className={`${styles.option} ${isSelected ? styles.selected : ""} ${showCorrect ? styles.correct : ""} ${showWrong ? styles.wrong : ""}`}
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
        
        {/* Explanation - Always shown */}
        <div className={styles.explanationContainer}>
          <div className={styles.explanationHeader}>
            <i className="fas fa-lightbulb"></i>
            <span>Explanation</span>
          </div>
          <div className={styles.explanationText}>
            {renderContentWithMath(currentQuestion.explanation)}
          </div>
        </div>
        
        {/* Answer Status */}
        <div className={`${styles.answerStatus} ${isCorrect ? styles.correct : userAnswer === 0 ? styles.unanswered : styles.wrong}`}>
          {userAnswer === 0 ? (
            <>
              <i className="fas fa-question-circle"></i>
              <span>You didn't answer this question</span>
            </>
          ) : isCorrect ? (
            <>
              <i className="fas fa-check-circle"></i>
              <span>Correct! Well done.</span>
            </>
          ) : (
            <>
              <i className="fas fa-times-circle"></i>
              <span>
                Incorrect. The correct answer is option {String.fromCharCode(64 + currentQuestion.correctOption)}.
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Question Grid */}
      <div className={styles.questionGrid}>
        {correctionData.questions.map((questionData, index) => {
          const isCurrentQuestion = index === currentQuestionIndex
          const questionIsCorrect = questionData.isCorrect
          const questionIsUnanswered = questionData.selectedOption === 0
          
          return (
            <button
              key={index}
              className={`${styles.gridItem} ${isCurrentQuestion ? styles.current : ""} ${
                questionIsUnanswered ? styles.unanswered : questionIsCorrect ? styles.correct : styles.wrong
              }`}
              onClick={() => navigateToQuestion(index)}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
      
      {/* Navigation */}
      <div className={styles.navigationContainer}>
        <button
          className={styles.navBtn}
          onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <i className="fas fa-chevron-left"></i>
          Previous
        </button>
        <button
          className={styles.navBtn}
          onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
          disabled={currentQuestionIndex === correctionData.questions.length - 1}
        >
          Next
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  )
}

export default Correction