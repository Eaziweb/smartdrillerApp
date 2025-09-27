"use client";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import styles from "../../styles/NoteManagement.module.css";
const NoteManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [courseForm, setCourseForm] = useState({ title: "", description: "" });
  const [noteForm, setNoteForm] = useState({
    title: "",
    description: "",
    content: "",
  });
  // Get authorization token
  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  useEffect(() => {
    loadCourses();
  }, []);
  const loadCourses = async () => {
    try {
      const response = await axios.get("/api/admin/notes/courses", {
        headers: getAuthHeader(),
      });
      setCourses(response.data);
    } catch (error) {
      console.error("Failed to load courses:", error);
      showToast("Failed to load courses", "error");
    } finally {
      setLoading(false);
    }
  };
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(
          `/api/admin/notes/courses/${editingItem._id}`,
          courseForm,
          {
            headers: getAuthHeader(),
          }
        );
      } else {
        await axios.post("/api/admin/notes/courses", courseForm, {
          headers: getAuthHeader(),
        });
      }
      setCourseForm({ title: "", description: "" });
      setShowCourseModal(false);
      setEditingItem(null);
      loadCourses();
      showToast(
        editingItem
          ? "Course updated successfully!"
          : "Course created successfully!"
      );
    } catch (error) {
      console.error("Failed to save course:", error);
      showToast(
        error.response?.data?.message || "Failed to save course",
        "error"
      );
    }
  };
  const handleCreateNote = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`/api/admin/notes/${editingItem._id}`, noteForm, {
          headers: getAuthHeader(),
        });
      } else {
        await axios.post(
          `/api/admin/notes/courses/${selectedCourse._id}/notes`,
          noteForm,
          {
            headers: getAuthHeader(),
          }
        );
      }
      setNoteForm({ title: "", description: "", content: "" });
      setShowNoteModal(false);
      setEditingItem(null);
      loadCourses();
      showToast(
        editingItem
          ? "Note updated successfully!"
          : "Note created successfully!"
      );
    } catch (error) {
      console.error("Failed to save note:", error);
      showToast(
        error.response?.data?.message || "Failed to save note",
        "error"
      );
    }
  };
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      await axios.delete(`/api/admin/notes/${noteId}`, {
        headers: getAuthHeader(),
      });
      loadCourses();
      showToast("Note deleted successfully!");
    } catch (error) {
      console.error("Failed to delete note:", error);
      showToast(
        error.response?.data?.message || "Failed to delete note",
        "error"
      );
    }
  };
  const handleDeleteCourse = async (courseId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this course and all its notes?"
      )
    )
      return;
    try {
      await axios.delete(`/api/admin/notes/courses/${courseId}`, {
        headers: getAuthHeader(),
      });
      loadCourses();
      showToast("Course deleted successfully!");
    } catch (error) {
      console.error("Failed to delete course:", error);
      showToast(
        error.response?.data?.message || "Failed to delete course",
        "error"
      );
    }
  };
  const openEditCourse = (course) => {
    setEditingItem(course);
    setCourseForm({ title: course.title, description: course.description });
    setShowCourseModal(true);
  };
  const openEditNote = (note) => {
    setEditingItem(note);
    setNoteForm({
      title: note.title,
      description: note.description,
      content: note.content,
    });
    setShowNoteModal(true);
  };
  const formatText = (type) => {
    const textarea = document.getElementById("noteContent");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let formattedText = "";
    switch (type) {
      case "bold":
        formattedText = `<strong>${selectedText}</strong>`;
        break;
      case "italic":
        formattedText = `<em>${selectedText}</em>`;
        break;
      case "underline":
        formattedText = `<u>${selectedText}</u>`;
        break;
      case "quote":
        formattedText = `<blockquote>${selectedText}</blockquote>`;
        break;
      case "h1":
        formattedText = `<h1>${selectedText}</h1>`;
        break;
      case "h2":
        formattedText = `<h2>${selectedText}</h2>`;
        break;
      case "h3":
        formattedText = `<h3>${selectedText}</h3>`;
        break;
      case "ul":
        formattedText = `<ul><li>${selectedText}</li></ul>`;
        break;
      case "ol":
        formattedText = `<ol><li>${selectedText}</li></ol>`;
        break;
      default:
        return;
    }
    const newContent =
      textarea.value.substring(0, start) +
      formattedText +
      textarea.value.substring(end);
    setNoteForm({ ...noteForm, content: newContent });
  };
  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `${styles.toast} ${
      styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`]
    }`;
    toast.innerHTML = `
<i class="fas ${
      type === "success" ? "fa-check-circle" : "fa-exclamation-triangle"
    }"></i>
<span>${message}</span>
`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };
  if (loading) {
    return (
      <div className={styles.noteManagement}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.noteManagement}>
      <header className={styles.managementHeader}>
        <div className={styles.headerContent}>
          <Link to="/admin/dashboard" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1>Note Management</h1>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setShowCourseModal(true)}
          >
            <i className="fas fa-plus"></i>
            Add Course
          </button>
        </div>
      </header>

      <div className={styles.managementContent}>
        {courses.map((course) => (
          <div key={course._id} className={styles.courseSection}>
            <div className={styles.courseHeader}>
              <div className={styles.courseInfo}>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <span className={styles.itemCount}>
                  {course.notes?.length || 0} notes
                </span>
              </div>
              <div className={styles.courseActions}>
                <button
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnSecondary}`}
                  onClick={() => {
                    setSelectedCourse(course);
                    setShowNoteModal(true);
                  }}
                >
                  <i className="fas fa-plus"></i>
                  Add Note
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnOutline}`}
                  onClick={() => openEditCourse(course)}
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                  onClick={() => handleDeleteCourse(course._id)}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>

            {course.notes && course.notes.length > 0 && (
              <div className={styles.notesGrid}>
                {course.notes.map((note) => (
                  <div key={note._id} className={styles.noteItem}>
                    <div className={styles.noteContent}>
                      <h4>{note.title}</h4>
                      <p>{note.description}</p>
                      <div className={styles.noteMeta}>
                        <span className={styles.noteDate}>
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className={styles.noteActions}>
                      <button
                        className={`${styles.btn} ${styles.btnSm} ${styles.btnOutline}`}
                        onClick={() => openEditNote(note)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                        onClick={() => handleDeleteNote(note._id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <div className={styles.modal}>
          <div
            className={styles.modalBackdrop}
            onClick={() => {
              setShowCourseModal(false);
              setEditingItem(null);
              setCourseForm({ title: "", description: "" });
            }}
          ></div>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingItem ? "Edit Course" : "Add New Course"}</h3>
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowCourseModal(false);
                  setEditingItem(null);
                  setCourseForm({ title: "", description: "" });
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Course Title</label>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      description: e.target.value,
                    })
                  }
                  rows="3"
                />
              </div>
              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                >
                  {editingItem ? "Update Course" : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className={`${styles.modal} ${styles.modalLarge}`}>
          <div
            className={styles.modalBackdrop}
            onClick={() => {
              setShowNoteModal(false);
              setEditingItem(null);
              setNoteForm({ title: "", description: "", content: "" });
            }}
          ></div>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingItem ? "Edit Note" : "Add New Note"}</h3>
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setShowNoteModal(false);
                  setEditingItem(null);
                  setNoteForm({ title: "", description: "", content: "" });
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateNote} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Note Title</label>
                <input
                  type="text"
                  value={noteForm.title}
                  onChange={(e) =>
                    setNoteForm({ ...noteForm, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={noteForm.description}
                  onChange={(e) =>
                    setNoteForm({ ...noteForm, description: e.target.value })
                  }
                  rows="2"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Content</label>
                <div className={styles.editorToolbar}>
                  <button
                    type="button"
                    onClick={() => formatText("bold")}
                    title="Bold"
                  >
                    <i className="fas fa-bold"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText("italic")}
                    title="Italic"
                  >
                    <i className="fas fa-italic"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText("underline")}
                    title="Underline"
                  >
                    <i className="fas fa-underline"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText("quote")}
                    title="Quote"
                  >
                    <i className="fas fa-quote-left"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText("h1")}
                    title="Heading 1"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText("h2")}
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText("h3")}
                    title="Heading 3"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText("ul")}
                    title="Bullet List"
                  >
                    <i className="fas fa-list-ul"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText("ol")}
                    title="Numbered List"
                  >
                    <i className="fas fa-list-ol"></i>
                  </button>
                </div>
                <textarea
                  id="noteContent"
                  value={noteForm.content}
                  onChange={(e) =>
                    setNoteForm({ ...noteForm, content: e.target.value })
                  }
                  rows="15"
                  placeholder="Write your note content here. You can use HTML tags for formatting."
                />
              </div>
              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                >
                  {editingItem ? "Update Note" : "Create Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default NoteManagement;
