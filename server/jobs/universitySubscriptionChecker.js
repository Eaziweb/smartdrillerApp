const University = require("../models/University");
const User = require("../models/User");

// This function can be run daily via a cron job
const checkUniversitySubscriptions = async () => {
  try {
    console.log("Running university subscription check...");
    
    const universities = await University.find({ semesterActive: true });
    let updatedCount = 0;
    
    for (const university of universities) {
      const now = new Date();
      const endDate = new Date(university.globalSubscriptionEnd);
      
      // Check if subscription end date has passed
      if (endDate < now) {
        university.semesterActive = false;
        await university.save();
        updatedCount++;
        console.log(`University ${university.name} semester plan deactivated`);
      }
    }
    
    console.log(`University subscription check complete. Updated ${updatedCount} universities.`);
  } catch (error) {
    console.error("Error in university subscription check job:", error);
  }
};

module.exports = { checkUniversitySubscriptions };