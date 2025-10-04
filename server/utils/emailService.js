// utils/emailService.js
const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    // Email account configuration
    this.config = {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      from: process.env.EMAIL_FROM || "SmartDriller",
      user: process.env.EMAIL_USER,
    };

    // Create transporter
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    // Initialize counter for daily limit (optional)
    this.emailCounter = 0;
    this.dailyLimit = 485; // conservative Gmail daily limit
    this.resetTime = this.getNextResetTime();

    // Verify connection
    this.initializeConnection();
  }

  async initializeConnection() {
    try {
      await this.transporter.verify();
      console.log(`✅ Email transporter for ${this.config.user} verified successfully`);
    } catch (error) {
      console.error(`❌ Failed to verify email transporter:`, error.message);
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
    if (Date.now() >= this.resetTime) {
      this.emailCounter = 0;
      this.resetTime = this.getNextResetTime();
      console.log(`Email counter reset`);
    }
  }

  canSendEmail() {
    this.resetCounterIfNeeded();
    return this.emailCounter < this.dailyLimit;
  }

  async sendEmail(mailOptions) {
    if (!this.canSendEmail()) {
      throw new Error("Email account has reached its daily sending limit");
    }

    const emailOptions = {
      ...mailOptions,
      from: `${this.config.from} <${this.config.user}>`,
    };

    const result = await this.transporter.sendMail(emailOptions);
    this.emailCounter++;
    console.log(`Email sent using ${this.config.user}. Count: ${this.emailCounter}/${this.dailyLimit}`);
    return result;
  }

  async sendTestEmail(toEmail) {
    return this.sendEmail({
      to: toEmail,
      subject: "SmartDriller - Test Email",
      html: `<p>This is a test email sent from SmartDriller.</p>`,
    });
  }

  getStatus() {
    this.resetCounterIfNeeded();
    return {
      email: this.config.user,
      sent: this.emailCounter,
      remaining: this.dailyLimit - this.emailCounter,
      resetTime: new Date(this.resetTime),
    };
  }
}

// Export singleton instance
module.exports = new EmailService();
