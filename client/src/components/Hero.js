
import { Link } from 'react-router-dom';
import styles from '../styles/Hero.module.css';


const Hero = () => {
  const scrollToFeatures = (e) => {
    e.preventDefault();
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className={styles.hero} id="hero">
      <div className="container">
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Smarter Practice.<br />
            <span className={styles.gradientText}>Better Scores.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            The ultimate platform for every students. Access thousands of past questions, 
            AI-powered explanations, mock tests, and compete for cash prizes!
          </p>
          
          <div className={styles.cgpaDisplay}>
            <div className={`${styles.floatingStar} ${styles.star1}`}><i className="fas fa-star"></i></div>
            <div className={`${styles.floatingStar} ${styles.star2}`}><i className="fas fa-star"></i></div>
            <div className={`${styles.floatingStar} ${styles.star3}`}><i className="fas fa-star"></i></div>
            <div className={`${styles.floatingStar} ${styles.star4}`}><i className="fas fa-star"></i></div>
            <div className={`${styles.floatingStar} ${styles.star5}`}><i className="fas fa-star"></i></div>
            
            <div className={styles.cgpaContent}>
              <div className={styles.cgpaText}>
                <span className={styles.cgpaLetter}>A</span>
                <span className={styles.cgpaNumber}>5.0</span>
                <span className={styles.cgpaWord}>CGPA</span>
              </div>
              <div className={styles.cgpaSubtitle}>is Attainable</div>
            </div>
          </div>
          
          <div className={styles.heroButtons}>
            <Link to="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
              Start Drilling<span style={{ marginLeft: 'auto' }}><i className="fas fa-rocket"></i></span>
            </Link>
            <Link to="#features" className={`${styles.btn} ${styles.btnOutline}`} onClick={scrollToFeatures}>
              Learn More <span style={{ marginLeft: 'auto' }}><i className="fas fa-arrow-right"></i></span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;