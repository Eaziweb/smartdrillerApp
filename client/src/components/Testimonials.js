import { useState, useEffect } from 'react';
import styles from '../styles/Testimonials.module.css';


const Testimonials = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const testimonials = [
    {
      name: "Adeoluwa Ezekiel",
      course: "MBBS",
      quote: "This platform completely changed the way I study! I used to struggle with past questions, but now everything is well-organized by topic and year. The explanations make it easy to understand. I feel way more confident before exams!"
    },
    {
      name: "Musa Kanike",
      course: "Computer Engineering",
      quote: "Bookmarking questions is such a smart feature. I love that I can save tough questions and return to them later. It helps me focus on what I don't know yet."
    },
    {
      name: "Ibrahim Mubaraq",
      course: "Medicine",
      quote: "Everything I need in one place. From past questions to materials, notes, and even YouTube videos—it's like having a digital study room. No more searching all over the internet."
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const showSlide = (slideIndex) => {
    setCurrentSlide(slideIndex);
  };

  return (
    <section className={styles.testimonials} id="testimonials">
      <div className="container">
                <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>What Students Say</h2>
          <p className={styles.sectionSubtitle}>Join other smart students already drilling smarter</p>
        </div>
        <div className={styles.testimonialsSlider}>
          <div className={styles.testimonialContainer}>
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className={`${styles.testimonialSlide} ${currentSlide === index ? styles.active : ''}`}
              >
                <div className={styles.testimonialContent}>
                  <div className={styles.testimonialAvatar}>
                    <i className="fas fa-user-graduate"></i>
                  </div>
                  <h4>{testimonial.name}</h4>
                  <span className={styles.testimonialCourse}>{testimonial.course}</span>
                  <blockquote>
                    {testimonial.quote}
                  </blockquote>
                  <div className={styles.rating}>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className={styles.testimonialDots}>
            {testimonials.map((_, index) => (
              <span 
                key={index}
                className={`${styles.dot} ${currentSlide === index ? styles.active : ''}`} 
                data-slide={index}
                onClick={() => showSlide(index)}
              ></span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;