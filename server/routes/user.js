const express = require("express")
const router = express.Router()
const authMiddleware = require("../middleware/authMiddleware")
const db = require("../config/db")

// ✅ Protected user profile
router.get("/profile", authMiddleware, (req, res) => {
  db.query(
    "SELECT id, name, email, phone, meter_id FROM users WHERE id = ?",
    [req.userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" })
      if (results.length === 0)
        return res.status(404).json({ message: "User not found" })

      res.json(results[0])
    }
  )
})

module.exports = router
