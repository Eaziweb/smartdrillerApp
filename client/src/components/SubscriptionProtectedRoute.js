"use client"
import { useAuth } from "../contexts/AuthContext"
import SubscriptionRequired from "./SubscriptionRequired"
import styles from "../../styles/loading.module.css"


const SubscriptionProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinnerContainer}>
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      </div>
    )
  }

  // Check if user is subscribed
  if (!user?.isSubscribed) {
    return <SubscriptionRequired />
  }

  return children
}

export default SubscriptionProtectedRoute