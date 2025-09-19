import  { useState, useEffect } from 'react';
import styles from '../styles/GetStarted.module.css';


const GetStarted = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 3;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prevStep) => (prevStep + 1) % totalSteps);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const updateStep = (stepIndex) => {
    setCurrentStep(stepIndex);
  };

  return (
    <section className={styles.getStarted} id="get-started">
      <div className="container">
                <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Get Started in 3 Steps</h2>
          <p className={styles.sectionSubtitle}>Join thousands of successful smart students</p>
        </div>
        <div className={styles.stepsSliderWrapper}>
          <div className={styles.stepsSlider}>
            {/* Step 1: Sign Up */}
            <div className={`${styles.stepSlide} ${currentStep === 0 ? styles.active : ''}`} data-step="0">
              <div className={styles.stepContent}>
                <div className={styles.stepNumber}>01</div>
                <div className={`${styles.stepIcon} ${styles.signupIcon}`}>
                  <i className="fas fa-user-plus"></i>
                </div>
                <h3>Sign Up & Verify Device</h3>
                <p>Create your free account in seconds and join thousands of successful smart students on their academic journey.</p>
                <div className={styles.stepFeatures}>
                  <div className={styles.featureItem}>
                    <i className="fas fa-check"></i>
                    <span>Free Registration</span>
                  </div>
                  <div className={styles.featureItem}>
                    <i className="fas fa-check"></i>
                    <span>Instant Access</span>
                  </div>
                  <div className={styles.featureItem}>
                    <i className="fas fa-check"></i>
                    <span>No Payment Required</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Step 2: Activate */}
            <div className={`${styles.stepSlide} ${currentStep === 1 ? styles.active : ''}`} data-step="1">
              <div className={styles.stepContent}>
                <div className={styles.stepNumber}>02</div>
                <div className={`${styles.stepIcon} ${styles.activateIcon}`}>
                  <i className="fas fa-bolt"></i>
                </div>
                <h3>Activate Premium Features</h3>
                <p>Choose your plan and unlock premium features including AI assistance, unlimited questions, and competition access.</p>
                <div className={styles.stepFeatures}>
                  <div className={styles.featureItem}>
                    <i className="fas fa-check"></i>
                    <span>Study 10x faster</span>
                  </div>
                  <div className={styles.featureItem}>
                    <i className="fas fa-check"></i>
                    <span>Unlimited Access</span>
                  </div>
                  <div className={styles.featureItem}>
                    <i className="fas fa-check"></i>
                    <span>Battleground</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Step 3: Start Drilling */}
            <div className={`${styles.stepSlide} ${currentStep === 2 ? styles.active : ''}`} data-step="2">
              <div className={styles.stepContent}>
                <div className={styles.stepNumber}>03</div>
                <div className={`${styles.stepIcon} ${styles.drillIcon}`}>
                  <i className="fas fa-rocket"></i>
                </div>
                <h3>Start Drilling & Excel</h3>
                <p>Begin your journey to academic excellence with smart practice, track your progress, and watch your grades soar!</p>
                <div className={styles.stepFeatures}>
                  <div className={styles.featureItem}>
                    <i className="fas fa-check"></i>
                    <span>Smart Practice Sessions</span>
                  </div>
                  <div className={styles.featureItem}>
                    <i className="fas fa-check"></i>
                    <span>Progress Tracking</span>
                  </div>
                  <div className={styles.featureItem}>
                    <i className="fas fa-check"></i>
                    <span>Bookmarks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.stepNavigation}>
            <div className={styles.stepDots}>
              {[0, 1, 2].map((step) => (
                <button 
                  key={step}
                  className={`${styles.stepDot} ${currentStep === step ? styles.active : ''}`} 
                  data-step={step}
                  onClick={() => updateStep(step)}
                ></button>
              ))}
            </div>
            <div className={styles.stepProgress}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                ></div>
              </div>
              <div className={styles.progressText}>
                <span className={styles.currentStep}>{currentStep + 1}</span> of <span className="totalSteps">{totalSteps}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GetStarted;