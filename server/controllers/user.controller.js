const db = require("../config/db")
const bcrypt = require("bcrypt")
const crypto = require("crypto")
const emailService = require("../utils/emailService")



/* ======================================================
   GET USER PROFILE (Full Details)
====================================================== */
exports.getProfile = (req, res) => {
  const userId = req.userId // From auth middleware

  const sql = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.date_of_birth,
      u.gender,
      u.alternate_phone,
      u.address_line1,
      u.address_line2,
      u.city,
      u.district,
      u.state,
      u.pincode,
      u.country,
      u.profile_completed,
      e.meter_id,
      e.consumer_type
    FROM users u
    JOIN eb_consumers e ON u.eb_consumer_id = e.id
    WHERE u.id = ?
  `

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Profile fetch error:", err)
      return res.status(500).json({ message: "Database error" })
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(results[0])
  })
}


/* ======================================================
   UPDATE GENERAL PROFILE INFO (No verification needed)
====================================================== */
exports.updateGeneralInfo = (req, res) => {
  const userId = req.userId
  let {
    name,
    date_of_birth,
    gender,
    alternate_phone,
    address_line1,
    address_line2,
    city,
    district,
    state,
    pincode,
    country
  } = req.body

  console.log("📝 Update request data:", req.body)

  // Format date properly for MySQL
  if (date_of_birth) {
    // Convert ISO string to YYYY-MM-DD format
    date_of_birth = new Date(date_of_birth).toISOString().split('T')[0]
  }

  // Check if profile is complete
  const isComplete = !!(
    name &&
    date_of_birth &&
    gender &&
    address_line1 &&
    city &&
    district &&
    state &&
    pincode
  )

  const sql = `
    UPDATE users 
    SET 
      name = ?,
      date_of_birth = ?,
      gender = ?,
      alternate_phone = ?,
      address_line1 = ?,
      address_line2 = ?,
      city = ?,
      district = ?,
      state = ?,
      pincode = ?,
      country = ?,
      profile_completed = ?,
      updated_at = NOW()
    WHERE id = ?
  `

  db.query(
    sql,
    [
      name || null,
      date_of_birth || null,
      gender || null,
      alternate_phone || null,
      address_line1 || null,
      address_line2 || null,
      city || null,
      district || null,
      state || null,
      pincode || null,
      country || 'India',
      isComplete,
      userId
    ],
    (err) => {
      if (err) {
        console.error("❌ Profile update error:", err)
        console.error("❌ SQL:", err.sql)
        return res.status(500).json({
          message: "Update failed",
          error: err.message
        })
      }

      console.log("✅ Profile updated successfully for user:", userId)
      res.json({
        message: "Profile updated successfully",
        profile_completed: isComplete
      })
    }
  )
}
/* ======================================================
   SEND PHONE OTP (For Phone Update)
====================================================== */
exports.sendPhoneOTP = (req, res) => {
  const { phone } = req.body

  if (!phone || !phone.startsWith('+91')) {
    return res.status(400).json({
      message: "Please provide a valid Indian phone number starting with +91"
    })
  }

  // In real app, you'd integrate with Firebase here
  // For now, we'll return success so frontend can handle Firebase OTP
  res.json({
    message: "Ready to send OTP via Firebase",
    phone: phone
  })
}

/* ======================================================
   UPDATE PHONE NUMBER (After OTP Verification)
   - Updates both users table AND eb_consumers table
====================================================== */
exports.updatePhone = async (req, res) => {
  const userId = req.userId
  const { phone } = req.body

  console.log("📱 Phone update request for user:", userId, "Phone:", phone)

  if (!phone || !phone.startsWith('+91')) {
    return res.status(400).json({ message: "Invalid phone number" })
  }

  try {
    const promiseDb = db.promise();

    // 1. Get EB Consumer ID
    const [userRows] = await promiseDb.query(
      'SELECT eb_consumer_id FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const ebConsumerId = userRows[0].eb_consumer_id;

    // 2. Check if phone already exists for another user
    const [phoneRows] = await promiseDb.query(
      'SELECT id FROM users WHERE phone = ? AND id != ?',
      [phone, userId]
    );

    if (phoneRows.length > 0) {
      return res.status(409).json({ message: "This phone number is already registered" });
    }

    // 3. Update Users Table
    await promiseDb.query(
      'UPDATE users SET phone = ?, updated_at = NOW() WHERE id = ?',
      [phone, userId]
    );

    // 4. Update EB Consumers Table
    await promiseDb.query(
      'UPDATE eb_consumers SET phone = ? WHERE id = ?',
      [phone, ebConsumerId]
    );

    console.log("✅ Phone updated in both tables for user:", userId);
    res.json({ message: "Phone number updated successfully" });

  } catch (err) {
    console.error("❌ Phone update error:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
}

/* ======================================================
   SEND EMAIL VERIFICATION LINK
====================================================== */
exports.sendEmailVerification = async (req, res) => {
  const userId = req.userId
  const { email } = req.body

  console.log("📧 Email verification request for user:", userId, "Email:", email)

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: "Invalid email address" })
  }

  // Check if email already exists
  const checkSql = `
    SELECT id FROM users 
    WHERE email = ? AND id != ?
  `

  db.query(checkSql, [email.toLowerCase(), userId], async (err, results) => {
    if (err) {
      console.error("❌ Email check error:", err)
      return res.status(500).json({ message: "Database error" })
    }

    if (results.length > 0) {
      return res.status(409).json({
        message: "This email is already registered"
      })
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store token in database
    const storeSql = `
      INSERT INTO email_verification_tokens 
      (user_id, email, token, expires_at)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        email = ?,
        token = ?,
        expires_at = ?
    `

    db.query(
      storeSql,
      [userId, email, token, expiry, email, token, expiry],
      async (err) => {
        if (err) {
          console.error("❌ Token storage error:", err)
          return res.status(500).json({ message: "Failed to generate verification link" })
        }

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Verify Your Email - Smart Energy System',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #3B82F6 0%, #10B981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #3B82F6; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⚡ Smart Energy System</h1>
                </div>
                <div class="content">
                  <h2>Verify Your Email Address</h2>
                  <p>Hello,</p>
                  <p>You requested to update your email address. Please click the button below to verify your new email:</p>
                  <center>
                    <a href="${verificationUrl}" class="button">Verify Email</a>
                  </center>
                  <p><strong>This link will expire in 15 minutes.</strong></p>
                  <p>If you didn't request this change, please ignore this email.</p>
                  <div class="footer">
                    <p>© 2026 Smart Energy System. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `
        }

        try {
          await emailService.sendEmail(email, mailOptions.subject, mailOptions.html)

          res.json({
            message: "Verification email sent successfully. Please check your inbox.",
            email: email
          })
        } catch (emailErr) {
          console.error("❌ Email send error:", emailErr)
          return res.status(500).json({
            message: "Failed to send verification email. Please try again."
          })
        }
      }
    )
  })
}
/* ======================================================
   VERIFY EMAIL TOKEN & UPDATE EMAIL
====================================================== */
exports.verifyEmailToken = (req, res) => {
  const { token } = req.query

  console.log("🔐 Email verification attempt, token:", token)

  if (!token) {
    return res.status(400).json({ message: "Verification token is required" })
  }

  // Find token in database
  const findSql = `
    SELECT user_id, email, expires_at 
    FROM email_verification_tokens
    WHERE token = ?
  `

  db.query(findSql, [token], (err, results) => {
    if (err) {
      console.error("Token lookup error:", err)
      return res.status(500).json({ message: "Database error" })
    }

    if (results.length === 0) {
      // Check if email was already updated (token already used)
      // This prevents showing "failed" when it actually worked
      console.log("❌ Token not found (may have been used already)")
      return res.status(404).json({
        message: "This verification link has already been used or is invalid"
      })
    }

    const { user_id, email, expires_at } = results[0]

    // Check if token expired
    if (new Date() > new Date(expires_at)) {
      console.log("❌ Token expired")
      // Delete expired token
      db.query('DELETE FROM email_verification_tokens WHERE token = ?', [token])
      return res.status(410).json({ message: "Verification link has expired. Please request a new one." })
    }

    // Update user email
    const updateSql = `
      UPDATE users 
      SET email = ?, updated_at = NOW()
      WHERE id = ?
    `

    db.query(updateSql, [email, user_id], (err) => {
      if (err) {
        console.error("❌ Email update error:", err)
        return res.status(500).json({ message: "Failed to update email" })
      }

      // Delete used token (AFTER successful update)
      db.query('DELETE FROM email_verification_tokens WHERE token = ?', [token], (delErr) => {
        if (delErr) {
          console.error("⚠️ Token delete error:", delErr)
          // Don't fail the request, email was already updated
        }
      })

      console.log("✅ Email verified successfully for user:", user_id, "New email:", email)
      res.json({
        message: "Email verified and updated successfully!",
        success: true
      })
    })
  })
}