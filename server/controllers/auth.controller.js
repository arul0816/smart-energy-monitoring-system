const db = require("../config/db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { OAuth2Client } = require("google-auth-library")
const crypto = require("crypto")
const nodemailer = require("nodemailer")
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

  // 🔹 normalize phone (if identifier is phone)
  const normalizedPhone = normalizePhone(identifier)

  // if identifier is NOT meter id and NOT valid phone
  if (!identifier.startsWith("EB") && !normalizedPhone) {
    return res.status(400).json({
      message: "Invalid phone number or meter ID format",
    })
  }

  // 1️⃣ Find EB consumer
  const findEbSql = `
    SELECT id, phone FROM eb_consumers
    WHERE meter_id = ? OR phone = ?
  `

  db.query(
    findEbSql,
    [identifier, normalizedPhone],
    (err, ebRows) => {
      if (err) return res.status(500).json({ message: "DB error" })

      if (ebRows.length === 0) {
        return res
          .status(403)
          .json({ message: "You are not an EB consumer" })
      }

      const ebConsumerId = ebRows[0].id
      const ebPhone = ebRows[0].phone

      // 2️⃣ Check already registered
      db.query(
        "SELECT id FROM users WHERE eb_consumer_id = ?",
        [ebConsumerId],
        (err, userRows) => {
          if (userRows.length > 0) {
            return res
              .status(409)
              .json({ message: "User already registered" })
          }

          // 3️⃣ Insert user
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
            [name, email, hashedPassword, ebPhone,  ebConsumerId],
            (err, result) => {
              if (err)
                return res
                  .status(500)
                  .json({ message: "Registration failed" })

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

  // 🔹 normalize phone
  const normalizedPhone = normalizePhone(identifier)

  const sql = `
    SELECT u.*, e.phone, e.meter_id
    FROM users u
    JOIN eb_consumers e ON u.eb_consumer_id = e.id
    WHERE u.email = ?
       OR e.phone = ?
       OR e.meter_id = ?
    LIMIT 1
  `

  db.query(
    sql,
    [identifier, normalizedPhone, identifier],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" })

      if (results.length === 0) {
        return res.status(401).json({
          message: "Invalid credentials or EB consumer not found",
        })
      }

      const user = results[0]

      if (user.is_active !== 1) {
        return res
          .status(403)
          .json({ message: "Account not active. Please register." })
      }

      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid password" })
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
      WHERE email = ? AND is_active = 1
    `

    db.query(sql, [email], (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" })

      if (results.length === 0) {
        return res
          .status(403)
          .json({ message: "Google account not registered" })
      }

      const jwtToken = jwt.sign(
        { id: results[0].id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      )

      res.json({ message: "Google login successful", token: jwtToken })
    })
  } catch (err) {
    res.status(401).json({ message: "Google authentication failed" })
  }
}

/* ======================================================
   FORGOT PASSWORD – EMAIL OTP (UNCHANGED LOGIC)
====================================================== */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// exports.forgotPassword = async (req, res) => {
//   const { email } = req.body
//   if (!email) return res.status(400).json({ message: "Email required" })

//   const findSql =
//     "SELECT otp_last_sent FROM users WHERE u.email = ? OR e.phone = ? OR e.meter_id = ?"

//   db.query(findSql, [email], async (err, results) => {
//     if (err || results.length === 0) {
//       return res.status(400).json({ message: "Email not found" })
//     }

//     const user = results[0]

//     if (user.otp_last_sent) {
//       const diff =
//         (Date.now() - new Date(user.otp_last_sent).getTime()) / 1000
//       if (diff < 60) {
//         return res.status(429).json({
//           message: `Please wait ${Math.ceil(60 - diff)} seconds`
//         })
//       }
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString()
//     const hashedOtp = await bcrypt.hash(otp, 10)
//     const expiry = new Date(Date.now() + 10 * 60 * 1000)

//     const updateSql = `
//       UPDATE users
//       SET reset_otp = ?, reset_otp_expiry = ?, otp_last_sent = NOW()
//       WHERE u.email = ? OR e.phone = ? OR e.meter_id = ?
//     `

//     db.query(updateSql, [hashedOtp, expiry, email], async () => {
//       await transporter.sendMail({
//         to: email,
//         subject: "Password Reset OTP",
//         text: `Your OTP is ${otp}`
//       })

//       res.json({ message: "OTP sent to email" })
//     })
//   })
// }

/* ======================================================
   VERIFY OTP & RESET PASSWORD
====================================================== */
exports.resetPassword = async (req, res) => {
  const { identifier, password } = req.body

  if (!identifier || !password) {
    return res.status(400).json({ message: "All fields required" })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    const sql = `
      UPDATE users u
      JOIN eb_consumers e ON u.eb_consumer_id = e.id
      SET u.password = ?
      WHERE u.email = ?
         OR e.phone = ?
         OR e.meter_id = ?
    `

    db.query(
      sql,
      [hashedPassword, identifier, identifier, identifier],
      (err, result) => {
        if (err) {
          console.error(err)
          return res.status(500).json({ message: "DB error" })
        }

        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "User not found" })
        }

        res.json({ message: "Password reset successful" })
      }
    )
  } catch (err) {
    res.status(500).json({ message: "Server error" })
  }
}



/* ======================================================
   Get Phone For OTP
====================================================== */
exports.getPhoneForOtp = (req, res) => {
  const { identifier } = req.body
  const normalizedPhone = normalizePhone(identifier) 

  const sql = `
    SELECT e.phone
    FROM eb_consumers e
    LEFT JOIN users u ON u.eb_consumer_id = e.id
    WHERE u.email = ?
       OR e.phone = ?
       OR e.phone = ?  
       OR e.meter_id = ?
    LIMIT 1
  `

  db.query(sql, [identifier, identifier, normalizedPhone, identifier], (err, rows) => {
    if (err) {
      console.error("GET PHONE ERROR:", err)
      return res.status(500).json({ message: "DB error" })
    }

    if (rows.length === 0) {
      return res.status(403).json({
        message: "User not registered"
      })
    }

    if (!rows[0].phone) {
      return res.status(500).json({
        message: "Phone not mapped"
      })
    }

    res.json({ phone: rows[0].phone })
  })
}
