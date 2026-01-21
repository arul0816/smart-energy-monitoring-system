const db = require("../config/db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { OAuth2Client } = require("google-auth-library")
const normalizePhone = require("../utils/normalizePhone")

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

/* ======================================================
   REGISTER USER (AFTER EB CHECK + OTP)
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

  // 🔥 For phone login, also try raw 10-digit format
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
   GOOGLE LOGIN (ONLY IF USER ALREADY REGISTERED)
====================================================== */
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const { email } = ticket.getPayload()

    const sql = `
      SELECT id FROM users
      WHERE LOWER(email) = ? AND is_active = 1
    `

    db.query(sql, [email.toLowerCase()], (err, results) => {
      if (err) {
        console.error("Google Login DB Error:", err)
        return res.status(500).json({ message: "Database error" })
      }

      if (results.length === 0) {
        return res.status(403).json({ 
          message: "Please register first with your EB consumer details" 
        })
      }

      const jwtToken = jwt.sign(
        { id: results[0].id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      )

      res.json({ message: "Google login successful", token: jwtToken })
    })
  } catch (err) {
    console.error("Google Auth Error:", err)
    res.status(401).json({ message: "Google authentication failed" })
  }
}

/* ======================================================
   GET PHONE FOR OTP (Used in Register & Forgot Password)
====================================================== */
exports.getPhoneForOtp = (req, res) => {
  console.log("getPhoneForOtp request body:", req.body)
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

      console.log("getPhoneForOtp rows:", rows)

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

      // 🔥 NORMALIZE PHONE BEFORE SENDING TO FRONTEND
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
  console.log("forgotPassword request body:", req.body)
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

      console.log("forgotPassword results:", results)

      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" })
      }

      const phone = results[0].phone

      if (!phone) {
        return res.status(500).json({ message: "Phone number not found" })
      }

      // 🔥 NORMALIZE PHONE BEFORE SENDING TO FRONTEND
      const formattedPhone = normalizePhone(phone)

      if (!formattedPhone) {
        return res.status(500).json({
          message: "Invalid phone format in database"
        })
      }

      // Return phone for Firebase OTP
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