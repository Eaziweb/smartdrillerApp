import { useState, useEffect, useCallback, useRef } from "react"
import {
  readLocalProgress,
  writeLocalProgress,
  fetchRemoteProgress,
  syncProgressInBackground,
} from "./crosswordApi"

// Single source of truth for crossword progress across the hub and play
// screens. Reads localStorage synchronously on first render so the UI never
// waits on a network call, then reconciles with the backend once, quietly,
// in the background. Writes are debounced-by-design: they only happen on
// real milestones (level completed, hint used), never on keystrokes.
export function useCrosswordProgress() {
  const [progress, setProgress] = useState(() => readLocalProgress())
  const hasReconciled = useRef(false)

  useEffect(() => {
    if (hasReconciled.current) return
    hasReconciled.current = true

    fetchRemoteProgress()
      .then((remote) => {
        // Merge: keep whichever record is further along per level, so a
        // user switching devices never loses progress either direction.
        setProgress((local) => {
          const merged = mergeProgress(local, remote)
          writeLocalProgress(merged)
          return merged
        })
      })
      .catch(() => {
        // No connection or not logged in yet — localStorage already has us covered.
      })
  }, [])

  const recordHintUsed = useCallback(
    (levelId) => {
      setProgress((prev) => {
        const key = String(levelId)
        const existing = prev.levels[key] || { completed: false, bestTimeSeconds: null, hintsUsed: 0 }
        const next = {
          ...prev,
          starsBalance: Math.max(0, prev.starsBalance - 1),
          levels: {
            ...prev.levels,
            [key]: { ...existing, hintsUsed: existing.hintsUsed + 1 },
          },
        }
        writeLocalProgress(next)
        syncProgressInBackground({ levelId, hintsUsed: 1, starsDelta: -1 })
        return next
      })
    },
    []
  )

  const recordLevelComplete = useCallback(
    (levelId, timeSeconds, starsEarned) => {
      setProgress((prev) => {
        const key = String(levelId)
        const existing = prev.levels[key] || { completed: false, bestTimeSeconds: null, hintsUsed: 0 }
        const bestTime =
          existing.bestTimeSeconds === null ? timeSeconds : Math.min(existing.bestTimeSeconds, timeSeconds)
        const next = {
          ...prev,
          starsBalance: prev.starsBalance + starsEarned,
          highestUnlockedLevel: Math.max(prev.highestUnlockedLevel, Number(levelId) + 1),
          levels: {
            ...prev.levels,
            [key]: { ...existing, completed: true, bestTimeSeconds: bestTime },
          },
        }
        writeLocalProgress(next)
        syncProgressInBackground({
          levelId,
          completed: true,
          bestTimeSeconds: timeSeconds,
          starsDelta: starsEarned,
        })
        return next
      })
    },
    []
  )

  return { progress, recordLevelComplete, recordHintUsed }
}

function mergeProgress(local, remote) {
  if (!remote) return local
  const levels = { ...local.levels }
  for (const [key, remoteLevel] of Object.entries(remote.levels || {})) {
    const localLevel = levels[key]
    if (!localLevel) {
      levels[key] = remoteLevel
    } else {
      levels[key] = {
        completed: localLevel.completed || remoteLevel.completed,
        bestTimeSeconds: minOrEither(localLevel.bestTimeSeconds, remoteLevel.bestTimeSeconds),
        hintsUsed: Math.max(localLevel.hintsUsed, remoteLevel.hintsUsed),
      }
    }
  }
  return {
    levels,
    highestUnlockedLevel: Math.max(local.highestUnlockedLevel, remote.highestUnlockedLevel || 1),
    starsBalance: Math.max(local.starsBalance, remote.starsBalance || 0),
  }
}

function minOrEither(a, b) {
  if (a === null || a === undefined) return b ?? null
  if (b === null || b === undefined) return a
  return Math.min(a, b)
}
