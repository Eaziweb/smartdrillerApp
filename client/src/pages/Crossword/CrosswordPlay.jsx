"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { fetchLevel, fetchLevelsIndex } from "../../utils/crosswordApi"
import { useCrosswordProgress } from "../../utils/useCrosswordProgress"
import {
  buildCellMap,
  getCellNumber,
  getWordCells,
  isPuzzleComplete,
  findWordAt,
  nextCellInWord,
  prevCellInWord,
} from "../../utils/crosswordGrid"
import styles from "../../styles/Crossword.module.css"

const CrosswordPlay = () => {
  const { levelId } = useParams()
  const navigate = useNavigate()
  const { progress, recordLevelComplete, recordHintUsed } = useCrosswordProgress()

  const [level, setLevel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filled, setFilled] = useState({}) // "r-c" -> letter
  const [selected, setSelected] = useState(null) // { row, col }
  const [direction, setDirection] = useState("across")
  const [activeWordIndex, setActiveWordIndex] = useState(0)
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [hintsUsedThisLevel, setHintsUsedThisLevel] = useState(0)
  const [revealedCells, setRevealedCells] = useState({}) // cells filled via hint, can't earn full stars
  const [totalLevels, setTotalLevels] = useState(null)

  const hiddenInputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    // Fetched once, from the ~1KB index — not from any individual puzzle —
    // purely so the "Next puzzle" button knows when to stop offering one.
    fetchLevelsIndex()
      .then((data) => setTotalLevels(data.totalLevels))
      .catch(() => {
        // Non-critical: worst case the "Next puzzle" button just won't show
        // on the final level. Gameplay itself is unaffected.
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    setError("")
    setFilled({})
    setIsComplete(false)
    setSecondsElapsed(0)
    setHintsUsedThisLevel(0)
    setRevealedCells({})

    fetchLevel(levelId)
      .then((data) => {
        setLevel(data)
        setSelected({ row: data.words[0].row, col: data.words[0].col })
        setDirection(data.words[0].direction)
        setActiveWordIndex(0)
        setLoading(false)
      })
      .catch(() => {
        setError("Couldn't load this puzzle. Check your connection and try again.")
        setLoading(false)
      })
  }, [levelId])

  useEffect(() => {
    if (loading || isComplete) return
    timerRef.current = setInterval(() => setSecondsElapsed((s) => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [loading, isComplete])

  const cellMap = useMemo(() => (level ? buildCellMap(level) : new Map()), [level])

  const activeWord = level ? level.words[activeWordIndex] : null
  const activeWordCells = useMemo(() => (activeWord ? getWordCells(activeWord) : []), [activeWord])

  const selectCell = useCallback(
    (row, col, preferredDirection) => {
      if (!level) return
      const key = `${row}-${col}`
      if (!cellMap.has(key)) return
      const word = findWordAt(level, row, col, preferredDirection || direction)
      if (!word) return
      setSelected({ row, col })
      setDirection(word.direction)
      setActiveWordIndex(level.words.indexOf(word))
      hiddenInputRef.current?.focus()
    },
    [level, cellMap, direction]
  )

  const handleCellClick = (row, col) => {
    const key = `${row}-${col}`
    if (!cellMap.has(key)) return
    // Tapping the same cell again toggles direction, like standard crossword apps.
    if (selected && selected.row === row && selected.col === col) {
      const otherDirection = direction === "across" ? "down" : "across"
      const otherWord = findWordAt(level, row, col, otherDirection)
      if (otherWord && otherWord.direction !== direction) {
        selectCell(row, col, otherDirection)
        return
      }
    }
    selectCell(row, col, direction)
  }

  const checkCompletion = useCallback(
    (nextFilled, hintsCountOverride) => {
      if (!level) return
      if (isPuzzleComplete(level, nextFilled)) {
        setIsComplete(true)
        clearInterval(timerRef.current)
        const effectiveHints = hintsCountOverride !== undefined ? hintsCountOverride : hintsUsedThisLevel
        const stars = effectiveHints === 0 ? 3 : effectiveHints <= 2 ? 2 : 1
        recordLevelComplete(level.levelId, secondsElapsed, stars)
      }
    },
    [level, hintsUsedThisLevel, secondsElapsed, recordLevelComplete]
  )

  const handleLetterInput = (char) => {
    if (!selected || !activeWord || isComplete) return
    const letter = char.toUpperCase()
    if (!/^[A-Z]$/.test(letter)) return

    const key = `${selected.row}-${selected.col}`
    const nextFilled = { ...filled, [key]: letter }
    setFilled(nextFilled)
    checkCompletion(nextFilled)

    const next = nextCellInWord(activeWord, selected.row, selected.col)
    if (next) {
      setSelected(next)
    }
  }

  const handleBackspace = () => {
    if (!selected || !activeWord) return
    const key = `${selected.row}-${selected.col}`
    if (filled[key]) {
      const nextFilled = { ...filled }
      delete nextFilled[key]
      setFilled(nextFilled)
    } else {
      const prev = prevCellInWord(activeWord, selected.row, selected.col)
      if (prev) {
        const prevKey = `${prev.row}-${prev.col}`
        const nextFilled = { ...filled }
        delete nextFilled[prevKey]
        setFilled(nextFilled)
        setSelected(prev)
      }
    }
  }

  const handleHiddenInputChange = (e) => {
    const value = e.target.value
    if (value.length > 0) {
      handleLetterInput(value[value.length - 1])
    }
    e.target.value = ""
  }

  const handleHiddenInputKeyDown = (e) => {
    if (e.key === "Backspace") {
      e.preventDefault()
      handleBackspace()
    }
  }

  const goToWord = (delta) => {
    if (!level) return
    const nextIndex = (activeWordIndex + delta + level.words.length) % level.words.length
    const word = level.words[nextIndex]
    setActiveWordIndex(nextIndex)
    setDirection(word.direction)
    setSelected({ row: word.row, col: word.col })
    hiddenInputRef.current?.focus()
  }

  const useHint = () => {
    if (!activeWord || progress.starsBalance < 1) return
    const cellsForWord = getWordCells(activeWord)
    const unfilledCell = cellsForWord.find((c) => filled[`${c.row}-${c.col}`] !== activeWord.answer[cellsForWord.indexOf(c)])
    if (!unfilledCell) return

    const idx = cellsForWord.indexOf(unfilledCell)
    const key = `${unfilledCell.row}-${unfilledCell.col}`
    const nextFilled = { ...filled, [key]: activeWord.answer[idx] }
    const nextHintCount = hintsUsedThisLevel + 1
    setFilled(nextFilled)
    setRevealedCells((prev) => ({ ...prev, [key]: true }))
    setHintsUsedThisLevel(nextHintCount)
    recordHintUsed(level.levelId)
    checkCompletion(nextFilled, nextHintCount)
  }

  if (loading) {
    return (
      <div className={styles.crosswordPage}>
        <div className={styles.cwStatusFull}>Loading puzzle…</div>
      </div>
    )
  }

  if (error || !level) {
    return (
      <div className={styles.crosswordPage}>
        <div className={styles.cwStatusFull}>
          <p>{error || "Puzzle not found."}</p>
          <Link to="/crossword" className={styles.cwBackToListLink}>
            Back to puzzle list
          </Link>
        </div>
      </div>
    )
  }

  const filledCount = Object.keys(filled).length
  const totalCells = cellMap.size

  return (
    <div className={styles.crosswordPage}>
      <header className={styles.cwHeader}>
        <div className={styles.cwHeaderContent}>
          <Link to="/crossword" className={styles.cwBackBtn} aria-label="Back to puzzle list">
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1>{level.title}</h1>
          <div className={styles.cwStarBadge}>
            <i className="fas fa-star"></i>
            <span>{progress.starsBalance}</span>
          </div>
        </div>
      </header>

      <div className={styles.cwPlayMeta}>
        <span><i className="fas fa-clock"></i> {formatTime(secondsElapsed)}</span>
        <span><i className="fas fa-th"></i> {filledCount}/{totalCells}</span>
        <button
          type="button"
          className={styles.cwHintBtn}
          onClick={useHint}
          disabled={progress.starsBalance < 1 || isComplete}
        >
          <i className="fas fa-lightbulb"></i> Hint
        </button>
      </div>

      <div className={styles.cwGridWrap}>
        <div
          className={styles.cwGrid}
          style={{ gridTemplateColumns: `repeat(${level.cols}, 1fr)`, gridTemplateRows: `repeat(${level.rows}, 1fr)` }}
        >
          {Array.from({ length: level.rows }).map((_, r) =>
            Array.from({ length: level.cols }).map((__, c) => {
              const key = `${r}-${c}`
              const cellData = cellMap.get(key)
              if (!cellData) {
                return <div key={key} className={styles.cwCellBlocked} aria-hidden="true"></div>
              }
              const number = getCellNumber(level, r, c)
              const isSelected = selected && selected.row === r && selected.col === c
              const isInActiveWord = activeWordCells.some((ac) => ac.row === r && ac.col === c)
              const letter = filled[key] || ""
              const isRevealed = revealedCells[key]
              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.cwCell} ${isInActiveWord ? styles.cwCellActiveWord : ""} ${
                    isSelected ? styles.cwCellSelected : ""
                  } ${letter ? styles.cwCellFilled : ""} ${isRevealed ? styles.cwCellRevealed : ""}`}
                  onClick={() => handleCellClick(r, c)}
                >
                  {number && <span className={styles.cwCellNumber}>{number}</span>}
                  <span className={styles.cwCellLetter}>{letter}</span>
                </button>
              )
            })
          )}
        </div>
      </div>

      <input
        ref={hiddenInputRef}
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        className={styles.cwHiddenInput}
        onChange={handleHiddenInputChange}
        onKeyDown={handleHiddenInputKeyDown}
        aria-label="Crossword letter input"
      />

      <div className={styles.cwClueBar}>
        <button type="button" onClick={() => goToWord(-1)} aria-label="Previous clue" className={styles.cwClueNavBtn}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <div className={styles.cwClueText} onClick={() => hiddenInputRef.current?.focus()}>
          <span className={styles.cwClueNumber}>
            {activeWord?.number} {activeWord?.direction === "across" ? "Across" : "Down"}
          </span>
          {activeWord?.clue}
        </div>
        <button type="button" onClick={() => goToWord(1)} aria-label="Next clue" className={styles.cwClueNavBtn}>
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      {isComplete && (
        <div className={styles.cwModalOverlay} role="dialog" aria-modal="true">
          <div className={styles.cwModal}>
            <div className={styles.cwModalHeader}>
              <h2>Solved!</h2>
            </div>
            <div className={styles.cwModalBody}>
              <div className={styles.cwModalStat}>
                <span className={styles.cwModalStatLabel}>Time</span>
                <span className={styles.cwModalStatValue}>{formatTime(secondsElapsed)}</span>
              </div>
              <div className={styles.cwModalStat}>
                <span className={styles.cwModalStatLabel}>Words</span>
                <span className={styles.cwModalStatValue}>{level.words.length}</span>
              </div>
              <div className={styles.cwModalStat}>
                <span className={styles.cwModalStatLabel}>Hints used</span>
                <span className={styles.cwModalStatValue}>{hintsUsedThisLevel}</span>
              </div>
              <div className={styles.cwModalStars}>
                {[1, 2, 3].map((i) => (
                  <i
                    key={i}
                    className={`fas fa-star ${
                      i <= (hintsUsedThisLevel === 0 ? 3 : hintsUsedThisLevel <= 2 ? 2 : 1)
                        ? styles.cwStarEarned
                        : styles.cwStarEmpty
                    }`}
                  ></i>
                ))}
              </div>
            </div>
            <div className={styles.cwModalActions}>
              <Link to="/crossword" className={styles.cwModalSecondaryBtn}>
                Back to list
              </Link>
              {(totalLevels === null || level.levelId < totalLevels) && (
                <button
                  type="button"
                  className={styles.cwModalPrimaryBtn}
                  onClick={() => navigate(`/crossword/play/${level.levelId + 1}`)}
                >
                  Next puzzle
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export default CrosswordPlay
