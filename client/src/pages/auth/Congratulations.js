// pages/auth/Congratulations.js
"use client"
import { Link } from "react-router-dom"
import styles from "../../styles/Reg-Congratulation.module.css"

const Congratulations = () => {
  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.authHeader}>
          <h1 className={styles.appLogo}>SmartDriller</h1>
        </div>
        
        <div className={styles.formContainer}>
          <div className={styles.congratulationsContainer}>
            <div className={styles.congratulationsIcon}>
              <i className="fas fa-check-circle"></i>
            </div>
            <h1>Registration Successful!</h1>
            <p>Your account has been created successfully.</p>
            <p>You can now log in with your credentials.</p>
            
            <Link to="/login" className={styles.submitBtn}>
              <div className={styles.btnContent}>
                <span className={styles.btnText}>Go to Login</span>
              </div>
              <i className={`fas fa-arrow-right ${styles.btnArrow}`}></i>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Congratulations