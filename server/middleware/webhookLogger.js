const fs = require("fs")
const path = require("path")

const webhookLogger = (req, res, next) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  }

  const logDir = path.join(__dirname, "../logs")
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }

  const logFile = path.join(logDir, "webhook-logs.json")

  try {
    let logs = []
    if (fs.existsSync(logFile)) {
      const fileContent = fs.readFileSync(logFile, "utf8")
      logs = JSON.parse(fileContent)
    }

    logs.push(logEntry)

    // Keep only last 100 logs
    if (logs.length > 100) {
      logs = logs.slice(-100)
    }

    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2))
  } catch (error) {
    console.error("[v0] Error logging webhook:", error)
  }

  next()
}

module.exports = webhookLogger
