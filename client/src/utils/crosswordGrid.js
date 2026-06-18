// Pure grid helpers, kept separate from the component so the layout logic
// (which is the part most likely to have an off-by-one bug) can be reasoned
// about and unit tested without rendering anything.

export function buildCellMap(levelData) {
  const cells = new Map() // key "r-c" -> { row, col, letter, wordRefs: [{wordIndex, indexInWord}] }

  levelData.words.forEach((word, wordIndex) => {
    const { row, col, answer, direction } = word
    for (let i = 0; i < answer.length; i++) {
      const r = direction === "across" ? row : row + i
      const c = direction === "across" ? col + i : col
      const key = `${r}-${c}`
      const letter = answer[i]
      if (!cells.has(key)) {
        cells.set(key, { row: r, col: c, letter, wordRefs: [] })
      }
      cells.get(key).wordRefs.push({ wordIndex, indexInWord: i })
    }
  })

  return cells
}

export function getCellNumber(levelData, row, col) {
  const word = levelData.words.find((w) => w.row === row && w.col === col)
  return word ? word.number : null
}

export function getWordCells(word) {
  const result = []
  for (let i = 0; i < word.answer.length; i++) {
    const r = word.direction === "across" ? word.row : word.row + i
    const c = word.direction === "across" ? word.col + i : word.col
    result.push({ row: r, col: c })
  }
  return result
}

export function isPuzzleComplete(levelData, filledLetters) {
  for (const word of levelData.words) {
    const cellsForWord = getWordCells(word)
    for (let i = 0; i < cellsForWord.length; i++) {
      const { row, col } = cellsForWord[i]
      const key = `${row}-${col}`
      if (filledLetters[key] !== word.answer[i]) return false
    }
  }
  return true
}

export function findWordAt(levelData, row, col, preferredDirection) {
  const candidates = levelData.words.filter((w) => {
    const cellsForWord = getWordCells(w)
    return cellsForWord.some((c) => c.row === row && c.col === col)
  })
  if (candidates.length === 0) return null
  const preferred = candidates.find((w) => w.direction === preferredDirection)
  return preferred || candidates[0]
}

export function nextCellInWord(word, row, col) {
  const cellsForWord = getWordCells(word)
  const idx = cellsForWord.findIndex((c) => c.row === row && c.col === col)
  if (idx === -1 || idx === cellsForWord.length - 1) return null
  return cellsForWord[idx + 1]
}

export function prevCellInWord(word, row, col) {
  const cellsForWord = getWordCells(word)
  const idx = cellsForWord.findIndex((c) => c.row === row && c.col === col)
  if (idx <= 0) return null
  return cellsForWord[idx - 1]
}
