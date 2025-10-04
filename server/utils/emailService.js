// utils/emailService.js
const Resend = require('resend');
const fs = require('fs');
const path = require('path');

// Initialize Resend clients
const primaryClient = new Resend('re_ZGncPNjr_4Kn9ro97mpW26vkgAeYmzVXp');
const fallbackClient = new Resend('re_LBPDMrWV_3m3Hsa8nk31B5SLZGR3BB5V8');

// Email usage tracking
const usageLogFile = path.join(__dirname, 'email_usage.json');
let emailUsage = {
  primary: { count: 0, lastReset: new Date().toISOString() },
  fallback: { count: 0, lastReset: new Date().toISOString() }
};

// Load usage data if file exists
if (fs.existsSync(usageLogFile)) {
  try {
    const data = fs.readFileSync(usageLogFile, 'utf8');
    emailUsage = JSON.parse(data);
  } catch (err) {
    console.error('Error loading email usage data:', err);
  }
}

// Constants
const DAILY_LIMIT = 100; // Resend free tier daily limit
const THRESHOLD_PERCENT = 90; // Switch account at 90% of limit
const THRESHOLD_COUNT = Math.floor(DAILY_LIMIT * (THRESHOLD_PERCENT / 100));

// Helper function to reset counts if it's a new day
function resetCountsIfNeeded() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  for (const account in emailUsage) {
    const lastReset = new Date(emailUsage[account].lastReset);
    const lastResetDay = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());
    
    if (today > lastResetDay) {
      emailUsage[account].count = 0;
      emailUsage[account].lastReset = now.toISOString();
    }
  }
  
  saveUsageData();
}

// Save usage data to file
function saveUsageData() {
  try {
    fs.writeFileSync(usageLogFile, JSON.stringify(emailUsage, null, 2));
  } catch (err) {
    console.error('Error saving email usage data:', err);
  }
}

// Determine which account to use
function getAccountToUse() {
  resetCountsIfNeeded();
  
  // Use primary if below threshold
  if (emailUsage.primary.count < THRESHOLD_COUNT) {
    return { client: primaryClient, account: 'primary' };
  }
  
  // Use fallback if below threshold
  if (emailUsage.fallback.count < THRESHOLD_COUNT) {
    return { client: fallbackClient, account: 'fallback' };
  }
  
  // Both accounts at threshold - use the one with lower count
  return emailUsage.primary.count <= emailUsage.fallback.count 
    ? { client: primaryClient, account: 'primary' }
    : { client: fallbackClient, account: 'fallback' };
}

// Main email sending function
async function sendEmail(options) {
  const { client, account } = getAccountToUse();
  
  try {
    const { data, error } = await client.emails.send({
      from: 'onboarding@resend.dev',
      to: [options.to],
      subject: options.subject,
      html: options.html,
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Update usage count
    emailUsage[account].count++;
    saveUsageData();
    
    return data;
  } catch (error) {
    // Handle account limit error
    if (error.message.includes('email account has reached its daily sending limit')) {
      // Try the other account
      const otherAccount = account === 'primary' ? 'fallback' : 'primary';
      const otherClient = account === 'primary' ? fallbackClient : primaryClient;
      
      try {
        const { data, error: fallbackError } = await otherClient.emails.send({
          from: 'onboarding@resend.dev',
          to: [options.to],
          subject: options.subject,
          html: options.html,
        });
        
        if (fallbackError) {
          throw new Error(fallbackError.message);
        }
        
        // Update usage count for the other account
        emailUsage[otherAccount].count++;
        saveUsageData();
        
        return data;
      } catch (fallbackError) {
        // If both accounts fail, throw the original error
        throw new Error(`Both email accounts failed. Primary: ${error.message}. Fallback: ${fallbackError.message}`);
      }
    }
    
    throw error;
  }
}

module.exports = {
  sendEmail
};