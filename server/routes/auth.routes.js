const express = require("express")
const router = express.Router()
const authController = require("../controllers/auth.controller")

// Register (after OTP verification)
router.post("/register", authController.registerUser)

// Login (email / phone / meterId + password)
router.post("/login", authController.loginUser)

// Google login
router.post("/google-login", authController.googleLogin)

// Get phone for OTP (used in register & forgot password)
router.post("/get-phone", authController.getPhoneForOtp)

// Forgot password (get phone for OTP)
router.post("/forgot-password", authController.forgotPassword)

// Reset password (after OTP verification)
router.post("/reset-password", authController.resetPassword)

module.exports = router