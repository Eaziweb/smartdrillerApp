import { createContext, useContext, useState } from "react"

const NotificationContext = createContext()

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({ message: "", type: "" })

  const showNotification = (message, type = "info") => {
    setNotification({ message, type })
    setTimeout(() => setNotification({ message: "", type: "" }), 4000) // auto clear
  }

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}

      {/* Notification UI */}
      {notification.message && (
        <div
          className={`notification ${notification.type}`}
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "0.8rem 1rem",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 9999,
            fontWeight: "500",
            backgroundColor:
              notification.type === "success"
                ? "rgba(40,167,69,0.9)"
                : notification.type === "error"
                ? "rgba(220,53,69,0.9)"
                : "rgba(0,123,255,0.9)",
            color: "#fff",
          }}
        >
          {notification.message}
        </div>
      )}
    </NotificationContext.Provider>
  )
}
