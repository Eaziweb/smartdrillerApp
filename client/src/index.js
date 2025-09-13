import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

// Add MathJax configuration
window.MathJax = {
  tex: {
    inlineMath: [
      ["$", "$"],
      ["$$", "$$"],
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"],
    ],
  },
  svg: {
    fontCache: "global",
  },
}

// Load MathJax script
const script = document.createElement("script")
script.src = "https://polyfill.io/v3/polyfill.min.js?features=es6"
document.head.appendChild(script)

const mathJaxScript = document.createElement("script")
mathJaxScript.id = "MathJax-script"
mathJaxScript.async = true
mathJaxScript.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
document.head.appendChild(mathJaxScript)

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
