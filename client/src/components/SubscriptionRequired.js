"use client"

import { useNavigate } from "react-router-dom"
import "../styles/SubscriptionRequired.css"

const SubscriptionRequired = () => {
  const navigate = useNavigate()


  const handleGoHome = () => {
    navigate("/home")
  }

  return (
    <div className="subscription-required">
      <div className="subscription-container">
        <div className="subscription-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
              fill="#ffd700"
              stroke="#ffa500"
              strokeWidth="1"
            />
          </svg>
        </div>

        <h2>Premium Feature</h2>
        <p>This feature is available for premium subscribers only.</p>

        <div className="features-list">
          <h3>Premium Benefits:</h3>
          <ul>
            <li>✓ Access to Study Mode with unlimited questions</li>
            <li>✓ Mock Tests with detailed analytics</li>
            <li>✓ Bookmark questions for later review</li>
            <li>✓ Detailed explanations and corrections</li>
            <li>✓ Progress tracking and results history</li>
            <li>✓ All courses and years available</li>
          </ul>
        </div>

        <div className="subscription-actions">

          <button className="btn-home" onClick={handleGoHome}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionRequired
