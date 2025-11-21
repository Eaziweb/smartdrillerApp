/**
 * Enhanced math content renderer with automatic LaTeX conversion
 */
import type React from "react"
import { convertMalformedLatex } from "./latex-converter"

interface RenderMathProps {
  content: string
  isDisplayMode?: boolean
}

export const RenderMathContent: React.FC<RenderMathProps> = ({ content, isDisplayMode = false }) => {
  if (!content || !window.katex) {
    return <span>{content}</span>
  }

  // Convert malformed LaTeX first
  const cleanedContent = convertMalformedLatex(content)

  // Find LaTeX patterns
  const latexPattern = /(\\$$.*?\\$$|\\\[.*?\\\]|\$\$.*?\$\$|\$[^$]+\$)/gs
  const parts = cleanedContent.split(latexPattern)

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null

        // Check if this part matches a LaTeX pattern
        if (latexPattern.test(part)) {
          let latexContent = part
          let displayMode = isDisplayMode

          // Determine if display mode and extract content
          if (part.startsWith("\\(")) {
            latexContent = part.slice(2, -2)
            displayMode = false
          } else if (part.startsWith("\\[")) {
            latexContent = part.slice(2, -2)
            displayMode = true
          } else if (part.startsWith("$$")) {
            latexContent = part.slice(2, -2)
            displayMode = true
          } else if (part.startsWith("$")) {
            latexContent = part.slice(1, -1)
            displayMode = false
          }

          // Additional conversion for the extracted content
          latexContent = convertMalformedLatex(latexContent)

          try {
            const html = window.katex.renderToString(latexContent, {
              throwOnError: false,
              displayMode,
            })
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{ __html: html }}
                style={{
                  display: displayMode ? "block" : "inline",
                  margin: displayMode ? "1em 0" : "0",
                }}
              />
            )
          } catch (error) {
            console.error("KaTeX render error:", error)
            return <span key={index}>{part}</span>
          }
        } else {
          // Regular text content
          return <span key={index}>{part}</span>
        }
      })}
    </>
  )
}
