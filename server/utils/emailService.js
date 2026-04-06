// utils/emailService.js
const nodemailer = require("nodemailer");

// Create transporter for Gmail SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not your regular Gmail password)
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2",
  },
});

// Verify connection on startup
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Failed to verify email transporter:", err.message);
  } else {
    console.log("✅ Gmail SMTP transporter verified successfully");
  }
});

// HTML email templates
const templates = {
  verifyEmail: (code) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #0066ff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">SmartDriller</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p style="color: #555;">Welcome to SmartDriller! Use the code below to verify your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 36px; font-weight: bold; background: #f0f4ff; color: #0066ff; padding: 15px 30px; border-radius: 8px; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #555;">This code expires in <strong>1 hour</strong>.</p>
        <p style="color: #999; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
      </div>
    </div>
  `,

  deviceVerification: (otp) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #0066ff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">SmartDriller</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333;">New Device Sign In</h2>
        <p style="color: #555;">We detected a sign in from a new device. Use this code to verify:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 36px; font-weight: bold; background: #f0f4ff; color: #0066ff; padding: 15px 30px; border-radius: 8px; letter-spacing: 8px;">${otp}</span>
        </div>
        <p style="color: #555;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">If you didn't try to sign in, please secure your account immediately.</p>
      </div>
    </div>
  `,

  resetPassword: (resetLink) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #0066ff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">SmartDriller</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p style="color: #555;">Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #0066ff; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Reset Password</a>
        </div>
        <p style="color: #999; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    </div>
  `,

  resendVerification: (code) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
      <div style="background: #0066ff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">SmartDriller</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333;">Your New Verification Code</h2>
        <p style="color: #555;">Here is your new verification code:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 36px; font-weight: bold; background: #f0f4ff; color: #0066ff; padding: 15px 30px; border-radius: 8px; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #555;">This code expires in <strong>1 hour</strong>.</p>
      </div>
    </div>
  `,
};

// Core send function
async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"SmartDriller" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
    throw error;
  }
}

// Named email senders
async function sendVerificationEmail(email, code) {
  return sendEmail({
    to: email,
    subject: "Verify Your SmartDriller Account",
    html: templates.verifyEmail(code),
  });
}

async function sendDeviceOTPEmail(email, otp) {
  return sendEmail({
    to: email,
    subject: "Device Verification - SmartDriller",
    html: templates.deviceVerification(otp),
  });
}

async function sendPasswordResetEmail(email, resetToken) {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  return sendEmail({
    to: email,
    subject: "Reset Your SmartDriller Password",
    html: templates.resetPassword(resetLink),
  });
}

async function sendResendVerificationEmail(email, code) {
  return sendEmail({
    to: email,
    subject: "Resend Verification Code - SmartDriller",
    html: templates.resendVerification(code),
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendDeviceOTPEmail,
  sendPasswordResetEmail,
  sendResendVerificationEmail,
};