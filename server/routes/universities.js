// routes/universities.js
const express = require("express");
const axios = require("axios");
const University = require("../models/University");
const User = require("../models/User"); 
const { adminAuth } = require("../middleware/auth");

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

// Update university settings (admin only)
router.put("/:id", adminAuth, async (req, res) => {
  const session = await User.startSession()
  session.startTransaction()

  try {
    const { id } = req.params
    const {
      monthlyPrice,
      semesterPrice,
      semesterActive,
      globalSubscriptionEnd,
      confirmPastDate, // Added confirmation flag for past dates
    } = req.body

    // Validate globalSubscriptionEnd
    if (!globalSubscriptionEnd) {
      await session.abortTransaction()
      return res.status(400).json({ message: "globalSubscriptionEnd is required" })
    }

    const newGlobalEndDate = new Date(globalSubscriptionEnd)
    if (isNaN(newGlobalEndDate.getTime())) {
      await session.abortTransaction()
      return res.status(400).json({ message: "Invalid date format for globalSubscriptionEnd" })
    }

    const now = new Date()

    if (newGlobalEndDate < now && !confirmPastDate) {
      await session.abortTransaction()
      return res.status(400).json({
        requiresConfirmation: true,
        message:
          "The date you selected has already passed. All users will be marked as unsubscribed. Do you want to continue?",
      })
    }

    const existingUniversity = await University.findById(id).session(session)
    if (!existingUniversity) {
      await session.abortTransaction()
      return res.status(404).json({ message: "University not found" })
    }

    const university = await University.findByIdAndUpdate(
      id,
      {
        monthlyPrice,
        semesterPrice,
        semesterActive,
        globalSubscriptionEnd: newGlobalEndDate,
      },
      { new: true, session },
    )

    await User.updateMany({ university: id }, { universitySubscriptionEnd: newGlobalEndDate }, { session })

    await User.updateMany(
      {
        university: id,
        subscriptionType: "semester",
      },
      { subscriptionExpiry: newGlobalEndDate },
      { session },
    )

    if (newGlobalEndDate < now) {
      await User.updateMany(
        { university: id },
        {
          isSubscribed: false,
          subscriptionExpiry: newGlobalEndDate,
        },
        { session },
      )
    } else {
      await User.updateMany(
        {
          university: id,
          subscriptionExpiry: { $gte: now },
        },
        { isSubscribed: true },
        { session },
      )
    }

    await session.commitTransaction()

    res.json({
      success: true,
      message: "University and all user subscriptions updated successfully",
      university,
      affectedUsers: await User.countDocuments({ university: id }),
    })
  } catch (error) {
    await session.abortTransaction()
    console.error("Error updating university:", error)
    res.status(500).json({ message: "Failed to update university" })
  } finally {
    session.endSession()
  }
})


router.post("/check-subscriptions", adminAuth, async (req, res) => {
  try {
    const universities = await University.find({ semesterActive: true });
    let updatedCount = 0;
    
    for (const university of universities) {
      await university.checkAndUpdateSemesterStatus();
      if (!university.semesterActive) {
        updatedCount++;
      }
    }
    
    res.json({ 
      success: true, 
      message: `Checked ${universities.length} universities. Updated ${updatedCount}.` 
    });
  } catch (error) {
    console.error("Error checking university subscriptions:", error);
    res.status(500).json({ message: "Failed to check university subscriptions" });
  }
});
module.exports = router;