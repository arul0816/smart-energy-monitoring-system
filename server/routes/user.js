const express = require("express")
const router = express.Router()
const authMiddleware = require("../middleware/authMiddleware")
const db = require("../config/db")

// Get user profile
router.get("/profile", authMiddleware, (req, res) => {
  const sql = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      e.meter_id
    FROM users u
    JOIN eb_consumers e ON u.eb_consumer_id = e.id
    WHERE u.id = ?
  `

  db.query(sql, [req.userId], (err, results) => {
    if (err) {
      console.error("Profile fetch error:", err)
      return res.status(500).json({ message: "Database error" })
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(results[0])
  })
})

module.exports = router