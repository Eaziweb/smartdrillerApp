// routes/adminNotes.js
const express = require("express");
const router = express.Router();
const { adminAuth } = require("../middleware/auth");
const NoteCourse = require("../models/NoteCourse");
const Note = require("../models/Note");

// Get all courses with notes
router.get("/courses", adminAuth, async (req, res) => {
  try {
    const courses = await NoteCourse.find({ isVisible: true })
      .populate("notes")
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

// Create a new course
router.post("/courses", adminAuth, async (req, res) => {
  try {
    const { title, description } = req.body;
    const course = new NoteCourse({ title, description });
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ message: "Failed to create course" });
  }
});

// Update a course
router.put("/courses/:id", adminAuth, async (req, res) => {
  try {
    const { title, description } = req.body;
    const course = await NoteCourse.findByIdAndUpdate(
      req.params.id,
      { title, description },
      { new: true }
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Failed to update course" });
  }
});

// Delete a course
router.delete("/courses/:id", adminAuth, async (req, res) => {
  try {
    const course = await NoteCourse.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    
    // Delete all notes in this course
    await Note.deleteMany({ course: req.params.id });
    
    await NoteCourse.findByIdAndDelete(req.params.id);
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ message: "Failed to delete course" });
  }
});

// Create a new note
router.post("/courses/:courseId/notes", adminAuth, async (req, res) => {
  try {
    const { title, description, content } = req.body;
    const note = new Note({
      title,
      description,
      content,
      course: req.params.courseId,
    });
    await note.save();
    
    // Add note to course
    await NoteCourse.findByIdAndUpdate(req.params.courseId, {
      $push: { notes: note._id }
    });
    
    res.status(201).json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ message: "Failed to create note" });
  }
});

// Update a note
router.put("/notes/:id", adminAuth, async (req, res) => {
  try {
    const { title, description, content } = req.body;
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { title, description, content },
      { new: true }
    );
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    res.json(note);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ message: "Failed to update note" });
  }
});

// Delete a note
router.delete("/notes/:id", adminAuth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    
    // Remove note from course
    await NoteCourse.findByIdAndUpdate(note.course, {
      $pull: { notes: note._id }
    });
    
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ message: "Failed to delete note" });
  }
});

module.exports = router;