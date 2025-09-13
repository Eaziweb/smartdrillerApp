import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerHeader}>
          <div className={styles.appLogo}>SmartDriller</div>
          <p>Empowering students to achieve academic excellence through smart practice and AI-powered learning.</p>
          <div className={styles.socialLinks}>
            <Link to="#"><i className="fab fa-facebook"></i></Link>
            <Link to="#"><i className="fab fa-whatsapp"></i></Link>
          </div>
        </div>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4>Company</h4>
            <ul>
              <li><Link to="/company">About Us</Link></li>
              <li><Link to="/company">Our Mission</Link></li>
              <li><Link to="/company">Blog</Link></li>
            </ul>
          </div>
          <div className={styles.footerSection}>
            <h4>Resources</h4>
            <ul>
              <li><Link to="/resources">Help Center</Link></li>
              <li><Link to="/resources">FAQ</Link></li>
              <li><Link to="/resources">Study Guides</Link></li>
              <li><Link to="/resources">Support</Link></li>
            </ul>
          </div>
          <div className={styles.footerSection}>
            <h4>Legal</h4>
            <ul>
              <li><Link to="/terms">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/terms">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; 2025 SmartDrill. All Rights Reserved</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;