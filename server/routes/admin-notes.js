const express = require("express")
const router = express.Router()
const { adminAuth } = require("../middleware/auth")
const NoteCourse = require("../models/NoteCourse")
const Note = require("../models/Note")

// Get all courses with notes (for admin)
router.get("/courses", adminAuth, async (req, res) => {
  try {
    const courses = await NoteCourse.find()
      .populate({
        path: "notes",
        select: "title description createdAt",
      })
      .sort({ createdAt: 1 })

    res.json(courses)
  } catch (error) {
    console.error("Error fetching note courses:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create new course
router.post("/courses", adminAuth, async (req, res) => {
  try {
    const { title, description } = req.body

    const course = new NoteCourse({
      title,
      description,
    })

    await course.save()
    res.status(201).json(course)
  } catch (error) {
    console.error("Error creating note course:", error)
    res.status(500).json({ message: "Server error" })
  }
})
// Get single note by ID
router.get("/:noteId", adminAuth, async (req, res) => {
  try {
    const { noteId } = req.params
    const note = await Note.findById(noteId)
    if (!note) {
      return res.status(404).json({ message: "Note not found" })
    }
    res.json(note)
  } catch (error) {
    console.error("Error fetching note:", error)
    res.status(500).json({ message: "Server error" })
  }
})
// Update course
router.put("/courses/:courseId", adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params
    const { title, description } = req.body

    const course = await NoteCourse.findByIdAndUpdate(courseId, { title, description }, { new: true })

    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    res.json(course)
  } catch (error) {
    console.error("Error updating note course:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete course
router.delete("/courses/:courseId", adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params

    // Delete all notes in this course
    await Note.deleteMany({ course: courseId })

    // Delete the course
    await NoteCourse.findByIdAndDelete(courseId)

    res.json({ message: "Course deleted successfully" })
  } catch (error) {
    console.error("Error deleting note course:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create new note
router.post("/courses/:courseId/notes", adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params
    const { title, description, content } = req.body

    const note = new Note({
      title,
      description,
      content,
      course: courseId,
    })

    await note.save()

    // Add note to course
    await NoteCourse.findByIdAndUpdate(courseId, { $push: { notes: note._id } })

    res.status(201).json(note)
  } catch (error) {
    console.error("Error creating note:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update note
router.put("/:noteId", adminAuth, async (req, res) => {
  try {
    const { noteId } = req.params
    const { title, description, content } = req.body

    const note = await Note.findByIdAndUpdate(noteId, { title, description, content }, { new: true })

    if (!note) {
      return res.status(404).json({ message: "Note not found" })
    }

    res.json(note)
  } catch (error) {
    console.error("Error updating note:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete note
router.delete("/:noteId", adminAuth, async (req, res) => {
  try {
    const { noteId } = req.params

    const note = await Note.findById(noteId)
    if (!note) {
      return res.status(404).json({ message: "Note not found" })
    }

    // Remove note from course
    await NoteCourse.findByIdAndUpdate(note.course, { $pull: { notes: noteId } })

    // Delete the note
    await Note.findByIdAndDelete(noteId)

    res.json({ message: "Note deleted successfully" })
  } catch (error) {
    console.error("Error deleting note:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
