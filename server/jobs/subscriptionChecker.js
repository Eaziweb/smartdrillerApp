const User = require("../models/User");
const { checkAndUpdateSubscription } = require("../utils/userUtils");

// This function can be run daily via a cron job
const checkAllSubscriptions = async () => {
  try {
    console.log("Running subscription check for all users...");
    
    const users = await User.find({});
    let updatedCount = 0;
    
    for (const user of users) {
      const wasSubscribed = user.isSubscribed;
      await checkAndUpdateSubscription(user);
      
      if (wasSubscribed && !user.isSubscribed) {
        updatedCount++;
        console.log(`User ${user.email} subscription expired`);
      }
    }
    
    console.log(`Subscription check complete. Updated ${updatedCount} users.`);
  } catch (error) {
    console.error("Error in subscription check job:", error);
  }
};

module.exports = { checkAllSubscriptions };