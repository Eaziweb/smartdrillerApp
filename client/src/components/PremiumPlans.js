import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/PremiumPlans.module.css';


const PremiumPlans = () => {
  return (
    <section className={styles.premiumPlans} id="premium">
      <div className="container">
 
                       <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Choose Your Plan</h2>
                  <p className={styles.sectionSubtitle}>Start free or unlock premium features for maximum success</p>
                </div>
        <div className={styles.plansWrapper}>
          {/* Free Plan */}
          <div className={`${styles.planCard} ${styles.freePlan}`} data-aos="fade-right">
            <div className={styles.planHeader}>
              <div className={styles.planIcon}>
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h3>Free Plan</h3>
              <div className={styles.planPrice}>
                <span className={styles.currency}>₦</span>
                <span className={styles.amount}>0</span>
                <span className={styles.period}>/forever</span>
              </div>
              <p className={styles.planDescription}>Perfect for getting started</p>
            </div>
            <ul className={styles.planFeatures}>
              <li><i className="fas fa-check"></i> Community support forum access</li>
              <li><i className="fas fa-check"></i> Website notifications and updates</li>
              <li><i className="fas fa-check"></i> Leaderboard View</li>
            </ul>
            <Link to="register" className={`${styles.planBtn} ${styles.btnOutline}`}>
              <i className="fas fa-play"></i>
              Get Started Free
            </Link>
          </div>
          
          {/* Premium Plan */}
          <div className={`${styles.planCard} ${styles.premiumPlan}`} data-aos="fade-left">
            <div className={styles.planBadge}>
              <i className="fas fa-crown"></i>
              Most Popular
            </div>
            <div className={styles.planHeader}>
              <div className={styles.planIcon}>
                <i className="fas fa-crown"></i>
              </div>
              <h3>Premium Access</h3>
              <div className={styles.planPrice}>
                <span className={styles.currency}>₦</span>
                <span className={styles.amount}>3000</span>
                <span className={styles.period}>/semester</span>
              </div>
              <p className={styles.planDescription}>Everything you need to excel</p>
            </div>
            <ul className={styles.planFeatures}>
              <li><i className="fas fa-check"></i> Unlimited access to all past questions</li>
              <li><i className="fas fa-check"></i> Detailed topic-by-topic explanations</li>
              <li><i className="fas fa-check"></i> Bookmark important questions for review</li>
              <li><i className="fas fa-check"></i> Watch course-specific videos directly on the platform</li>
              <li><i className="fas fa-check"></i> Smart question search by keyword or topic</li>
              <li><i className="fas fa-check"></i> Unlimited mock tests with detailed performance reports</li>
              <li><i className="fas fa-check"></i> Compete in quiz battles to win cash prizes</li>
              <li><i className="fas fa-check"></i> Downloadable study materials and class notes</li>
              <li><i className="fas fa-check"></i> Priority support with instant assistance</li>
              <li><i className="fas fa-check"></i> AI-powered study assistant and tutor</li>
              <li><i className="fas fa-check"></i> Performance analytics to track your progress</li>
            </ul>
            <Link to="/register" className={`${styles.planBtn} ${styles.btnPrimary}`}>
              <i className="fas fa-rocket"></i>
              Upgrade to Premium
            </Link>
          </div>
        </div>
        
        <div className={styles.planNote}>
          <p><i className="fas fa-info-circle"></i> All plans include access to our supportive community and basic learning resources</p>
        </div>
      </div>
    </section>
  );
};

export default PremiumPlans;