// utils/emailService.js
const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    // Email account configurations
    this.emailConfigs = [
      {
        id: 'primary',
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // Use TLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        from: process.env.EMAIL_FROM || 'SmartDriller',
        user: process.env.EMAIL_USER,
      },
      {
        id: 'secondary',
        host: process.env.EMAIL_HOST2 || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT2) || 587,
        secure: false, // Use TLS
        auth: {
          user: process.env.EMAIL_USER2,
          pass: process.env.EMAIL_PASS2,
        },
        from: process.env.EMAIL_FROM || 'SmartDriller',
        user: process.env.EMAIL_USER2,
      }
    ];

    // Create transporters for both accounts with improved configuration
    this.transporters = this.emailConfigs.map(config => 
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
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
      })
    );

    // Email tracking - In production, use Redis or database
    this.emailCounters = {
      primary: { count: 0, resetTime: this.getNextResetTime() },
      secondary: { count: 0, resetTime: this.getNextResetTime() }
    };

    // Gmail limits: 500 emails per day, 100 per hour for free accounts
    // Using conservative limits to stay safe
    this.limits = {
      dailyLimit: 485,    // Conservative daily limit
      hourlyLimit: 98,    // Conservative hourly limit
      resetHour: 24       // Reset every 24 hours
    };

    this.currentTransporterIndex = 0;
    this.connectionStatus = {
      primary: false,
      secondary: false
    };
    
    // Initialize connection status
    this.initializeConnections();
  }

  async initializeConnections() {
    // Check initial connection status for both accounts
    for (let i = 0; i < this.emailConfigs.length; i++) {
      try {
        await this.transporters[i].verify();
        this.connectionStatus[this.emailConfigs[i].id] = true;
        console.log(`✅ Initial connection to ${this.emailConfigs[i].id} account successful`);
      } catch (error) {
        this.connectionStatus[this.emailConfigs[i].id] = false;
        console.error(`❌ Initial connection to ${this.emailConfigs[i].id} account failed:`, error.message);
      }
    }
  }

  getNextResetTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  resetCountersIfNeeded() {
    const now = Date.now();
    
    Object.keys(this.emailCounters).forEach(accountId => {
      if (now >= this.emailCounters[accountId].resetTime) {
        this.emailCounters[accountId] = {
          count: 0,
          resetTime: this.getNextResetTime()
        };
        console.log(`Reset email counter for ${accountId} account`);
      }
    });
  }

  canSendEmail(accountIndex) {
    this.resetCountersIfNeeded();
    
    const accountId = this.emailConfigs[accountIndex].id;
    const currentCount = this.emailCounters[accountId].count;
    
    return currentCount < this.limits.dailyLimit;
  }

  getAvailableTransporter() {
    // Check primary transporter first
    if (this.canSendEmail(0) && this.connectionStatus.primary) {
      return { transporter: this.transporters[0], index: 0, config: this.emailConfigs[0] };
    }
    
    // If primary is at limit or offline, try secondary
    if (this.canSendEmail(1) && this.connectionStatus.secondary) {
      return { transporter: this.transporters[1], index: 1, config: this.emailConfigs[1] };
    }
    
    // Both accounts at limit or offline
    throw new Error('Both email accounts have reached their daily sending limit or are unavailable');
  }

  async sendEmail(mailOptions, retryCount = 0) {
    const maxRetries = 3;
    
    try {
      const { transporter, index, config } = this.getAvailableTransporter();
      
      // Set the from address to the current account
      const emailOptions = {
        ...mailOptions,
        from: `${config.from} <${config.user}>`
      };

      const result = await transporter.sendMail(emailOptions);
      
      // Increment counter for the used account
      const accountId = config.id;
      this.emailCounters[accountId].count++;
      
      console.log(`Email sent successfully using ${accountId} account. Count: ${this.emailCounters[accountId].count}/${this.limits.dailyLimit}`);
      
      return {
        success: true,
        messageId: result.messageId,
        accountUsed: accountId,
        remainingQuota: this.limits.dailyLimit - this.emailCounters[accountId].count
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
      
      // If all retries failed, try the other account if available
      try {
        const otherIndex = this.currentTransporterIndex === 0 ? 1 : 0;
        const otherAccountId = this.emailConfigs[otherIndex].id;
        
        if (this.canSendEmail(otherIndex) && this.connectionStatus[otherAccountId]) {
          console.log(`Trying with ${otherAccountId} account...`);
          
          const otherTransporter = this.transporters[otherIndex];
          const otherConfig = this.emailConfigs[otherIndex];
          
          const emailOptions = {
            ...mailOptions,
            from: `${otherConfig.from} <${otherConfig.user}>`
          };
          
          const result = await otherTransporter.sendMail(emailOptions);
          
          // Increment counter for the used account
          this.emailCounters[otherAccountId].count++;
          
          console.log(`Email sent successfully using ${otherAccountId} account after retry. Count: ${this.emailCounters[otherAccountId].count}/${this.limits.dailyLimit}`);
          
          return {
            success: true,
            messageId: result.messageId,
            accountUsed: otherAccountId,
            remainingQuota: this.limits.dailyLimit - this.emailCounters[otherAccountId].count
          };
        }
      } catch (otherError) {
        console.error(`Fallback to other account also failed:`, otherError.message);
      }
      
      // If we get here, all attempts failed
      throw new Error(`Failed to send email after multiple attempts: ${error.message}`);
    }
  }

  // Get current status of both email accounts
  getAccountsStatus() {
    this.resetCountersIfNeeded();
    
    return this.emailConfigs.map((config, index) => ({
      id: config.id,
      email: config.user,
      sent: this.emailCounters[config.id].count,
      remaining: this.limits.dailyLimit - this.emailCounters[config.id].count,
      resetTime: new Date(this.emailCounters[config.id].resetTime),
      canSend: this.canSendEmail(index),
      connectionStatus: this.connectionStatus[config.id]
    }));
  }

  // Method to manually reset a specific account (for testing or admin purposes)
  resetAccount(accountId) {
    if (this.emailCounters[accountId]) {
      this.emailCounters[accountId] = {
        count: 0,
        resetTime: this.getNextResetTime()
      };
      console.log(`Manually reset ${accountId} account counter`);
      return true;
    }
    return false;
  }

  // Test email connections
  async testConnections() {
    const results = [];
    
    for (let i = 0; i < this.emailConfigs.length; i++) {
      const config = this.emailConfigs[i];
      const transporter = this.transporters[i];
      
      try {
        await transporter.verify();
        this.connectionStatus[config.id] = true;
        results.push({
          account: config.id,
          email: config.user,
          status: 'success',
          message: 'Connection verified successfully'
        });
        console.log(`✅ ${config.id} (${config.user}) - Connection successful`);
      } catch (error) {
        this.connectionStatus[config.id] = false;
        results.push({
          account: config.id,
          email: config.user,
          status: 'failed',
          message: error.message,
          code: error.code
        });
        console.error(`❌ ${config.id} (${config.user}) - Connection failed:`, error.message);
      }
    }
    
    return results;
  }

  // Send a test email
  async sendTestEmail(toEmail, accountId = null) {
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

      if (accountId) {
        // Test specific account
        const configIndex = this.emailConfigs.findIndex(config => config.id === accountId);
        if (configIndex === -1) {
          throw new Error(`Account ${accountId} not found`);
        }
        
        const config = this.emailConfigs[configIndex];
        const transporter = this.transporters[configIndex];
        
        await transporter.verify();
        const result = await transporter.sendMail({
          ...testMailOptions,
          from: `${config.from} <${config.user}>`
        });
        
        return {
          success: true,
          accountUsed: accountId,
          messageId: result.messageId
        };
      } else {
        // Use regular sendEmail method
        return await this.sendEmail(testMailOptions);
      }
    } catch (error) {
      throw error;
    }
  }

  // Periodic connection health check
  startHealthCheck(interval = 300000) { // Default 5 minutes
    setInterval(async () => {
      console.log('Running email service health check...');
      await this.testConnections();
    }, interval);
  }
}

// Create singleton instance
const emailService = new EmailService();

// Start health check
emailService.startHealthCheck();

module.exports = emailService;