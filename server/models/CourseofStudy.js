// In models/CourseofStudy.js, ensure the model is exported with the correct collection name
const mongoose = require("mongoose");

const courseofStudySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    required: true,
  },
}, {

});

module.exports = mongoose.model("CourseofStudy", courseofStudySchema);