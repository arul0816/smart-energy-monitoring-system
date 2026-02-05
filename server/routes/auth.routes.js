const express = require("express")
const router = express.Router()
const authController = require("../controllers/auth.controller")

// Register (after OTP verification)
router.post("/register", authController.registerUser)

// Login (email / phone / meterId + password)
router.post("/login", authController.loginUser)

// Get phone for OTP (used in register & forgot password)
router.post("/get-phone", authController.getPhoneForOtp)

// Forgot password (get phone for OTP)
router.post("/forgot-password", authController.forgotPassword)

// Reset password (after OTP verification)
router.post("/reset-password", authController.resetPassword)

// Registration email verification (NO AUTH)
router.post("/send-register-email-verification", authController.sendRegisterEmailVerification)
router.get("/verify-register-email", authController.verifyRegisterEmailToken)
router.get("/check-register-email", authController.checkRegisterEmail)

module.exports = router 