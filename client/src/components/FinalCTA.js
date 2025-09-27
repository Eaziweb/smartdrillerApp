import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/FinalCTA.module.css';


const FinalCTA = () => {
  return (
    <section className={styles.finalCTA}>
      <div className="container">
        <div className={styles.ctaContent}>
          <h2>Ready to Excel?</h2>
          <p>Join thousands of smart students who are already achieving their academic goals with SmartDrill</p>
          <div className={styles.ctaStats}>
            <div className={styles.stat}>
              <div className={styles.statNumber}>--</div>
              <div className={styles.statLabel}>Active Students</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>99%</div>
              <div className={styles.statLabel}>Success Rate</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>4.99/5</div>
              <div className={styles.statLabel}>Student Rating</div>
            </div>
          </div>
          <Link to="/register" className={styles.btnCTA}>
            Start Practicing Now
            <i className="fas fa-arrow-right"></i>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;