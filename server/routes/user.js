const express = require("express")
const router = express.Router()
const authMiddleware = require("../middleware/authMiddleware")
const userController = require("../controllers/user.controller")

/* ======================================================
   PROFILE ROUTES (Auth required)
====================================================== */
router.get("/profile", authMiddleware, userController.getProfile)
router.put("/profile/general", authMiddleware, userController.updateGeneralInfo)
router.put("/profile/phone", authMiddleware, userController.updatePhone)
router.post("/profile/email/send-verification", authMiddleware, userController.sendEmailVerification)

/* ======================================================
   EMAIL VERIFICATION (No auth required - public link)
====================================================== */
router.get("/verify-email", userController.verifyEmailToken)

module.exports = router