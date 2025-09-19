"use client"
import { useState } from "react"
import { Link } from "react-router-dom"
import styles from "../styles/Resources.module.css"

const Resources = () => {
  const [activeFaq, setActiveFaq] = useState(null)

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index)
  }

  const faqItems = [
    {
      question: "How do I create an account on SmartDriller?",
      answer: "To create an account, click the 'Sign Up' button on the homepage, fill in your details such as name, email, and password, and follow the instructions to verify your email."
    },
    {
      question: "Is SmartDriller free to use?",
      answer: "SmartDriller offers both free and premium plans. The free plan gives access to a limited number of questions, while the premium plan unlocks full features, including all subjects, progress tracking, and personalized recommendations."
    },
    {
      question: "How often are study materials updated?",
      answer: "Study materials on SmartDriller are reviewed and updated every academic semester to reflect the most current syllabi and exam formats."
    },
    {
      question: "Can I request specific study materials?",
      answer: "Yes, you can request specific materials. Simply go to the 'Material' section on your dashboard and submit a request. Our content team will review and prioritize it accordingly."
    },
    {
      question: "How do I report an issue with the platform?",
      answer: "If you encounter any issues, please contact our support team via the 'Help & Support' link at the bottom of the page or email us at support@smartdriller.com."
    }
  ]

  const studyGuides = [
    {
      title: "100 Level Core Courses",
      description: "Comprehensive guides for all mandatory first-year courses across Nigerian universities."
    },
    {
      title: "CCMAS Curriculum",
      description: "Specialized materials for the new CCMAS curriculum structure at University of Ilorin."
    },
    {
      title: "Exam Preparation",
      description: "Proven strategies and practice materials to help you excel in your examinations."
    }
  ]

  const supportOptions = [
    {
      icon: "fas fa-envelope",
      title: "Email Support",
      description: "Send us an email and we'll respond within 24 hours.",
      link: "mailto:support@smartdriller.com",
      linkText: "Email Us"
    },
    {
      icon: "fas fa-phone-alt",
      title: "Phone Support",
      description: "Call us directly for immediate assistance with any issues.",
      link: "tel:+2348000000000",
      linkText: "Call Now"
    }
  ]

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(`resources-${sectionId}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleNavClick = (e, sectionId) => {
    e.preventDefault()
    scrollToSection(sectionId)
  }

  return (
    <div className={styles.resourcesPage}>
      <header>
        <div className={styles.resourcesContainer}>
          <nav>
            <Link to="/" className={styles.resourcesAppLogo}>SmartDriller</Link>
            <ul className={styles.resourcesNavLinks}>
              <li><a href="#help-center" onClick={(e) => handleNavClick(e, "help-center")}>Help Center</a></li>
              <li><a href="#faq" onClick={(e) => handleNavClick(e, "faq")}>FAQ</a></li>
              <li><a href="#study-guides" onClick={(e) => handleNavClick(e, "study-guides")}>Study Guides</a></li>
              <li><a href="#support" onClick={(e) => handleNavClick(e, "support")}>Support</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <section className={styles.resourcesHero} id="resources-home">
        <div className={styles.resourcesContainer}>
          <h1>SmartDriller Resources</h1>
          <p>Everything you need to succeed in your academic journey</p>
        </div>
      </section>

      <section className={styles.resourcesSection} id="resources-help-center">
        <div className={styles.resourcesContainer}>
          <h2 className={styles.resourcesSectionTitle}>Help Center</h2>
          <div className={styles.resourcesHelpCenter}>
            <h3>Welcome to the SmartDriller Help Center</h3>
            <p>Our Help Center is your one-stop resource for getting the most out of SmartDriller. Whether you're a new user or a long-time member, you'll find answers to your questions here.</p>
            <p>Browse our comprehensive guides, frequently asked questions, and study resources designed specifically for Nigerian university students.</p>
            <p>Can't find what you're looking for? Our support team is always ready to assist you.</p>
            <a href="#resources-support" className={styles.resourcesBtn}>Get Support</a>
          </div>
        </div>
      </section>

      <section className={`${styles.resourcesSection} ${styles.resourcesFaqSection}`} id="resources-faq">
        <div className={styles.resourcesContainer}>
          <h2 className={styles.resourcesSectionTitle}>Frequently Asked Questions</h2>
          <div className={styles.resourcesFaqContainer}>
            {faqItems.map((item, index) => (
              <div 
                key={index} 
                className={`${styles.resourcesFaqItem} ${activeFaq === index ? styles.active : ''}`}
                onClick={() => toggleFaq(index)}
              >
                <div className={styles.resourcesFaqQuestion}>
                  <span>{item.question}</span>
                  <i className="fas fa-chevron-down"></i>
                </div>
                <div className={styles.resourcesFaqAnswer}>
                  <p>{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.resourcesSection} id="resources-study-guides">
        <div className={styles.resourcesContainer}>
          <h2 className={styles.resourcesSectionTitle}>Study Guides</h2>
          <div className={styles.resourcesStudyGuides}>
            {studyGuides.map((guide, index) => (
              <div key={index} className={styles.resourcesGuideCard}>
                <div className={styles.resourcesGuideContent}>
                  <h3>{guide.title}</h3>
                  <p>{guide.description}</p>
                  <a href="#" className={styles.resourcesBtn}>View Guides</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.resourcesSection} ${styles.resourcesSupportSection}`} id="resources-support">
        <div className={styles.resourcesContainer}>
          <h2 className={styles.resourcesSectionTitle}>Support</h2>
          <div className={styles.resourcesSupportOptions}>
            {supportOptions.map((option, index) => (
              <div key={index} className={styles.resourcesOptionCard}>
                <i className={option.icon}></i>
                <h3>{option.title}</h3>
                <p>{option.description}</p>
                <a href={option.link} className={styles.resourcesBtn}>{option.linkText}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className={styles.resourcesContainer}>
          <div className={styles.resourcesFooterContent}>
            <div className={styles.resourcesAppLogo}>SmartDriller</div>
            <p>Empowering Nigerian students for academic excellence</p>
            <ul className={styles.resourcesSocialLinks}>
              <li><a href="#"><i className="fab fa-facebook-f"></i></a></li>
              <li><a href="#"><i className="fab fa-whatsapp"></i></a></li>
            </ul>
            <p>&copy; 2025 SmartDriller. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Resources