
import styles from '../styles/Features.module.css';

const Features = () => {
  return (
    <section className={styles.features} id="features">
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Why Choose SmartDrill?</h2>
          <p className={styles.sectionSubtitle}>Everything you need to excel in your studies</p>
        </div>
        
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard} data-aos="fade-up" data-aos-delay="0">
            <div className={styles.featureIcon}>
              <i className="fas fa-book-open"></i>
            </div>
            <h3>Study</h3>
            <p>Access thousands of past questions, sorted by topic and year, each with detailed explanations to boost your understanding.</p>
          </div>
          <div className={styles.featureCard} data-aos="fade-up" data-aos-delay="100">
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-stopwatch"></i>
            </div>
            <h3>Mock Tests</h3>
            <p>Simulate real exam conditions with our comprehensive timed practice tests and detailed results.</p>
          </div>
          <div className={styles.featureCard} data-aos="fade-up" data-aos-delay="200">
            <div className={styles.featureIcon}>
              <i className="fas fa-trophy"></i>
            </div>
            <h3>Battleground</h3>
            <p>Compete in head-to-head challenges and stand a chance to win exciting prizes.</p>
          </div>
          <div className={styles.featureCard} data-aos="fade-up" data-aos-delay="200">
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-note-sticky"></i>
            </div>
            <h3>Notes</h3>
            <p>Get comprehensive notes on selected courses and practicals to deepen your understanding.</p>
          </div>
          <div className={styles.featureCard} data-aos="fade-up" data-aos-delay="200">
            <div className={styles.featureIcon}>
              <i className="fas fa-play-circle"></i>
            </div>
            <h3>Videos</h3>
            <p>Watch curated YouTube videos for each course, right from our platform, for more effective learning.</p>
          </div>
          <div className={styles.featureCard} data-aos="fade-up" data-aos-delay="200">
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-file-arrow-down"></i>
            </div>
            <h3>Materials</h3>
            <p>Upload and access well-organized course materials anytime, anywhere.</p>
          </div>
          <div className={styles.featureCard} data-aos="fade-up" data-aos-delay="200">
            <div className={styles.featureIcon}>
              <i className="fa-solid fa-bookmark"></i>
            </div>
            <h3>Bookmarks</h3>
            <p>Easily save important questions and materials so you can revisit and practice them anytime.</p>
          </div>
          <div className={styles.featureCard} data-aos="fade-up" data-aos-delay="300">
            <div className={styles.featureIcon}>
              <i className="fas fa-robot"></i>
            </div>
            <h3>AI Assistant</h3>
            <p>Get instant explanations, personalized study plans, and smart recommendations from our AI tutor.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;