"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import styles from "../styles/LegalPolicies.module.css"

const LegalPolicies = () => {
  const [activeTab, setActiveTab] = useState("terms")
  const [showCookieBanner, setShowCookieBanner] = useState(false)

  useEffect(() => {
    // Check if user has accepted cookies
    const cookieConsent = localStorage.getItem("cookieConsent")
    if (!cookieConsent) {
      setShowCookieBanner(true)
    }
  }, [])

  const showPolicy = (policy) => {
    setActiveTab(policy)
    window.scrollTo(0, 0)
  }

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "true")
    setShowCookieBanner(false)
  }

  const cookieTable = [
    { name: "session_id", purpose: "Maintains your login session", duration: "Session" },
    { name: "user_preferences", purpose: "Stores your UI preferences (theme, layout)", duration: "30 days" },
    { name: "_ga", purpose: "Google Analytics - distinguishes users", duration: "2 years" },
    { name: "_gid", purpose: "Google Analytics - distinguishes users", duration: "24 hours" }
  ]

  return (
    <div className={styles.legalPage}>
      <header>
        <div className={styles.container}>
          <div className={styles.headerContent}>
            <Link to="/" className={styles.logo}>SmartDriller</Link>
            <div className={styles.navTabs}>
              <button 
                className={`${styles.tabButton} ${activeTab === "terms" ? styles.active : ""}`} 
                onClick={() => showPolicy("terms")}
              >
                Terms & Conditions
              </button>
              <button 
                className={`${styles.tabButton} ${activeTab === "privacy" ? styles.active : ""}`} 
                onClick={() => showPolicy("privacy")}
              >
                Privacy Policy
              </button>
              <button 
                className={`${styles.tabButton} ${activeTab === "cookie" ? styles.active : ""}`} 
                onClick={() => showPolicy("cookie")}
              >
                Cookie Policy
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        {/* Terms & Conditions */}
        <div id="terms-policy" className={`${styles.policyContainer} ${activeTab === "terms" ? "" : styles.hidden}`}>
          <h1>SmartDriller Terms and Conditions</h1>
          <p className={styles.lastUpdated}>Last Updated: 23rd July, 2025</p>
          <p>Welcome to <strong>SmartDriller</strong> ("the App/Website"), a past question/study application designed to help users prepare for exams. By accessing or using SmartDriller, you agree to comply with these Terms and Conditions ("Terms"). If you disagree, please refrain from using the App.</p>
          
          <h2>1. Acceptance of Terms</h2>
          <p>By using SmartDriller, you confirm that:</p>
          <ul>
            <li>You are at least <strong>13 years old</strong> (or the minimum age in your country to consent to data processing).</li>
            <li>You will not misuse the App for cheating, spamming, or illegal activities.</li>
          </ul>
          
          <h2>2. Account Registration</h2>
          <ul>
            <li>Users must register with their full name, email, university, course of study, and password.</li>
            <li>You must provide <strong>accurate information</strong> and keep credentials secure.</li>
            <li>SmartDriller reserves the right to <strong>suspend accounts</strong> violating these Terms.</li>
          </ul>
          
          <h2>3. User Responsibilities</h2>
          <p>You agree <strong>not</strong> to:</p>
          <ul>
            <li>Share copyrighted quiz/PQ content without permission.</li>
            <li>Upload copyrighted material (e.g., past questions from proprietary books).</li>
            <li>Use bots, scrapers, or automated tools to extract data.</li>
            <li>Harass other users or post harmful content.</li>
          </ul>
          
          <h2>4. Intellectual Property</h2>
          <ul>
            <li>SmartDriller owns all <strong>App content</strong> (logos, software, etc.).</li>
            <li>Users retain rights to their <strong>user-generated content</strong> but grant SmartDriller a license to host/distribute it.</li>
            <li>We collaborate with third parties like YouTube and AI bot providers - their content remains their property.</li>
          </ul>
          
          <h2>5. Payments & Refunds</h2>
          <ul>
            <li><strong>Billing</strong>: Subscription charged per semester; auto-renews unless canceled.</li>
            <li><strong>Refunds</strong>: No refunds after 7 days of payment (Nigeria's consumer laws apply).</li>
          </ul>
          
          <h2>6. AI & YouTube Disclaimer</h2>
          <ul>
            <li>AI responses are <strong>not 100% accurate</strong>; use at your discretion.</li>
            <li>YouTube content is owned by creators; SmartDriller is not liable for third-party videos.</li>
          </ul>
          
          <h2>7. Governing Law & Dispute Resolution</h2>
          <ul>
            <li>These Terms are governed by <strong>Nigerian law</strong>.</li>
            <li>Disputes will first be resolved via <strong>negotiation</strong>; unresolved issues will proceed in <strong>Nigeria's courts</strong>.</li>
          </ul>
          
          <div className={styles.contactInfo}>
            <h3>Contact Us</h3>
            <p>For copyright infringement claims or other inquiries:</p>
            <p>Email: <strong>support@smartdriller.com</strong></p>
          </div>
        </div>

        {/* Privacy Policy */}
        <div id="privacy-policy" className={`${styles.policyContainer} ${activeTab === "privacy" ? "" : styles.hidden}`}>
          <h1>SmartDriller Privacy Policy</h1>
          <p className={styles.lastUpdated}>Last Updated: 23rd July, 2025</p>
          
          <h2>1. Information We Collect</h2>
          <p>When you use SmartDriller, we collect:</p>
          <ul>
            <li><strong>Personal Data</strong>: Full name, email, university, course of study, and password (for account creation).</li>
            <li><strong>Usage Data</strong>: Quiz scores, progress, and interactions with AI bots/YouTube integrations.</li>
            <li><strong>Device Data</strong>: IP address, browser type, and OS (for analytics and security).</li>
          </ul>
          
          <h2>2. How We Use Your Data</h2>
          <ul>
            <li>To <strong>personalize</strong> your learning experience (e.g., recommend quizzes).</li>
            <li>To <strong>improve</strong> the App (e.g., fix bugs, add features).</li>
            <li>For <strong>security</strong> (e.g., preventing fraud).</li>
            <li><strong>If ads are added later</strong>: Data <em>may</em> be used for targeted advertising (you'll be notified).</li>
          </ul>
          
          <h2>3. Third-Party Sharing</h2>
          <p>We collaborate with:</p>
          <ul>
            <li><strong>YouTube</strong>: For embedded educational videos (subject to YouTube's Terms).</li>
            <li><strong>AI Bots</strong>: To provide automated tutoring (conversations may be logged for improvements).</li>
            <li><strong>No sale of personal data</strong> to advertisers or third parties.</li>
          </ul>
          
          <h2>4. Data Retention & Deletion</h2>
          <ul>
            <li>Your data is stored until you <strong>delete your account</strong> (via Settings or by emailing <strong>support@smartdriller.com</strong>).</li>
            <li>Anonymized data may be retained for analytics.</li>
          </ul>
          
          <h2>5. Security Measures</h2>
          <ul>
            <li>Encryption (SSL) for data transmission.</li>
            <li>Passwords are hashed; never stored in plain text.</li>
          </ul>
          
          <h2>6. Your Rights (Nigeria)</h2>
          <p>Under Nigeria's <strong>NDPA 2023</strong>, you can:</p>
          <ul>
            <li>Request access to or deletion of your data.</li>
            <li>Opt out of marketing emails.</li>
            <li>Withdraw consent (where applicable).</li>
          </ul>
          
          <h2>7. Children's Privacy</h2>
          <p>SmartDriller is <strong>not</strong> for users under 13. Parents/guardians may request data deletion for minors.</p>
          
          <h2>8. Updates to This Policy</h2>
          <p>Changes will be posted here. Continued use = acceptance.</p>
          
          <div className={styles.contactInfo}>
            <h3>Contact Us</h3>
            <p>For privacy-related inquiries:</p>
            <p>Email: <strong>support@smartdriller.com</strong></p>
          </div>
        </div>

        {/* Cookie Policy */}
        <div id="cookie-policy" className={`${styles.policyContainer} ${activeTab === "cookie" ? "" : styles.hidden}`}>
          <h1>SmartDriller Cookie Policy</h1>
          <p className={styles.lastUpdated}>Last Updated: 23rd July, 2025</p>
          <p>This Cookie Policy explains how SmartDriller ("we", "us", or "our") uses cookies and similar tracking technologies when you use our website or mobile application (collectively, the "Service").</p>
          
          <h2>1. What Are Cookies?</h2>
          <p>Cookies are small text files that are stored on your device when you visit a website. They help the website remember information about your visit, which can make it easier to visit the site again and make the site more useful to you.</p>
          
          <h2>2. How We Use Cookies</h2>
          <p>We use cookies for the following purposes:</p>
          <ul>
            <li><strong>Essential Cookies</strong>: Necessary for the website to function properly (e.g., login sessions).</li>
            <li><strong>Performance Cookies</strong>: Help us understand how visitors interact with our website by collecting anonymous information.</li>
            <li><strong>Functionality Cookies</strong>: Allow the website to remember choices you make (e.g., language preferences).</li>
            <li><strong>Analytics Cookies</strong>: Help us measure traffic and see traffic sources by collecting information about visitor counts.</li>
          </ul>
          
          <h2>3. Types of Cookies We Use</h2>
          <table className={styles.cookieTable}>
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {cookieTable.map((cookie, index) => (
                <tr key={index}>
                  <td>{cookie.name}</td>
                  <td>{cookie.purpose}</td>
                  <td>{cookie.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <h2>4. Third-Party Cookies</h2>
          <p>We may use services provided by third parties that set their own cookies, including:</p>
          <ul>
            <li><strong>Google Analytics</strong>: To analyze website traffic and usage patterns.</li>
            <li><strong>YouTube</strong>: When we embed YouTube videos, YouTube may set cookies to track viewing behavior.</li>
          </ul>
          
          <h2>5. Managing Cookies</h2>
          <p>You can control and/or delete cookies as you wish. You can delete all cookies that are already on your device and you can set most browsers to prevent them from being placed. However, if you do this, you may have to manually adjust some preferences every time you visit our site and some services and functionalities may not work.</p>
          
          <h3>Browser Controls:</h3>
          <p>Most browsers allow you to:</p>
          <ul>
            <li>See what cookies you've got and delete them on an individual basis</li>
            <li>Block third-party cookies</li>
            <li>Block cookies from particular sites</li>
            <li>Block all cookies from being set</li>
            <li>Delete all cookies when you close your browser</li>
          </ul>
          
          <h2>6. Changes to This Policy</h2>
          <p>We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie Policy on this page and updating the "Last Updated" date at the top.</p>
          
          <div className={styles.contactInfo}>
            <h3>Contact Us</h3>
            <p>If you have any questions about our use of cookies:</p>
            <p>Email: <strong>support@smartdriller.com</strong></p>
          </div>
        </div>
      </div>

      <footer>
            <p>&copy; {new Date().getFullYear()} SmartDriller. All Rights Reserved</p>
      </footer>

      {/* Cookie Consent Banner */}
      {showCookieBanner && (
        <div className={styles.cookieBanner}>
          <p>We use cookies to enhance your experience on our website. By continuing to browse, you agree to our use of cookies as described in our <a href="#" onClick={(e) => { e.preventDefault(); showPolicy("cookie") }}>Cookie Policy</a>.</p>
          <button onClick={acceptCookies}>Accept</button>
        </div>
      )}
    </div>
  )
}

export default LegalPolicies