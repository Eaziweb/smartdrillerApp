import api from "./api"

// All puzzle content is static and lives in /public/puzzles, fetched directly
// by the browser — never through the backend. The backend is only ever
// touched for progress (and only on completion / hint spend), keeping
// database reads/writes to a handful per session instead of per render.

const PUZZLE_BASE_PATH = "/puzzles"

export async function fetchLevelsIndex() {
  const res = await fetch(`${PUZZLE_BASE_PATH}/levels-index.json`)
  if (!res.ok) throw new Error("Failed to load levels index")
  return res.json()
}

export async function fetchLevel(levelId) {
  const res = await fetch(`${PUZZLE_BASE_PATH}/level-${levelId}.json`)
  if (!res.ok) throw new Error(`Failed to load level ${levelId}`)
  return res.json()
}

// ---- localStorage (instant, zero network) ----
const STORAGE_KEY = "crossword_progress_v1"

export function readLocalProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { levels: {}, highestUnlockedLevel: 1, starsBalance: 0 }
    return JSON.parse(raw)
  } catch {
    return { levels: {}, highestUnlockedLevel: 1, starsBalance: 0 }
  }
}

export function writeLocalProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage full or unavailable — fail silently, backend sync still covers us.
  }
}

// ---- Backend sync (background, never blocks the UI) ----
export async function fetchRemoteProgress() {
  const response = await api.get("/api/crossword/progress")
  return response.data
}

// Fire-and-forget by design: callers should not await this in the render
// path. Errors are swallowed because losing one sync is not worth
// interrupting gameplay; the next completed level will sync again.
export function syncProgressInBackground(payload) {
  api.put("/api/crossword/progress", payload).catch(() => {
    // Silent — localStorage already has the source of truth for this session.
  })
}
