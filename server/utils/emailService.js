const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    // Single email account configuration
    this.emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      from: process.env.EMAIL_FROM || 'SmartDriller',
    };

    // Create transporter with improved configuration
    this.transporter = nodemailer.createTransport({
      host: this.emailConfig.host,
      port: this.emailConfig.port,
      secure: this.emailConfig.secure,
      auth: this.emailConfig.auth,
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,    // 10 seconds
      socketTimeout: 10000,      // 10 seconds
      pool: true,                // Use connection pooling
      maxConnections: 5,         // Max connections in pool
      maxMessages: 100,          // Max messages per connection
      rateDelta: 1000,           // Rate limiting time window in ms
      rateLimit: 5               // Max messages per rateDelta
    });

    // Email tracking - In production, use Redis or database
    this.emailCounter = {
      count: 0,
      resetTime: this.getNextResetTime()
    };

    // Gmail limits: 500 emails per day, 100 per hour for free accounts
    // Using conservative limits to stay safe
    this.limits = {
      dailyLimit: 485,    // Conservative daily limit
      hourlyLimit: 98,    // Conservative hourly limit
      resetHour: 24       // Reset every 24 hours
    };
    
    this.connectionStatus = false;
    
    // Initialize connection status
    this.initializeConnection();
  }

  async initializeConnection() {
    // Check initial connection status
    try {
      await this.transporter.verify();
      this.connectionStatus = true;
      console.log("✅ Initial connection to email account successful");
    } catch (error) {
      this.connectionStatus = false;
      console.error("❌ Initial connection to email account failed:", error.message);
    }
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
      
      if (!this.connectionStatus) {
        // Try to reconnect
        try {
          await this.transporter.verify();
          this.connectionStatus = true;
          console.log("✅ Reconnected to email account successfully");
        } catch (error) {
          this.connectionStatus = false;
          console.error("❌ Failed to reconnect to email account:", error.message);
          throw new Error('Email account is currently unavailable');
        }
      }
      
      // Set the from address
      const emailOptions = {
        ...mailOptions,
        from: `${this.emailConfig.from} <${this.emailConfig.auth.user}>`
      };

      const result = await this.transporter.sendMail(emailOptions);
      
      // Increment counter
      this.emailCounter.count++;
      
      console.log(`Email sent successfully. Count: ${this.emailCounter.count}/${this.limits.dailyLimit}`);
      
      return {
        success: true,
        messageId: result.messageId,
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
      email: this.emailConfig.auth.user,
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

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify();
      this.connectionStatus = true;
      return {
        email: this.emailConfig.auth.user,
        status: 'success',
        message: 'Connection verified successfully'
      };
    } catch (error) {
      this.connectionStatus = false;
      return {
        email: this.emailConfig.auth.user,
        status: 'failed',
        message: error.message,
        code: error.code
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