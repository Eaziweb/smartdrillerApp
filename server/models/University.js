const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    monthlyPrice: {
      type: Number,
      required: true,
      default: 2000, // NGN
    },
    semesterPrice: {
      type: Number,
      required: true,
      default: 6000, // NGN
    },
    semesterActive: {
      type: Boolean,
      default: false,
    },
    globalSubscriptionEnd: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
    },
  },
  {
    timestamps: true,
  }
);

// Method to check and update semester active status
universitySchema.methods.checkAndUpdateSemesterStatus = async function() {
  const now = new Date();
  // If the end date has passed, deactivate the semester plan
  if (this.globalSubscriptionEnd < now && this.semesterActive) {
    this.semesterActive = false;
    await this.save();
    return true; // Indicates that status was updated
  }
  return false; // Indicates no update was needed
};

// Static method to check all universities
universitySchema.statics.checkAllSemesterStatus = async function() {
  const universities = await this.find({ semesterActive: true });
  const updatedUniversities = [];
  
  for (const university of universities) {
    const wasUpdated = await university.checkAndUpdateSemesterStatus();
    if (wasUpdated) {
      updatedUniversities.push(university);
    }
  }
  
  return updatedUniversities;
};

module.exports = mongoose.model("University", universitySchema);