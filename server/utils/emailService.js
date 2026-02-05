const nodemailer = require("nodemailer")

/* ======================================================
   EMAIL SERVICE - Gmail Setup
   
   ⚠️  IMPORTANT: For Gmail, you MUST use an App Password!
   
   Steps to create Gmail App Password:
   ────────────────────────────────────
   1. Go to: https://myaccount.google.com/security
   2. Enable "2-Step Verification" (required)
   3. Go to: https://myaccount.google.com/apppasswords
   4. Select app: "Mail"
   5. Select device: "Windows Computer" (or your device)
   6. Click "Generate"
   7. Copy the 16-character password (like: abcd efgh ijkl mnop)
   8. Use that password in .env as EMAIL_PASS
   
   Your .env should look like:
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop
   
====================================================== */

/**
 * Create email transporter with validation
 */
const createTransporter = () => {
  // Check if credentials are set
  if (!process.env.EMAIL_USER) {
    console.error("❌ EMAIL_USER is not set in .env file")
    throw new Error("EMAIL_USER not configured")
  }
  
  if (!process.env.EMAIL_PASS) {
    console.error("❌ EMAIL_PASS is not set in .env file")
    throw new Error("EMAIL_PASS not configured")
  }

  // Check if using regular password instead of app password
  if (process.env.EMAIL_PASS.length < 10) {
    console.warn("⚠️  EMAIL_PASS seems too short. Make sure you're using a Gmail App Password!")
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })
}

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 * @returns {Promise<Object>} - Result of the send operation
 */
exports.sendEmail = async (to, subject, html) => {
  try {
    console.log(`📧 Attempting to send email to: ${to}`)
    console.log(`   From: ${process.env.EMAIL_USER}`)
    
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"Smart Energy System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`✅ Email sent successfully to ${to}`)
    console.log(`   Message ID: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}`)
    console.error(`   Error: ${error.message}`)
    
    // Provide helpful error messages
    if (error.code === 'EAUTH') {
      console.error(`
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  GMAIL AUTHENTICATION ERROR                              ║
╠══════════════════════════════════════════════════════════════╣
║  Your Gmail credentials are incorrect.                       ║
║                                                              ║
║  You MUST use an App Password, not your regular password!   ║
║                                                              ║
║  Steps to fix:                                               ║
║  1. Go to: https://myaccount.google.com/apppasswords        ║
║  2. Generate a new App Password for "Mail"                   ║
║  3. Update EMAIL_PASS in your .env file                      ║
║  4. Restart the server                                       ║
╚══════════════════════════════════════════════════════════════╝
      `)
    }
    
    throw error
  }
}

/**
 * Test email configuration
 */
exports.testEmailConfig = async () => {
  try {
    console.log("🧪 Testing email configuration...")
    const transporter = createTransporter()
    await transporter.verify()
    console.log("✅ Email configuration is valid!")
    return true
  } catch (error) {
    console.error("❌ Email configuration test failed:", error.message)
    return false
  }
}