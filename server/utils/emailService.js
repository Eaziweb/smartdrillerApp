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

    // Create transporters for both accounts
    this.transporters = this.emailConfigs.map(config => 
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
        tls: {
          // Do not fail on invalid certificates
          rejectUnauthorized: false
        }
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
    if (this.canSendEmail(0)) {
      return { transporter: this.transporters[0], index: 0, config: this.emailConfigs[0] };
    }
    
    // If primary is at limit, try secondary
    if (this.canSendEmail(1)) {
      return { transporter: this.transporters[1], index: 1, config: this.emailConfigs[1] };
    }
    
    // Both accounts at limit
    throw new Error('Both email accounts have reached their daily sending limit');
  }

  async sendEmail(mailOptions) {
    let lastError = null;
    
    // Try both email accounts if the first one fails
    for (let attempt = 0; attempt < this.emailConfigs.length; attempt++) {
      try {
        const { transporter, index, config } = this.getAvailableTransporter();
        
        // Verify the connection before sending
        await transporter.verify();
        
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
        lastError = error;
        console.error(`Email sending failed with ${this.emailConfigs[attempt]?.id} account:`, error.message);
        
        // If it's an authentication error, try the other account
        if (error.code === 'EAUTH' && attempt < this.emailConfigs.length - 1) {
          console.log('Authentication failed, trying next email account...');
          continue;
        }
        
        // If it's not an auth error or we've tried all accounts, throw the error
        throw error;
      }
    }
    
    throw lastError || new Error('All email accounts failed');
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
      canSend: this.canSendEmail(index)
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
        results.push({
          account: config.id,
          email: config.user,
          status: 'success',
          message: 'Connection verified successfully'
        });
        console.log(`✅ ${config.id} (${config.user}) - Connection successful`);
      } catch (error) {
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
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;