import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/NotFound.module.css';

const NotFound = () => {
  return (
    <div className={styles.notFound}>
      <div className={styles.container}>
        <div className={styles.notFoundContent}>
          <div className={styles.errorCode}>404</div>
          <h1>Oops! Page Not Found</h1>
          <p>
            The page you're looking for doesn't exist or has been moved. 
            Let's get you back on track!
          </p>
          <div className={styles.notFoundActions}>
            <Link to="/" className={`${styles.btn} ${styles.btnPrimary}`}>
              <i className="fas fa-home"></i> Go to Homepage
            </Link>
            <button onClick={() => window.history.back()} className={`${styles.btn} ${styles.btnOutline}`}>
              <i className="fas fa-arrow-left"></i> Go Back
            </button>
          </div>
          <div className={styles.notFoundIllustration}>
            <div className={styles.astronaut}>
              <i className="fas fa-user-astronaut"></i>
            </div>
            <div className={styles.planet}></div>
            <div className={styles.stars}>
              <i className="fas fa-star star1"></i>
              <i className="fas fa-star star2"></i>
              <i className="fas fa-star star3"></i>
              <i className="fas fa-star star4"></i>
              <i className="fas fa-star star5"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;