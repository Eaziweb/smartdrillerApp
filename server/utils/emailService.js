const { Resend } = require('resend');

class EmailService {
  constructor() {
    // Initialize Resend with API key
    this.resend = new Resend(process.env.RESEND_API_KEY);

    // Email tracking - In production, use Redis or database
    this.emailCounter = {
      count: 0,
      resetTime: this.getNextResetTime()
    };

    // Resend limits: Free tier allows 100 emails per day
    // Using conservative limits to stay safe
    this.limits = {
      dailyLimit: 95,     // Conservative daily limit (100 - 5 buffer)
      resetHour: 24      // Reset every 24 hours
    };
    
    this.connectionStatus = true; // Resend is API-based, always "connected" unless API key is invalid
  }

  getNextResetTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  resetCounterIfNeeded() {
    const now = Date.now();
    
    if (now >= this.emailCounter.resetTime) {
      this.emailCounter = {
        count: 0,
        resetTime: this.getNextResetTime()
      };
      console.log("Reset email counter");
    }
  }

  canSendEmail() {
    this.resetCounterIfNeeded();
    
    const currentCount = this.emailCounter.count;
    
    return currentCount < this.limits.dailyLimit;
  }

  async sendEmail(mailOptions, retryCount = 0) {
    const maxRetries = 3;
    
    try {
      if (!this.canSendEmail()) {
        throw new Error('Email account has reached its daily sending limit');
      }
      
      // Prepare email options for Resend
      const resendOptions = {
        from: mailOptions.from || process.env.EMAIL_FROM || 'SmartDriller <noreply@smartdriller.com>',
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
      };

      // Add CC and BCC if provided
      if (mailOptions.cc) {
        resendOptions.cc = Array.isArray(mailOptions.cc) ? mailOptions.cc : [mailOptions.cc];
      }
      if (mailOptions.bcc) {
        resendOptions.bcc = Array.isArray(mailOptions.bcc) ? mailOptions.bcc : [mailOptions.bcc];
      }

      const result = await this.resend.emails.send(resendOptions);
      
      // Increment counter
      this.emailCounter.count++;
      
      console.log(`Email sent successfully using Resend. Count: ${this.emailCounter.count}/${this.limits.dailyLimit}`);
      
      return {
        success: true,
        messageId: result.data.id,
        remainingQuota: this.limits.dailyLimit - this.emailCounter.count
      };
    } catch (error) {
      console.error(`Email sending failed (attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
      
      // If we have retries left, try again
      if (retryCount < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendEmail(mailOptions, retryCount + 1);
      }
      
      // If all retries failed
      throw new Error(`Failed to send email after multiple attempts: ${error.message}`);
    }
  }

  // Get current status of email account
  getAccountStatus() {
    this.resetCounterIfNeeded();
    
    return {
      service: 'Resend',
      email: process.env.EMAIL_FROM || 'noreply@smartdriller.com',
      sent: this.emailCounter.count,
      remaining: this.limits.dailyLimit - this.emailCounter.count,
      resetTime: new Date(this.emailCounter.resetTime),
      canSend: this.canSendEmail(),
      connectionStatus: this.connectionStatus
    };
  }

  // Method to manually reset account (for testing or admin purposes)
  resetAccount() {
    this.emailCounter = {
      count: 0,
      resetTime: this.getNextResetTime()
    };
    console.log("Manually reset email account counter");
    return true;
  }

  // Test email connection (for Resend, this just validates API key)
  async testConnection() {
    try {
      // Send a test email to validate API key
      const testResult = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'SmartDriller <noreply@smartdriller.com>',
        to: 'test@example.com', // This will fail but validates API key
        subject: 'Connection Test',
        html: '<p>Test</p>'
      });
      
      // If we get here, the API key is valid (even if email fails)
      return {
        service: 'Resend',
        status: 'success',
        message: 'API key is valid'
      };
    } catch (error) {
      // Check if it's an API key error
      if (error.message.includes('API key')) {
        return {
          service: 'Resend',
          status: 'failed',
          message: 'Invalid API key',
          code: 'INVALID_API_KEY'
        };
      }
      
      // Other errors (like invalid email) still mean connection is valid
      return {
        service: 'Resend',
        status: 'success',
        message: 'API key is valid'
      };
    }
  }

  // Send a test email
  async sendTestEmail(toEmail) {
    try {
      const testMailOptions = {
        to: toEmail,
        subject: 'SmartDriller - Email Service Test',
        html: `
          <h2>Email Service Test</h2>
          <p>This is a test email to verify that the SmartDriller email service is working correctly.</p>
          <p>Test sent at: ${new Date().toISOString()}</p>
          <p>If you received this email, the service is functioning properly.</p>
        `
      };

      const result = await this.sendEmail(testMailOptions);
      
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      throw error;
    }
  }

  // Periodic connection health check
  startHealthCheck(interval = 300000) { // Default 5 minutes
    setInterval(async () => {
      console.log('Running email service health check...');
      await this.testConnection();
    }, interval);
  }
}

// Create singleton instance
const emailService = new EmailService();

// Start health check
emailService.startHealthCheck();

module.exports = emailService;