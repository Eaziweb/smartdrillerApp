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
  isWordCorrect,
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
  
  const [filled, setFilled] = useState({})
  const [lockedCells, setLockedCells] = useState(new Set())
  
  const [selected, setSelected] = useState(null)
  const [direction, setDirection] = useState("across")
  const [activeWordIndex, setActiveWordIndex] = useState(0)
  
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [hintsUsedThisLevel, setHintsUsedThisLevel] = useState(0)
  const [totalLevels, setTotalLevels] = useState(null)

  const timerRef = useRef(null)

  // ONLY play sound when a word is fully correct
  const playCorrectSound = () => {
    try {
      const audio = new Audio(`/sounds/correct.mp3`);
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }

  useEffect(() => {
    fetchLevelsIndex().then((data) => setTotalLevels(data.totalLevels)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError("")
    setFilled({})
    setLockedCells(new Set())
    setIsComplete(false)
    setSecondsElapsed(0)
    setHintsUsedThisLevel(0)

    fetchLevel(levelId)
      .then((data) => {
        setLevel(data)
        setSelected({ row: data.words[0].row, col: data.words[0].col })
        setDirection(data.words[0].direction)
        setActiveWordIndex(0)
        setLoading(false)
      })
      .catch(() => {
        setError("Couldn't load this puzzle.")
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
    },
    [level, cellMap, direction]
  )

  const handleCellClick = (row, col) => {
    const key = `${row}-${col}`
    if (!cellMap.has(key)) return
    
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

  const checkCompletionAndLocks = (nextFilled) => {
    if (!level) return

    let newlySolved = false;
    const newLockedSet = new Set(lockedCells);

    level.words.forEach(word => {
      if (isWordCorrect(word, nextFilled)) {
        const cells = getWordCells(word);
        const isNew = cells.some(c => !newLockedSet.has(`${c.row}-${c.col}`));
        
        if (isNew) {
          newlySolved = true;
          cells.forEach(c => newLockedSet.add(`${c.row}-${c.col}`));
        }
      }
    });

    if (newlySolved) {
      playCorrectSound();
      setLockedCells(newLockedSet);

      // Auto-Advance to next unsolved word
      const nextUnsolvedWordIndex = level.words.findIndex(w => !isWordCorrect(w, nextFilled));
      if (nextUnsolvedWordIndex !== -1) {
        const nextWord = level.words[nextUnsolvedWordIndex];
        const cells = getWordCells(nextWord);
        // Find the first completely empty cell in the new word
        const firstEmpty = cells.find(c => !nextFilled[`${c.row}-${c.col}`]);
        
        if (firstEmpty) {
          setActiveWordIndex(nextUnsolvedWordIndex);
          setDirection(nextWord.direction);
          setSelected(firstEmpty);
        }
      }
    }

    if (isPuzzleComplete(level, nextFilled)) {
      setIsComplete(true)
      clearInterval(timerRef.current)
      const stars = hintsUsedThisLevel === 0 ? 3 : hintsUsedThisLevel <= 2 ? 2 : 1
      recordLevelComplete(level.levelId, secondsElapsed, stars)
    }
  }

  const advanceToNextUnfilled = (row, col, currentFilled) => {
    let next = nextCellInWord(activeWord, row, col)
    
    // Skip any cell that already has a letter filled inside it
    while (next && currentFilled[`${next.row}-${next.col}`]) {
      next = nextCellInWord(activeWord, next.row, next.col)
    }
    
    if (next) setSelected(next)
  }

  const handleLetterInput = (letter) => {
    if (!selected || !activeWord || isComplete) return
    const key = `${selected.row}-${selected.col}`
    
    if (lockedCells.has(key)) {
      advanceToNextUnfilled(selected.row, selected.col, filled);
      return;
    }

    const nextFilled = { ...filled, [key]: letter }
    setFilled(nextFilled)
    checkCompletionAndLocks(nextFilled)
    advanceToNextUnfilled(selected.row, selected.col, nextFilled)
  }

  const handleBackspace = () => {
    if (!selected || !activeWord || isComplete) return
    const key = `${selected.row}-${selected.col}`
    
    if (filled[key] && !lockedCells.has(key)) {
      const nextFilled = { ...filled }
      delete nextFilled[key]
      setFilled(nextFilled)
    } else {
      let prev = prevCellInWord(activeWord, selected.row, selected.col)
      
      // Auto-skip backwards over locked/filled cells
      while (prev && lockedCells.has(`${prev.row}-${prev.col}`)) {
        prev = prevCellInWord(activeWord, prev.row, prev.col)
      }

      if (prev) {
        const prevKey = `${prev.row}-${prev.col}`
        const nextFilled = { ...filled }
        
        if (!lockedCells.has(prevKey)) {
          delete nextFilled[prevKey]
        }
        
        setFilled(nextFilled)
        setSelected(prev)
      }
    }
  }

  const goToWord = (delta) => {
    if (!level) return
    const nextIndex = (activeWordIndex + delta + level.words.length) % level.words.length
    const word = level.words[nextIndex]
    setActiveWordIndex(nextIndex)
    setDirection(word.direction)
    setSelected({ row: word.row, col: word.col })
  }

  const useHint = () => {
    if (!activeWord || progress.starsBalance < 1 || isComplete) return
    
    const cellsForWord = getWordCells(activeWord)
    const unfilledCell = cellsForWord.find((c) => {
      const k = `${c.row}-${c.col}`;
      return filled[k] !== activeWord.answer[cellsForWord.indexOf(c)];
    })
    
    if (!unfilledCell) return

    const idx = cellsForWord.indexOf(unfilledCell)
    const key = `${unfilledCell.row}-${unfilledCell.col}`
    const nextFilled = { ...filled, [key]: activeWord.answer[idx] }
    
    setFilled(nextFilled)
    setHintsUsedThisLevel(prev => prev + 1)
    recordHintUsed(level.levelId)
    checkCompletionAndLocks(nextFilled)
  }

  if (loading || !level) return <div className={styles.cwStatusFull}>Loading...</div>

  return (
    <div className={styles.crosswordPage}>
      <header className={styles.cwHeader}>
        <div className={styles.cwHeaderContent}>
          <Link to="/crossword" className={styles.cwBackBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          {/* Changed title directly to Level X */}
          <h1>Level {level.levelId}</h1>
          <div className={styles.cwStarBadge}>
            <i className="fas fa-star"></i>
            <span>{progress.starsBalance}</span>
          </div>
        </div>
      </header>

      <div className={styles.cwPlayMeta}>
        <span><i className="fas fa-clock"></i> {formatTime(secondsElapsed)}</span>
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
          style={{ 
            gridTemplateColumns: `repeat(${level.cols}, 1fr)`, 
            gridTemplateRows: `repeat(${level.rows}, 1fr)` 
          }}
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
              const isLocked = lockedCells.has(key)
              const letter = filled[key] || ""
              const isStartOfActiveWord = activeWord.row === r && activeWord.col === c;

              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.cwCell} 
                    ${isInActiveWord ? styles.cwCellActiveWord : ""} 
                    ${isSelected ? styles.cwCellSelected : ""} 
                    ${isLocked ? styles.cwCellLocked : ""}`}
                  onClick={() => handleCellClick(r, c)}
                >
                  {number && (
                    <span className={`${styles.cwCellNumber} ${isStartOfActiveWord ? styles.cwActiveNumber : ""}`}>
                      {number}
                    </span>
                  )}
                  <span className={styles.cwCellLetter}>{letter}</span>
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className={styles.cwBottomContainer}>
        <div className={styles.cwClueBar}>
          <button type="button" onClick={() => goToWord(-1)} className={styles.cwClueNavBtn}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <div className={styles.cwClueText}>
            <span className={styles.cwClueNumber}>
              {activeWord?.number} {activeWord?.direction === "across" ? "Across" : "Down"}
            </span>
            {activeWord?.clue}
          </div>
          <button type="button" onClick={() => goToWord(1)} className={styles.cwClueNavBtn}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        <CustomKeyboard onKeyPress={handleLetterInput} onBackspace={handleBackspace} />
      </div>

      {isComplete && (
        <div className={styles.cwModalOverlay}>
          <div className={styles.cwModal}>
            <div className={styles.cwModalHeader}>
              <h2>Perfect!</h2>
            </div>
            <div className={styles.cwModalBody}>
              <div className={styles.cwModalStat}>
                <span className={styles.cwModalStatLabel}>Time</span>
                <span className={styles.cwModalStatValue}>{formatTime(secondsElapsed)}</span>
              </div>
            </div>
            <div className={styles.cwModalActions}>
              <Link to="/crossword" className={styles.cwModalSecondaryBtn}>Levels</Link>
              {(totalLevels === null || level.levelId < totalLevels) && (
                <button
                  type="button"
                  className={styles.cwModalPrimaryBtn}
                  onClick={() => navigate(`/crossword/play/${level.levelId + 1}`)}
                >
                  Next Level
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

const CustomKeyboard = ({ onKeyPress, onBackspace }) => {
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
  ]

  return (
    <div className={styles.cwKeyboard}>
      {rows.map((row, i) => (
        <div key={i} className={styles.cwKeyRow}>
          {i === 2 && <button type="button" className={styles.cwKeyGhost} disabled></button>}
          {row.map(key => (
            <button key={key} type="button" className={styles.cwKey} onClick={() => onKeyPress(key)}>
              {key}
            </button>
          ))}
          {i === 2 && (
            <button type="button" className={`${styles.cwKey} ${styles.cwKeyAction}`} onClick={onBackspace}>
              <i className="fas fa-backspace"></i>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export default CrosswordPlay
