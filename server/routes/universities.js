// routes/universities.js
const express = require("express");
const axios = require("axios");
const University = require("../models/University");
const { adminAuth } = require("../middleware/auth");
const User = require("../models/User"); 
const router = express.Router();

// Fetch Nigerian universities from external API
router.get("/fetch-nigerian", async (req, res) => {
  try {
    // Fetch the full university list
    const response = await axios.get(
      "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json"
    );
    // Filter only Nigerian universities
    const universities = response.data
      .filter((uni) => uni.country === "Nigeria")
      .map((uni) => uni.name);
    // Save to database if not exists
    for (const name of universities) {
      const exists = await University.findOne({ name });
      if (!exists) {
        await University.create({ name });
      }
    }
    res.json({ success: true, universities });
  } catch (error) {
    console.error("Error fetching universities:", error.message);
    res.status(500).json({ message: "Failed to fetch universities" });
  }
});

// Get all universities
router.get("/", async (req, res) => {
  try {
    const universities = await University.find({});
    res.json({ success: true, universities });
  } catch (error) {
    console.error("Error getting universities:", error);
    res.status(500).json({ message: "Failed to get universities" });
  }
});

// Get university by ID - NEW ROUTE ADDED
router.get("/:id", async (req, res) => {
  try {
    const university = await University.findById(req.params.id);
    if (!university) {
      return res.status(404).json({ success: false, message: "University not found" });
    }
    res.json({ success: true, university });
  } catch (error) {
    console.error("Error getting university by ID:", error);
    res.status(500).json({ message: "Failed to get university" });
  }
});

// Add university manually (admin only)
router.post("/", adminAuth, async (req, res) => {
  try {
    const {
      name,
      monthlyPrice,
      semesterPrice,
      semesterActive,
      globalSubscriptionEnd,
    } = req.body;
    const university = new University({
      name,
      monthlyPrice,
      semesterPrice,
      semesterActive,
      globalSubscriptionEnd,
    });
    await university.save();
    res.json({ success: true, university });
  } catch (error) {
    console.error("Error adding university:", error);
    res.status(500).json({ message: "Failed to add university" });
  }
});


router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      monthlyPrice,
      semesterPrice,
      semesterActive,
      globalSubscriptionEnd,
    } = req.body;
    
    // Get the current university to compare dates
    const currentUniversity = await University.findById(id);
    if (!currentUniversity) {
      return res.status(404).json({ message: "University not found" });
    }
    
    // Check if globalSubscriptionEnd is being changed
    let isDateChanged = false;
    if (globalSubscriptionEnd) {
      const oldDate = new Date(currentUniversity.globalSubscriptionEnd);
      const newDate = new Date(globalSubscriptionEnd);
      
      // Compare dates (ignoring time)
      isDateChanged = 
        oldDate.getUTCFullYear() !== newDate.getUTCFullYear() ||
        oldDate.getUTCMonth() !== newDate.getUTCMonth() ||
        oldDate.getUTCDate() !== newDate.getUTCDate();
    }
    
    // Update the university
    const university = await University.findByIdAndUpdate(
      id,
      { monthlyPrice, semesterPrice, semesterActive, globalSubscriptionEnd },
      { new: true }
    );
    
    // If globalSubscriptionEnd was changed, update all semester-subscribed users
    if (isDateChanged) {
      const newEndDate = new Date(globalSubscriptionEnd);
      
      // Update all users with semester subscription for this university
      const updateResult = await User.updateMany(
        {
          university: id,
          subscriptionType: "semester",
          isSubscribed: true
        },
        {
          subscriptionExpiry: newEndDate,
          universitySubscriptionEnd: newEndDate
        }
      );
      
      console.log(`Updated ${updateResult.modifiedCount} users with new semester end date: ${newEndDate.toISOString()}`);
    }
    
    res.json({ success: true, university });
  } catch (error) {
    console.error("Error updating university:", error);
    res.status(500).json({ message: "Failed to update university" });
  }
});

module.exports = router;