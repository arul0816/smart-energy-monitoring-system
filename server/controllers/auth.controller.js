const db = require("../config/db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const emailService = require("../utils/emailService")
const normalizePhone = require("../utils/normalizePhone")

// In-memory Set to store verified emails (reliable tracking)
const verifiedEmails = new Set()

/* ======================================================
   REGISTER USER (AFTER EB CHECK + OTP + EMAIL VERIFICATION)
====================================================== */
exports.registerUser = async (req, res) => {
  const { name, identifier, email, password } = req.body

  if (!name || !identifier || !email || !password) {
    return res.status(400).json({ message: "All fields required" })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  // Normalize identifier
  const upperIdentifier = identifier.toUpperCase()
  const normalizedPhone = normalizePhone(identifier)
  const rawPhone = identifier.replace(/\D/g, "").slice(-10)

  // Find EB consumer (match meter_id, normalized phone, or last 10 digits)
  const findEbSql = `
    SELECT id, phone FROM eb_consumers
    WHERE meter_id = ?
      OR phone = ?
      OR RIGHT(REPLACE(REPLACE(REPLACE(phone,'+',''),'-',''),' ',''), 10) = ?
  `

  db.query(
    findEbSql,
    [upperIdentifier, normalizedPhone, rawPhone],
    (err, ebRows) => {
      if (err) {
        console.error("DB Error:", err)
        return res.status(500).json({ message: "Database error" })
      }

      if (ebRows.length === 0) {
        return res.status(403).json({ message: "You are not an EB consumer" })
      }

      const ebConsumerId = ebRows[0].id
      const ebPhone = ebRows[0].phone

      // Check if already registered
      db.query(
        "SELECT id FROM users WHERE eb_consumer_id = ?",
        [ebConsumerId],
        (err, userRows) => {
          if (err) {
            console.error("DB Error:", err)
            return res.status(500).json({ message: "Database error" })
          }

          if (userRows.length > 0) {
            return res.status(409).json({ message: "User already registered" })
          }

          // Insert user
          const insertSql = `
            INSERT INTO users (
              name,
              email,
              password,
              phone,
              eb_consumer_id,
              is_active,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, 1, NOW())
          `

          db.query(
            insertSql,
            [name, email, hashedPassword, ebPhone, ebConsumerId],
            (err, result) => {
              if (err) {
                console.error("Insert Error:", err)
                return res.status(500).json({ message: "Registration failed" })
              }

              // Clear the verified email from memory after successful registration
              verifiedEmails.delete(email.toLowerCase())

              const token = jwt.sign(
                { id: result.insertId },
                process.env.JWT_SECRET,
                { expiresIn: "1d" }
              )

              res.json({
                message: "Registration successful",
                token,
              })
            }
          )
        }
      )
    }
  )
}

/* ======================================================
   LOGIN (Email / Phone / Meter ID + Password)
====================================================== */
exports.loginUser = (req, res) => {
  const { identifier, password } = req.body

  if (!identifier || !password) {
    return res.status(400).json({ message: "All fields are required" })
  }

  // Normalize identifier
  const upperIdentifier = identifier.toUpperCase()
  const normalizedPhone = normalizePhone(identifier)
  const lowerEmail = identifier.toLowerCase()
  const rawPhone = identifier.replace(/\D/g, '').slice(-10)

  const sql = `
    SELECT u.*, e.meter_id, e.phone
    FROM users u
    JOIN eb_consumers e ON u.eb_consumer_id = e.id
    WHERE LOWER(u.email) = ?
       OR e.phone = ?
       OR RIGHT(REPLACE(REPLACE(REPLACE(e.phone,'+',''),'-',''),' ',''), 10) = ?
       OR e.meter_id = ?
  `

  db.query(
    sql,
    [lowerEmail, normalizedPhone, rawPhone, upperIdentifier],
    async (err, results) => {
      if (err) {
        console.error("Login DB Error:", err)
        return res.status(500).json({ message: "Database error" })
      }

      if (results.length === 0) {
        return res.status(401).json({
          message: "Invalid credentials",
        })
      }

      const user = results[0]

      if (user.is_active !== 1) {
        return res.status(403).json({
          message: "Account not active. Please contact support."
        })
      }

      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" })
      }

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      )

      res.json({ message: "Login successful", token })
    }
  )
}

/* ======================================================
   GET PHONE FOR OTP (Used in Register & Forgot Password)
====================================================== */
exports.getPhoneForOtp = (req, res) => {
  const { identifier } = req.body

  if (!identifier) {
    return res.status(400).json({ message: "Identifier required" })
  }

  const upperIdentifier = identifier.toUpperCase()
  const normalizedPhone = normalizePhone(identifier)
  const rawPhone = identifier.replace(/\D/g, "").slice(-10)
  const lowerEmail = identifier.toLowerCase()

  const sql = `
    SELECT e.phone
    FROM eb_consumers e
    LEFT JOIN users u ON u.eb_consumer_id = e.id
    WHERE LOWER(u.email) = ?
       OR e.phone = ?
       OR RIGHT(REPLACE(REPLACE(REPLACE(e.phone,'+',''),'-',''),' ',''), 10) = ?
       OR e.meter_id = ?
    LIMIT 1
  `

  db.query(
    sql,
    [lowerEmail, normalizedPhone, rawPhone, upperIdentifier],
    (err, rows) => {
      if (err) {
        console.error("Get Phone Error:", err)
        return res.status(500).json({ message: "Database error" })
      }

      if (rows.length === 0) {
        return res.status(404).json({
          message: "User not found. Please check your identifier."
        })
      }

      if (!rows[0].phone) {
        return res.status(500).json({
          message: "Phone number not found in records"
        })
      }

      const phoneFromDB = rows[0].phone
      const formattedPhone = normalizePhone(phoneFromDB)

      if (!formattedPhone) {
        return res.status(500).json({
          message: "Invalid phone format in database"
        })
      }

      res.json({ phone: formattedPhone })
    }
  )
}

/* ======================================================
   FORGOT PASSWORD - SEND OTP
====================================================== */
exports.forgotPassword = (req, res) => {
  const { identifier } = req.body

  if (!identifier) {
    return res.status(400).json({ message: "Identifier required" })
  }

  const upperIdentifier = identifier.toUpperCase()
  const normalizedPhone = normalizePhone(identifier)
  const rawPhone = identifier.replace(/\D/g, "").slice(-10)
  const lowerEmail = identifier.toLowerCase()

  const findSql = `
    SELECT u.id, e.phone
    FROM users u
    JOIN eb_consumers e ON u.eb_consumer_id = e.id
    WHERE LOWER(u.email) = ?
       OR e.phone = ?
       OR RIGHT(REPLACE(REPLACE(REPLACE(e.phone,'+',''),'-',''),' ',''), 10) = ?
       OR e.meter_id = ?
    LIMIT 1
  `

  db.query(
    findSql,
    [lowerEmail, normalizedPhone, rawPhone, upperIdentifier],
    (err, results) => {
      if (err) {
        console.error("Forgot Password Error:", err)
        return res.status(500).json({ message: "Database error" })
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" })
      }

      const phone = results[0].phone

      if (!phone) {
        return res.status(500).json({ message: "Phone number not found" })
      }

      const formattedPhone = normalizePhone(phone)

      if (!formattedPhone) {
        return res.status(500).json({
          message: "Invalid phone format in database"
        })
      }

      res.json({
        message: "User found",
        phone: formattedPhone
      })
    }
  )
}

/* ======================================================
   RESET PASSWORD (After OTP Verification)
====================================================== */
exports.resetPassword = async (req, res) => {
  const { identifier, password } = req.body

  if (!identifier || !password) {
    return res.status(400).json({ message: "All fields required" })
  }

  const upperIdentifier = identifier.toUpperCase()
  const normalizedPhone = normalizePhone(identifier)
  const rawPhone = identifier.replace(/\D/g, "").slice(-10)
  const lowerEmail = identifier.toLowerCase()

  const findSql = `
    SELECT u.id
    FROM users u
    JOIN eb_consumers e ON u.eb_consumer_id = e.id
    WHERE LOWER(u.email) = ?
       OR e.phone = ?
       OR RIGHT(REPLACE(REPLACE(REPLACE(e.phone,'+',''),'-',''),' ',''), 10) = ?
       OR e.meter_id = ?
    LIMIT 1
  `

  db.query(
    findSql,
    [lowerEmail, normalizedPhone, rawPhone, upperIdentifier],
    async (err, results) => {
      if (err) {
        console.error("Reset Password Error:", err)
        return res.status(500).json({ message: "Database error" })
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" })
      }

      const userId = results[0].id
      const hashedPassword = await bcrypt.hash(password, 10)

      db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, userId],
        (err) => {
          if (err) {
            console.error("Password Update Error:", err)
            return res.status(500).json({ message: "Password reset failed" })
          }

          res.json({ message: "Password reset successful" })
        }
      )
    }
  )
}

/* ======================================================
   SEND EMAIL VERIFICATION FOR REGISTRATION (No Auth)
====================================================== */
exports.sendRegisterEmailVerification = async (req, res) => {
  const { email } = req.body

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: "Invalid email address" })
  }

  // Check if email already exists in users table
  const checkSql = `SELECT id FROM users WHERE LOWER(email) = ?`

  db.query(checkSql, [email.toLowerCase()], async (err, results) => {
    if (err) {
      console.error("Email check error:", err)
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

    // Store token in temp table
    const storeSql = `
      INSERT INTO temp_email_verification 
      (email, token, expires_at)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        token = ?,
        expires_at = ?
    `

    db.query(
      storeSql,
      [email.toLowerCase(), token, expiry, token, expiry],
      async (err) => {
        if (err) {
          console.error("Token storage error:", err)
          return res.status(500).json({ message: "Failed to generate verification link" })
        }

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-register-email?token=${token}`

        const emailHtml = `
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
                <p>Welcome! You're almost ready to start using Smart Energy System.</p>
                <p>Please click the button below to verify your email address:</p>
                <center>
                  <a href="${verificationUrl}" class="button">Verify Email</a>
                </center>
                <p><strong>This link will expire in 15 minutes.</strong></p>
                <p>If you didn't create an account, please ignore this email.</p>
                <div class="footer">
                  <p>© 2025 Smart Energy System. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `

        try {
          await emailService.sendEmail(
            email, 
            'Verify Your Email - Smart Energy System Registration', 
            emailHtml
          )

          console.log("✅ Verification email sent to:", email)

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
   VERIFY REGISTRATION EMAIL TOKEN
====================================================== */
exports.verifyRegisterEmailToken = (req, res) => {
  const { token } = req.query

  console.log("🔐 Registration email verification attempt")

  if (!token) {
    return res.status(400).json({ message: "Verification token is required" })
  }

  // Find token in temp table
  const findSql = `
    SELECT email, expires_at 
    FROM temp_email_verification
    WHERE token = ?
  `

  db.query(findSql, [token], (err, results) => {
    if (err) {
      console.error("Token lookup error:", err)
      return res.status(500).json({ message: "Database error" })
    }

    if (results.length === 0) {
      console.log("❌ Token not found")
      return res.status(404).json({
        message: "Invalid or expired verification link"
      })
    }

    const { email, expires_at } = results[0]

    // Check if token expired
    if (new Date() > new Date(expires_at)) {
      console.log("❌ Token expired")
      db.query('DELETE FROM temp_email_verification WHERE token = ?', [token])
      return res.status(410).json({
        message: "Verification link has expired. Please request a new one."
      })
    }

    // Add email to verified set (this is what the polling checks)
    verifiedEmails.add(email.toLowerCase())
    console.log("✅ Email added to verified set:", email)
    console.log("📧 Current verified emails:", Array.from(verifiedEmails))

    // Delete the token from database
    db.query('DELETE FROM temp_email_verification WHERE token = ?', [token])

    console.log("✅ Registration email verified successfully:", email)
    
    res.json({
      message: "Email verified successfully!",
      email: email,
      success: true
    })
  })
}

/* ======================================================
   CHECK REGISTRATION EMAIL VERIFICATION STATUS
====================================================== */
exports.checkRegisterEmail = (req, res) => {
  const { email } = req.query

  if (!email) {
    return res.json({ verified: false })
  }

  const lowerEmail = email.toLowerCase()
  const isVerified = verifiedEmails.has(lowerEmail)

  console.log("🔍 Checking email:", lowerEmail, "| Verified:", isVerified)
  console.log("📧 All verified emails:", Array.from(verifiedEmails))

  res.json({ verified: isVerified })
}