const express = require("express")
const router = express.Router()

// ✅ IMPORT CONTROLLER PROPERLY
const authController = require("../controllers/auth.controller")

// ===================== AUTH ROUTES =====================

// Register
router.post("/register", authController.registerUser)

// Login (email / phone / meterId)
router.post("/login", authController.loginUser)

// Google login
router.post("/google-login", authController.googleLogin)

// Forgot password (send OTP)
// router.post("/forgot-password", authController.forgotPassword)

// Verify OTP & reset password
router.post("/reset-password", authController.resetPassword)


// 🔥 GET PHONE FOR OTP (REGISTER / FORGOT PASSWORD)
router.post("/get-phone", authController.getPhoneForOtp)

module.exports = router
