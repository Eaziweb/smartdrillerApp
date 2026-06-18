"use client"
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { fetchLevelsIndex } from "../../utils/crosswordApi"
import { useCrosswordProgress } from "../../utils/useCrosswordProgress"
import styles from "../../styles/Crossword.module.css"

const LEVELS_PER_PAGE = 10

const CrosswordHub = () => {
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentPage, setCurrentPage] = useState(0)
  
  const navigate = useNavigate()
  const { progress } = useCrosswordProgress()

  useEffect(() => {
    fetchLevelsIndex()
      .then((data) => {
        setLevels(data.levels)
        setLoading(false)
      })
      .catch(() => {
        setError("Couldn't load puzzles. Check your connection and try again.")
        setLoading(false)
      })
  }, [])

  const totalCount = levels.length || 0
  const totalPages = Math.ceil(totalCount / LEVELS_PER_PAGE)
  const completedCount = Object.values(progress.levels).filter((l) => l.completed).length
  const percentDone = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const visibleLevels = levels.slice(
    currentPage * LEVELS_PER_PAGE, 
    (currentPage + 1) * LEVELS_PER_PAGE
  )

  const getLevelState = (levelId) => {
    const result = progress.levels[String(levelId)]
    if (result?.completed) return "completed"
    if (levelId === progress.highestUnlockedLevel) return "current"
    if (levelId < progress.highestUnlockedLevel) return "completed"
    return "locked"
  }

  const handleSelect = (levelId, state) => {
    if (state === "locked") return
    navigate(`/crossword/play/${levelId}`)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(p => p + 1)
  }

  const handlePrevPage = () => {
    if (currentPage > 0) setCurrentPage(p => p - 1)
  }

  return (
    <div className={styles.crosswordPage}>
      <header className={styles.cwHeader}>
        <div className={styles.cwHeaderContent}>
          <Link to="/home" className={styles.cwBackBtn} aria-label="Back to home">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1>Word Puzzles</h1>
          <div className={styles.cwStarBadge}>
            <i className="fas fa-star"></i>
            <span>{progress.starsBalance}</span>
          </div>
        </div>
      </header>

      <div className={styles.cwProgressSection}>
        <div className={styles.cwProgressCard}>
          <div className={styles.cwProgressInfo}>
            <div className={styles.cwProgressStats}>
              <span className={styles.cwStatNumber}>{completedCount}</span>
              <span className={styles.cwStatTotal}>/ {totalCount}</span>
            </div>
            <div className={styles.cwProgressLabel}>Puzzles solved</div>
          </div>
          <div className={styles.cwProgressBar}>
            <div className={styles.cwProgressFill} style={{ width: `${percentDone}%` }}></div>
          </div>
        </div>
      </div>

      <div className={styles.cwHubContainer}>
        {loading && <p className={styles.cwStatusText}>Loading puzzles…</p>}
        {error && <p className={styles.cwStatusText}>{error}</p>}

        {!loading && !error && (
          <>
            <div className={styles.cwHubGrid}>
              {visibleLevels.map((level) => {
                const state = getLevelState(level.levelId)
                const completionData = progress.levels[String(level.levelId)]
                
                return (
                  <div key={level.levelId} className={styles.cwHubBoxWrapper}>
                    <button
                      type="button"
                      className={`${styles.cwHubBox} ${styles[`cwHubBox_${state}`]}`}
                      onClick={() => handleSelect(level.levelId, state)}
                      disabled={state === "locked"}
                    >
                      <span className={styles.cwHubBoxNumber}>{level.levelId}</span>
                      {state === "locked" && <i className={`fas fa-lock ${styles.cwHubLock}`}></i>}
                    </button>
                    
                    {/* Only show time if the level is actually completed */}
                    {state === "completed" && completionData?.bestTimeSeconds != null && (
                      <span className={styles.cwHubTime}>
                        {formatTime(completionData.bestTimeSeconds)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className={styles.cwPagination}>
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 0}
                  className={styles.cwPageBtn}
                >
                  <i className="fas fa-chevron-left"></i> Prev
                </button>
                <span className={styles.cwPageIndicator}>
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages - 1}
                  className={styles.cwPageBtn}
                >
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export default CrosswordHub
