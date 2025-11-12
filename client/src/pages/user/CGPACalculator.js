"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import styles from "../../styles/Notes.module.css"

const CGPACalculator = () => {
  // State for current CGPA and credits
  const [currentCGPA, setCurrentCGPA] = useState("")
  const [totalCreditsCompleted, setTotalCreditsCompleted] = useState("")
  
  // State for courses
  const [courses, setCourses] = useState([
    { id: 1, courseName: "", creditUnits: "", grade: "" }
  ])
  
  // State for calculated results
  const [semesterCredits, setSemesterCredits] = useState(0)
  const [semesterGPA, setSemesterGPA] = useState(0.00)
  const [totalCredits, setTotalCredits] = useState(0)
  const [newCGPA, setNewCGPA] = useState(0.00)
  
  // Grade options with values
  const gradeOptions = [
    { value: "A", label: "A (70-100)", points: 5 },
    { value: "B", label: "B (60-69)", points: 4 },
    { value: "C", label: "C (50-59)", points: 3 },
    { value: "D", label: "D (45-49)", points: 2 },
    { value: "E", label: "E (40-44)", points: 1 },
    { value: "F", label: "F (0-39)", points: 0 }
  ]

  // Function to add a new course row
  const addCourse = () => {
    setCourses([...courses, { id: Date.now(), courseName: "", creditUnits: "", grade: "" }])
  }

  // Function to remove a course row
  const removeCourse = (id) => {
    if (courses.length > 1) {
      setCourses(courses.filter(course => course.id !== id))
    }
  }

  // Function to handle input changes
  const handleInputChange = (id, field, value) => {
    setCourses(courses.map(course => 
      course.id === id ? { ...course, [field]: value } : course
    ))
  }

  // Function to calculate CGPA
  const calculateCGPA = () => {
    let totalPoints = 0
    let totalCredits = 0
    
    // Calculate semester points and credits
    courses.forEach(course => {
      if (course.creditUnits && course.grade) {
        const credits = parseFloat(course.creditUnits)
        const gradeObj = gradeOptions.find(g => g.value === course.grade)
        
        if (gradeObj) {
          totalPoints += credits * gradeObj.points
          totalCredits += credits
        }
      }
    })
    
    // Calculate semester GPA
    const semGPA = totalCredits > 0 ? totalPoints / totalCredits : 0
    setSemesterCredits(totalCredits)
    setSemesterGPA(parseFloat(semGPA.toFixed(2)))
    
    // Calculate new CGPA if current CGPA is provided
    if (currentCGPA && totalCreditsCompleted) {
      const currentCGPAValue = parseFloat(currentCGPA)
      const completedCredits = parseFloat(totalCreditsCompleted)
      
      if (!isNaN(currentCGPAValue) && !isNaN(completedCredits)) {
        const totalQualityPoints = (currentCGPAValue * completedCredits) + totalPoints
        const newTotalCredits = completedCredits + totalCredits
        const newCGPAValue = newTotalCredits > 0 ? totalQualityPoints / newTotalCredits : 0
        
        setTotalCredits(newTotalCredits)
        setNewCGPA(parseFloat(newCGPAValue.toFixed(2)))
        return
      }
    }
    
    // If current CGPA not provided, use semester values
    setTotalCredits(totalCredits)
    setNewCGPA(parseFloat(semGPA.toFixed(2)))
  }

  // Recalculate when inputs change
  useEffect(() => {
    calculateCGPA()
  }, [courses, currentCGPA, totalCreditsCompleted])

  return (
    <div className={styles.notesPage}>
      <header className={styles.notesHeader}>
        <div className={styles.headerContent}>
          <Link to="/home" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1>CGPA Calculator</h1>
        </div>
      </header>
      
      <div className={styles.progressSection}>
        <div className={styles.progressCard}>
          <div className={styles.progressInfo}>
            <div className={styles.progressStats}>
              <span className={styles.statNumber}>{newCGPA.toFixed(2)}</span>
              <span className={styles.statTotal}>/ 5.00</span>
            </div>
            <div className={styles.progressLabel}>New CGPA</div>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(newCGPA / 5) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className={styles.coursesContainer}>
        <div className={styles.courseItem}>
          <div className={styles.courseHeader}>
            <div className={styles.courseInfo}>
              <h3>Current Academic Standing</h3>
            </div>
          </div>
          <div className={styles.notesContainer}>
            <div className={styles.noteCard}>
              <div className={styles.noteContent}>
                <h4>Current CGPA (Optional)</h4>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.01"
                  placeholder="e.g., 3.12"
                  value={currentCGPA}
                  onChange={(e) => setCurrentCGPA(e.target.value)}
                  className={styles.messageInput}
                />
              </div>
            </div>
            <div className={styles.noteCard}>
              <div className={styles.noteContent}>
                <h4>Total Credits Completed (Optional)</h4>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g., 45"
                  value={totalCreditsCompleted}
                  onChange={(e) => setTotalCreditsCompleted(e.target.value)}
                  className={styles.messageInput}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.courseItem}>
          <div className={styles.courseHeader}>
            <div className={styles.courseInfo}>
              <h3>Semester Courses</h3>
            </div>
          </div>
          <div className={styles.notesContainer}>
            <div className={styles.noteCard}>
              <div className={styles.noteContent}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                  <h4>Course (Optional)</h4>
                  <h4>Credit Units *</h4>
                  <h4>Grade *</h4>
                  <div></div> {/* Empty header for actions column */}
                </div>
              </div>
            </div>
            
            {courses.map((course) => (
              <div key={course.id} className={styles.noteCard}>
                <div className={styles.noteContent}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="e.g., CIT101"
                      value={course.courseName}
                      onChange={(e) => handleInputChange(course.id, 'courseName', e.target.value)}
                      className={styles.messageInput}
                    />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      placeholder="e.g., 3"
                      value={course.creditUnits}
                      onChange={(e) => handleInputChange(course.id, 'creditUnits', e.target.value)}
                      className={styles.messageInput}
                      required
                    />
                    <select
                      value={course.grade}
                      onChange={(e) => handleInputChange(course.id, 'grade', e.target.value)}
                      className={styles.messageInput}
                      required
                    >
                      <option value="">Select Grade</option>
                      {gradeOptions.map((grade) => (
                        <option key={grade.value} value={grade.value}>
                          {grade.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeCourse(course.id)}
                      className={styles.clearBtn}
                      disabled={courses.length <= 1}
                      style={{ opacity: courses.length <= 1 ? 0.5 : 1 }}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className={styles.noteCard}>
              <div className={styles.noteContent}>
                <button
                  onClick={addCourse}
                  className={styles.sendBtn}
                  style={{ width: '100%', borderRadius: '8px', padding: '0.75rem' }}
                >
                  <i className="fas fa-plus"></i> Add Course
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.courseItem}>
          <div className={styles.courseHeader}>
            <div className={styles.courseInfo}>
              <h3>Calculation Results</h3>
            </div>
          </div>
          <div className={styles.notesContainer}>
            <div className={styles.noteCard}>
              <div className={styles.noteContent}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <h4>Semester Credits</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-light)' }}>
                      {semesterCredits}
                    </p>
                  </div>
                  <div>
                    <h4>Semester GPA</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-light)' }}>
                      {semesterGPA.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.noteCard}>
              <div className={styles.noteContent}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <h4>Total Credits</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-light)' }}>
                      {totalCredits}
                    </p>
                  </div>
                  <div>
                    <h4>New CGPA</h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-light)' }}>
                      {newCGPA.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CGPACalculator