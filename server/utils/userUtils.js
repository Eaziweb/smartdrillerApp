const checkAndUpdateSubscription = async (user) => {
  const now = new Date();
  let updated = false;

  // Check if university subscription has ended
  if (user.universitySubscriptionEnd && now > user.universitySubscriptionEnd) {
    user.isSubscribed = false;
    updated = true;
  } 
  // Check if individual subscription has expired
  else if (user.subscriptionExpiry && now > user.subscriptionExpiry) {
    user.isSubscribed = false;
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