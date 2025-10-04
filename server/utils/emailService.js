// utils/emailService.js
const { Resend } = require('resend'); // Fixed import for CommonJS
const fs = require('fs');
const path = require('path');

// Initialize Resend clients from environment variables
const primaryClient = new Resend(process.env.RESEND_API_KEY_1);
const fallbackClient = new Resend(process.env.RESEND_API_KEY_2);

// Email usage tracking file
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

// Reset counts if a new day
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

  if (emailUsage.primary.count < THRESHOLD_COUNT) {
    return { client: primaryClient, account: 'primary' };
  }

  if (emailUsage.fallback.count < THRESHOLD_COUNT) {
    return { client: fallbackClient, account: 'fallback' };
  }

  return emailUsage.primary.count <= emailUsage.fallback.count
    ? { client: primaryClient, account: 'primary' }
    : { client: fallbackClient, account: 'fallback' };
}

// Main email sending function
async function sendEmail({ to, subject, html }) {
  const { client, account } = getAccountToUse();

  try {
    const { data, error } = await client.emails.send({
      from: 'SmartDriller <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    });

    if (error) throw new Error(error.message);

    emailUsage[account].count++;
    saveUsageData();

    return data;
  } catch (err) {
    // If account limit reached, try fallback
    if (err.message.includes('daily sending limit')) {
      const otherAccount = account === 'primary' ? 'fallback' : 'primary';
      const otherClient = account === 'primary' ? fallbackClient : primaryClient;

      try {
        const { data, error: fallbackError } = await otherClient.emails.send({
          from: 'SmartDriller <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
        });

        if (fallbackError) throw new Error(fallbackError.message);

        emailUsage[otherAccount].count++;
        saveUsageData();

        return data;
      } catch (fallbackErr) {
        throw new Error(`Both email accounts failed. Primary: ${err.message}. Fallback: ${fallbackErr.message}`);
      }
    }

    throw err;
  }
}

module.exports = { sendEmail };
