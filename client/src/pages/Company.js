"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import styles from "../styles/company.module.css"

const Company = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState("about")

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
    const element = document.getElementById(`about-${sectionId}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleNavClick = (e, sectionId) => {
    e.preventDefault()
    scrollToSection(sectionId)
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <header className={styles.header}>
          <div className={styles.container}>
            <nav>
              <Link to="/" className={styles.appLogo}>SmartDriller</Link>
              <ul className={styles.navLinks}>
                <li><a href="#about" onClick={(e) => handleNavClick(e, "about")}>About Us</a></li>
                <li><a href="#mission" onClick={(e) => handleNavClick(e, "mission")}>Our Mission</a></li>
                <li><a href="#blog" onClick={(e) => handleNavClick(e, "blog")}>Blog</a></li>
              </ul>
            </nav>
          </div>
        </header>
        
        <section className={styles.hero} id="about-about">
          <div className={styles.container}>
            <h1>Empowering Nigerian Students</h1>
            <p>SmartDriller was born from the challenges faced by university students to provide a comprehensive solution for academic excellence</p>
          </div>
        </section>
        
        <section className={styles.section} id="about-content">
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>About Us</h2>
            <div className={styles.content}>
              <p>SmartDriller is an educational platform developed by two innovative students who experienced firsthand the rigorous challenges of 100-level at the University of Ilorin. As the curriculum transitioned to CCMAS, we recognized the unique difficulties this change presented for students.</p>
              <p>Our journey through these academic challenges inspired us to create a solution that would help future students navigate this critical phase of their university education more smoothly.</p>
              <p>We understand the pressure, confusion, and need for reliable resources that students face, especially during their first year. SmartDriller is our commitment to making this transition easier and setting students up for long-term academic success.</p>
            </div>
          </div>
        </section>
        
        <section className={styles.section} id="about-mission">
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Our Mission</h2>
            <div className={styles.content}>
              <p>At SmartDriller, we are dedicated to transforming the academic experience for Nigerian university students. Our mission is threefold:</p>
              <p>First, to provide comprehensive, curriculum-aligned resources that help students master their coursework. Second, to offer practical strategies for navigating the unique challenges of university life. And third, to foster a community where students can support each other's academic growth.</p>
              <p>We believe every student deserves access to the tools and knowledge that will help them excel, regardless of their institution or field of study. By democratizing academic resources and support, we're working to level the playing field for students across Nigeria.</p>
              
              <div className={styles.values}>
                <div className={styles.valueCard}>
                  <i className="fas fa-lightbulb"></i>
                  <h3>Innovation</h3>
                  <p>We continuously develop creative solutions to academic challenges, staying ahead of curriculum changes and educational trends.</p>
                </div>
                <div className={styles.valueCard}>
                  <i className="fas fa-star"></i>
                  <h3>Excellence</h3>
                  <p>We maintain the highest standards in our content and services, ensuring students receive only the best academic support.</p>
                </div>
                <div className={styles.valueCard}>
                  <i className="fas fa-shield-alt"></i>
                  <h3>Integrity</h3>
                  <p>We operate with honesty and transparency, providing accurate information and maintaining student trust.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className={`${styles.section} ${styles.blogSection}`} id="about-blog">
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>From Our Blog</h2>
            <div className={styles.blogPosts}>
              <div className={styles.blogCard}>
                <div className={styles.blogContent}>
                  <h3>Navigating the CCMAS Curriculum</h3>
                  <p className={styles.blogMeta}>June 15, 2025</p>
                  <p>Practical tips for first-year students adapting to the new CCMAS curriculum structure and expectations...</p>
                  <a href="#" className={styles.readMore}>Read More <i className="fas fa-arrow-right"></i></a>
                </div>
              </div>
              <div className={styles.blogCard}>
                <div className={styles.blogContent}>
                  <h3>Time Management for University Success</h3>
                  <p className={styles.blogMeta}>May 28, 2025</p>
                  <p>Learn how to balance coursework, social life, and self-care during your crucial first year...</p>
                  <a href="#" className={styles.readMore}>Read More <i className="fas fa-arrow-right"></i></a>
                </div>
              </div>
              <div className={styles.blogCard}>
                <div className={styles.blogContent}>
                  <h3>Study Techniques That Actually Work</h3>
                  <p className={styles.blogMeta}>Sept 29, 2025</p>
                  <p>Evidence-based study methods to help you retain information better and perform excellently in exams...</p>
                  <a href="#" className={styles.readMore}>Read More <i className="fas fa-arrow-right"></i></a>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <footer className={styles.footer}>
          <div className={styles.container}>
            <div className={styles.footerContent}>
              <div className={styles.appLogo}>SmartDriller</div>
              <p>Empowering Nigerian students for academic excellence</p>
              <ul className={styles.socialLinks}>
                <li><a href="#"><i className="fab fa-facebook-f"></i></a></li>
                <li><a href="#"><i className="fab fa-whatsapp"></i></a></li>
              </ul>
                <p>&copy; {new Date().getFullYear()} SmartDriller. All Rights Reserved</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default Company