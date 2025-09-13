const CourseYear = require("../models/CourseYear");

// Helper function to create course year if it doesn't exist
const ensureCourseYearExists = async (course, year, userId) => {
  try {
    const existingCourseYear = await CourseYear.findOne({ course, year });
    if (!existingCourseYear) {
      const newCourseYear = new CourseYear({
        course,
        year,
        createdBy: userId,
      });
      await newCourseYear.save();
      return newCourseYear;
    }
    return existingCourseYear;
  } catch (error) {
    console.error("Error ensuring course year exists:", error);
    throw error;
  }
};

module.exports = { ensureCourseYearExists };