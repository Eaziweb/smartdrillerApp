// routes/test.js
const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

router.get("/test-email", async (req, res) => {
  try {
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use App Password
      },
    });

    await transporter.verify();

    let info = await transporter.sendMail({
      from: `"SmartDriller Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // send to yourself
      subject: "Gmail SMTP Test",
      text: "If you got this, Gmail SMTP works!",
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("Test email error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
