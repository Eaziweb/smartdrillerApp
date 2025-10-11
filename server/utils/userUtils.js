const checkAndUpdateSubscription = async (user) => {
  const now = new Date();
  let updated = false;

  // Check if university subscription has ended
  if (user.universitySubscriptionEnd && now > user.universitySubscriptionEnd) {
    user.isSubscribed = false;
    user.subscriptionExpiry = null;
    user.universitySubscriptionEnd = null;
    // For semester plans, revert back to monthly plan
    if (user.subscriptionType === "semester") {
      user.subscriptionType = "monthly";
    }
    updated = true;
  } 
  // Check if individual subscription has expired
  else if (user.subscriptionExpiry && now > user.subscriptionExpiry) {
    user.isSubscribed = false;
    user.subscriptionExpiry = null;
    // For semester plans, revert back to monthly plan
    if (user.subscriptionType === "semester") {
      user.subscriptionType = "monthly";
    }
    updated = true;
  }

  // Save changes if subscription status was updated
  if (updated) {
    await user.save();
  }

  return user;
};

module.exports = {
  checkAndUpdateSubscription
};