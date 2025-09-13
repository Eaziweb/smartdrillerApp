import React from 'react';
import styles from '../../styles/TermsConditions.module.css';

const TermsConditions = () => {
  return (
    <div className={styles.termsContainer}>
      <div className={styles.termsContent}>
        <h1>Terms & Conditions</h1>
        <div className={styles.lastUpdated}>Last updated: January 1, 2025</div>
        
        <section>
          <h2>Acceptance of Terms</h2>
          <p>By accessing and using SmartDriller, you accept and agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use our platform.</p>
        </section>
        
        <section>
          <h2>Description of Service</h2>
          <p>SmartDriller is an educational platform that provides study materials, practice questions, mock tests, and AI-powered learning assistance to help students excel in their academic pursuits.</p>
        </section>
        
        <section>
          <h2>User Accounts</h2>
          <h3>Registration</h3>
          <ul>
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
            <li>You must notify us immediately of any unauthorized use of your account</li>
          </ul>
          
          <h3>Account Responsibilities</h3>
          <ul>
            <li>You are solely responsible for all activities that occur under your account</li>
            <li>You must not share your account with others</li>
            <li>You must be at least 13 years old to create an account</li>
          </ul>
        </section>
        
        <section>
          <h2>Subscription and Payment</h2>
          <h3>Premium Subscriptions</h3>
          <ul>
            <li>Premium subscriptions provide access to additional features and content</li>
            <li>Subscription fees are charged in advance on a recurring basis</li>
            <li>You may cancel your subscription at any time through your account settings</li>
          </ul>
          
          <h3>Payment Terms</h3>
          <ul>
            <li>All payments are processed through secure third-party payment processors</li>
            <li>You agree to provide accurate payment information</li>
            <li>We reserve the right to change subscription fees with prior notice</li>
          </ul>
        </section>
        
        <section>
          <h2>Intellectual Property</h2>
          <p>All content on SmartDriller, including but not limited to text, graphics, logos, images, and software, is the property of SmartDriller or its content suppliers and is protected by intellectual property laws.</p>
          <p>You may not reproduce, distribute, modify, create derivative works of, publicly display, or perform any content from our platform without our express written permission.</p>
        </section>
        
        <section>
          <h2>User Conduct</h2>
          <p>By using our platform, you agree not to:</p>
          <ul>
            <li>Use the service for any illegal purpose</li>
            <li>Upload or transmit malicious code or viruses</li>
            <li>Interfere with or disrupt the service or servers</li>
            <li>Impersonate any person or entity</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Share copyrighted material without permission</li>
          </ul>
        </section>
        
        <section>
          <h2>Accuracy of Information</h2>
          <p>While we strive to provide accurate and up-to-date information, we make no warranties about the completeness, reliability, or accuracy of our content. Educational materials are provided for learning purposes and should not be considered as official academic resources.</p>
        </section>
        
        <section>
          <h2>Limitation of Liability</h2>
          <p>SmartDriller shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform, including but not limited to loss of profits, data, or other intangible losses.</p>
        </section>
        
        <section>
          <h2>Termination</h2>
          <p>We reserve the right to terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these terms or is harmful to other users, us, or third parties, or for any other reason at our sole discretion.</p>
        </section>
        
        <section>
          <h2>Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting on the platform. Your continued use of the service after any changes constitutes acceptance of the new terms.</p>
        </section>
        
        <section>
          <h2>Contact Information</h2>
          <p>If you have any questions about these Terms & Conditions, please contact us at:</p>
          <p>Phone: +2348103414050</p>
        </section>
      </div>
    </div>
  );
};

export default TermsConditions;     