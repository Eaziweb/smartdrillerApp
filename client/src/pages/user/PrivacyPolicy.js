import React from 'react';
import styles from '../../styles/PrivacyPolicy.module.css';

const PrivacyPolicy = () => {
  return (
    <div className={styles.privacyContainer}>
      <div className={styles.privacyContent}>
        <h1>Privacy Policy</h1>
        <div className={styles.lastUpdated}>Last updated: January 1, 2025</div>
        
        <section>
          <h2>Introduction</h2>
          <p>SmartDriller ("we", "us", or "our") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our platform.</p>
        </section>
        
        <section>
          <h2>Information We Collect</h2>
          <h3>Personal Information</h3>
          <ul>
            <li>Name and contact details (email, phone number)</li>
            <li>Account credentials (username, password)</li>
            <li>Profile information (educational institution, course of study)</li>
            <li>Payment information (for premium subscriptions)</li>
          </ul>
          
          <h3>Usage Data</h3>
          <ul>
            <li>Pages visited and time spent on our platform</li>
            <li>Study patterns and performance metrics</li>
            <li>Device information and IP address</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </section>
        
        <section>
          <h2>How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain our educational services</li>
            <li>To personalize your learning experience</li>
            <li>To process payments and manage subscriptions</li>
            <li>To communicate with you about updates and offers</li>
            <li>To analyze and improve our platform</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>
        
        <section>
          <h2>Data Sharing and Disclosure</h2>
          <p>We do not sell or rent your personal information to third parties. We may share your data only in the following circumstances:</p>
          <ul>
            <li>With service providers who perform services on our behalf</li>
            <li>When required by law or to protect our rights</li>
            <li>In connection with a business transfer or merger</li>
            <li>With your explicit consent</li>
          </ul>
        </section>
        
        <section>
          <h2>Data Security</h2>
          <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These include encryption, secure servers, and regular security assessments.</p>
        </section>
        
        <section>
          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of marketing communications</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>
        
        <section>
          <h2>Cookies</h2>
          <p>Our platform uses cookies to enhance your experience, analyze site traffic, and personalize content. You can manage your cookie preferences through your browser settings.</p>
        </section>
        
        <section>
          <h2>Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. Changes will be posted on this page with an updated revision date.</p>
        </section>
        
        <section>
          <h2>Contact Us</h2>
          <p>If you have any questions about this privacy policy, please contact us at:</p>
          <p>Email: privacy@smartdriller.com</p>
          <p>Phone: +2348103414050</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;