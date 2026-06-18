"use client"
import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { fetchLevelsIndex } from "../../utils/crosswordApi"
import { useCrosswordProgress } from "../../utils/useCrosswordProgress"
import styles from "../../styles/Crossword.module.css"

const DIFFICULTY_LABEL = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
}

const CrosswordHub = () => {
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
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

  const completedCount = Object.values(progress.levels).filter((l) => l.completed).length
  const totalCount = levels.length || 5
  const percentDone = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

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

      <div className={styles.cwPathContainer}>
        {loading && <p className={styles.cwStatusText}>Loading puzzles…</p>}
        {error && <p className={styles.cwStatusText}>{error}</p>}

        {!loading && !error && (
          <div className={styles.cwPath}>
            {levels.map((level, idx) => {
              const state = getLevelState(level.levelId)
              const isLeft = idx % 2 === 0
              return (
                <div
                  key={level.levelId}
                  className={`${styles.cwPathRow} ${isLeft ? styles.cwPathRowLeft : styles.cwPathRowRight}`}
                >
                  {idx > 0 && <div className={styles.cwPathConnector} aria-hidden="true"></div>}
                  <button
                    type="button"
                    className={`${styles.cwLevelNode} ${styles[`cwLevelNode_${state}`]}`}
                    onClick={() => handleSelect(level.levelId, state)}
                    disabled={state === "locked"}
                    aria-label={`${level.title}, ${state === "locked" ? "locked" : DIFFICULTY_LABEL[level.difficulty]}`}
                  >
                    <span className={styles.cwLevelNodeNumber}>
                      {state === "completed" ? <i className="fas fa-check"></i> : level.levelId}
                    </span>
                  </button>
                  <div className={styles.cwLevelCard}>
                    <div className={styles.cwLevelCardHeader}>
                      <h3>{level.title}</h3>
                      <span className={`${styles.cwDifficultyTag} ${styles[`cwDifficulty_${level.difficulty}`]}`}>
                        {DIFFICULTY_LABEL[level.difficulty]}
                      </span>
                    </div>
                    <p className={styles.cwLevelTheme}>{level.theme}</p>
                    <div className={styles.cwLevelMeta}>
                      <span><i className="fas fa-font"></i> {level.wordCount} words</span>
                      {progress.levels[String(level.levelId)]?.bestTimeSeconds != null && (
                        <span>
                          <i className="fas fa-clock"></i>{" "}
                          {formatTime(progress.levels[String(level.levelId)].bestTimeSeconds)}
                        </span>
                      )}
                    </div>
                    {state === "locked" && (
                      <p className={styles.cwLockedHint}>
                        <i className="fas fa-lock"></i> Finish puzzle {level.levelId - 1} to unlock
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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
