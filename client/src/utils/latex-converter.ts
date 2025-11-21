/**
 * Create a utility to convert malformed LaTeX from backend to proper LaTeX syntax
 * This handles patterns like frac, sqrt, greek letters, and math operators
 */

export const convertMalformedLatex = (content: string): string => {
  if (!content) return content

  let converted = content

  // Fix frac pattern: "frac a b" -> "\frac{a}{b}"
  converted = converted.replace(/frac\s+([^\s]+)\s+([^\s]+)/g, "\\frac{$1}{$2}")

  // Fix frac pattern with parentheses: "fracx(x+1)(x+1)" -> "\frac{x(x+1)}{(x+1)}"
  converted = converted.replace(/frac([^\s]+)\s*$$([^)]+)$$\s*$$([^)]+)$$/g, "\\frac{$1($2)}{($3)}")

  // Fix sqrt pattern: "sqrt x" -> "\sqrt{x}"
  converted = converted.replace(/sqrt\s+([^\s]+)/g, "\\sqrt{$1}")

  // Fix power/exponent patterns
  converted = converted.replace(/\^(\d+)/g, "^{$1}")

  // Fix Greek letters and common symbols
  const replacements: { [key: string]: string } = {
    "\\balpha\\b": "\\alpha",
    "\\bbeta\\b": "\\beta",
    "\\bgamma\\b": "\\gamma",
    "\\bdelta\\b": "\\delta",
    "\\bepsilon\\b": "\\epsilon",
    "\\btheta\\b": "\\theta",
    "\\blambda\\b": "\\lambda",
    "\\bmu\\b": "\\mu",
    "\\bpi\\b": "\\pi",
    "\\brho\\b": "\\rho",
    "\\bsigma\\b": "\\sigma",
    "\\bphi\\b": "\\phi",
    "\\bpsi\\b": "\\psi",
    "\\bomega\\b": "\\omega",
    "\\bleq\\b": "\\leq",
    "\\bgeq\\b": "\\geq",
    "\\bleqft\\b": "\\leq",
    "\\bneq\\b": "\\neq",
    "\\bcap\\b": "\\cap",
    "\\bcup\\b": "\\cup",
    "\\binfty\\b": "\\infty",
    "\\bpartial\\b": "\\partial",
    "\\bintegral\\b": "\\int",
    "\\bsum\\b": "\\sum",
    "\\bproduct\\b": "\\prod",
  }

  Object.entries(replacements).forEach(([pattern, replacement]) => {
    converted = converted.replace(new RegExp(pattern), replacement)
  })

  // Fix spacing in fractions and functions
  converted = converted.replace(/\\frac\s*\{\s*/g, "\\frac{")
  converted = converted.replace(/\s*\}\s*\{/g, "}{")
  converted = converted.replace(/\s*\}\s*$/g, "}")

  return converted
}

/**
 * Parse content and apply LaTeX conversion before rendering
 */
export const processContentForLatex = (content: string): string => {
  if (!content) return content

  // First convert malformed LaTeX
  let processed = convertMalformedLatex(content)

  // Ensure proper LaTeX delimiters
  // If content has math-like patterns but no delimiters, wrap them
  if (processed.includes("\\") && !processed.match(/\$\$|\\\[|\\\(|\$(?!\$)/)) {
    // This content has LaTeX commands but no delimiters
    // This will be handled by the renderer
    processed = `$$${processed}$$`
  }

  return processed
}
