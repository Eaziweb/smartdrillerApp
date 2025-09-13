import React from 'react';
import styles from '../../styles/home.module.css';

const AboutSmartDriller = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className={styles.modalHeader}>
          <h2>About SmartDriller</h2>
          <div className={styles.logo}>
            <span className={styles.logoText}>SmartDriller</span>
          </div>
        </div>
        
        <div className={styles.modalBody}>
          <section>
            <h3>Our Mission</h3>
            <p>At SmartDriller, we're committed to revolutionizing education by providing students with innovative learning tools that enhance their academic performance. Our platform combines cutting-edge technology with proven educational methodologies to create a personalized learning experience.</p>
          </section>
          
          <section>
            <h3>Who We Are</h3>
            <p>SmartDriller was founded by a team of passionate educators, technologists, and academic experts who recognized the need for a more effective learning platform. With years of experience in education and technology, we've developed a solution that addresses the unique challenges faced by students in today's competitive academic environment.</p>
          </section>
          
          <section>
            <h3>What We Do</h3>
            <p>Our platform offers a comprehensive suite of learning tools designed to help students excel in their studies:</p>
            <ul>
              <li>Access to thousands of past questions with detailed explanations</li>
              <li>AI-powered personalized learning assistance</li>
              <li>Mock tests that simulate real exam conditions</li>
              <li>Interactive study materials and resources</li>
              <li>Progress tracking and performance analytics</li>
              <li>Competitive challenges and rewards</li>
            </ul>
          </section>
          
          <section>
            <h3>Our Values</h3>
            <div className={styles.valuesGrid}>
              <div className={styles.valueItem}>
                <div className={styles.valueIcon}>
                  <i className="fas fa-lightbulb"></i>
                </div>
                <h4>Innovation</h4>
                <p>We constantly seek new ways to improve learning outcomes through technology.</p>
              </div>
              
              <div className={styles.valueItem}>
                <div className={styles.valueIcon}>
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <h4>Excellence</h4>
                <p>We're committed to providing the highest quality educational resources.</p>
              </div>
              
              <div className={styles.valueItem}>
                <div className={styles.valueIcon}>
                  <i className="fas fa-users"></i>
                </div>
                <h4>Community</h4>
                <p>We foster a supportive learning environment for all students.</p>
              </div>
              
              <div className={styles.valueItem}>
                <div className={styles.valueIcon}>
                  <i className="fas fa-shield-alt"></i>
                </div>
                <h4>Integrity</h4>
                <p>We operate with transparency and honesty in all we do.</p>
              </div>
            </div>
          </section>
          
          <section>
            <h3>Our Impact</h3>
            <p>Since our launch, SmartDriller has helped thousands of students improve their academic performance. Our users report higher grades, increased confidence, and better preparation for exams. We're proud to be making a difference in education.</p>
          </section>
          
          <section>
            <h3>Contact Us</h3>
            <p>We'd love to hear from you! If you have questions, feedback, or suggestions, please reach out to us:</p>
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <i className="fas fa-envelope"></i>
                <span>info@smartdriller.com</span>
              </div>
              <div className={styles.contactItem}>
                <i className="fas fa-phone"></i>
                <span>+2348103414050</span>
              </div>
              <div className={styles.contactItem}>
                <i className="fab fa-whatsapp"></i>
                <span>WhatsApp Channel</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutSmartDriller;