import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth"
import { auth } from "../firebase"
import { Zap, AlertCircle, CheckCircle, Mail, Phone } from "lucide-react"

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [inputType, setInputType] = useState("email") // "email" or "phone"
  const [identifier, setIdentifier] = useState("")
  const [resolvedPhone, setResolvedPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [confirmation, setConfirmation] = useState(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [timer, setTimer] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("")

  const showMessage = (msg, type) => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => {
      setMessage("")
    }, 5000)
  }

  // Recaptcha setup with cleanup (unique instance for ForgotPassword)
  useEffect(() => {
    const name = "recaptchaVerifierForgot"
    try {
      if (!window[name]) {
        window[name] = new RecaptchaVerifier(
          auth,
          "recaptcha-forgot",
          { size: "invisible" }
        )
      }
    } catch (e) {
      console.log("Recaptcha init error", e)
    }

    // Cleanup on unmount
    return () => {
      try {
        if (window[name]) {
          window[name].clear && window[name].clear()
          window[name] = null
        }
      } catch (e) {
        console.log("Recaptcha cleanup error", e)
        window[name] = null
      }
    }
  }, [])

  // Timer
  useEffect(() => {
    let interval
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  // SEND OTP
  const sendOtp = async () => {
    if (!identifier) {
      showMessage(`Enter your ${inputType}`, "error")
      return
    }

    // Validate input based on type
    if (inputType === "email") {
      if (!identifier.includes("@")) {
        showMessage("Please enter a valid email address", "error")
        return
      }
    } else if (inputType === "phone") {
      if (!identifier.startsWith("+91") || identifier.length < 13) {
        showMessage("Please enter a valid phone number (+91XXXXXXXXXX)", "error")
        return
      }
    }

    setLoading(true)
    showMessage("", "")

    try {
      const res = await fetch("http://localhost:5000/api/auth/get-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      })

      const data = await res.json()

      if (!res.ok) {
        showMessage(data.message || "User not found", "error")
        setLoading(false)
        return
      }

      console.log("📞 Forgot Password - Phone from backend:", data.phone)
      console.log("📞 Forgot Password - Phone type:", typeof data.phone)

      setResolvedPhone(data.phone)

      // Validate phone from backend before calling Firebase
      if (!data.phone || typeof data.phone !== "string" || !data.phone.startsWith("+")) {
        showMessage("Invalid phone returned from server", "error")
        setLoading(false)
        return
      }

      const appVerifier = window.recaptchaVerifierForgot || window.recaptchaVerifier
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        data.phone,
        appVerifier
      )

      setConfirmation(confirmationResult)
      setStep(2)
      setTimer(60)
      showMessage(`OTP sent to ${data.phone}`, "success")
    } catch (err) {
      console.error("OTP Error:", err)
      showMessage("OTP sending failed", "error")
      
      // Reset recaptcha on error (recreate named verifier)
      try {
        if (window.recaptchaVerifierForgot) {
          window.recaptchaVerifierForgot.clear && window.recaptchaVerifierForgot.clear()
          window.recaptchaVerifierForgot = new RecaptchaVerifier(
            auth,
            "recaptcha-forgot",
            { size: "invisible" }
          )
        }
      } catch (e) {
        console.log("Recaptcha reset error", e)
      }
    } finally {
      setLoading(false)
    }
  }

  // VERIFY OTP
  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showMessage("Enter 6-digit OTP", "error")
      return
    }

    setLoading(true)

    try {
      await confirmation.confirm(otp)
      showMessage("OTP verified! Enter new password.", "success")
      setStep(3)
    } catch (err) {
      console.error("OTP Verification Error:", err)
      showMessage("Invalid OTP", "error")
    } finally {
      setLoading(false)
    }
  }

  // RESET PASSWORD
  const resetPassword = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      showMessage("Passwords do not match", "error")
      return
    }

    if (password.length < 6) {
      showMessage("Password must be at least 6 characters", "error")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        showMessage(data.message || "Reset failed", "error")
        setLoading(false)
        return
      }

      showMessage("Password reset successful! Redirecting to login...", "success")
      setTimeout(() => navigate("/login"), 2000)
    } catch (err) {
      console.error("Password Reset Error:", err)
      showMessage("Password reset failed", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    let value = e.target.value
    
    if (inputType === "phone") {
      // Auto-format phone number
      value = value.replace(/[^\d+]/g, "")
      if (value && !value.startsWith("+91")) {
        value = "+91" + value.replace(/\D/g, "")
      }
      // Limit to +91 + 10 digits
      if (value.length > 13) {
        value = value.slice(0, 13)
      }
    }
    
    setIdentifier(value)
  }

  const handleToggle = (type) => {
    setInputType(type)
    setIdentifier("")
    setMessage("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 1 && "Forgot Password"}
            {step === 2 && "Verify OTP"}
            {step === 3 && "Reset Password"}
          </h1>
          <p className="text-gray-600">
            {step === 1 && "We'll send you an OTP to reset"}
            {step === 2 && "Enter the code sent to your phone"}
            {step === 3 && "Create a new secure password"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div id="recaptcha-forgot"></div>

          {/* STEP 1 - IDENTIFIER */}
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); sendOtp() }} className="space-y-5">
              {/* Toggle Between Email and Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Recovery Method
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle("email")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                      inputType === "email"
                        ? "bg-blue-500 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Mail className="w-5 h-5" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle("phone")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                      inputType === "phone"
                        ? "bg-green-500 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Phone className="w-5 h-5" />
                    Phone
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {inputType === "email" ? "Email Address" : "Phone Number"}
                </label>
                <input
                  type="text"
                  placeholder={
                    inputType === "email"
                      ? "Enter your email address"
                      : "Enter your phone number (+91XXXXXXXXXX)"
                  }
                  value={identifier}
                  onChange={handleInputChange}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      sendOtp()
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {message && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    messageType === "success"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {messageType === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p
                    className={`text-sm ${
                      messageType === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {message}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-green-600 transition-all disabled:opacity-50 shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending OTP...
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2 - OTP */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-600 text-center">
                OTP sent to <b>{resolvedPhone}</b>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      verifyOtp()
                    }
                  }}
                  maxLength="6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-widest"
                />
              </div>

              {message && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    messageType === "success"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {messageType === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p
                    className={`text-sm ${
                      messageType === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {message}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={verifyOtp}
                disabled={loading}
                className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-all shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Verify OTP"
                )}
              </button>

              <button
                type="button"
                onClick={sendOtp}
                disabled={timer > 0}
                className={`w-full text-sm ${
                  timer > 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-600 hover:text-blue-700 font-medium underline"
                }`}
              >
                {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
              </button>
            </div>
          )}

          {/* STEP 3 - NEW PASSWORD */}
          {step === 3 && (
            <form onSubmit={resetPassword} className="space-y-5">
              <p className="text-sm text-gray-600 text-center">
                Resetting password for <b>{identifier}</b>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              {message && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    messageType === "success"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {messageType === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p
                    className={`text-sm ${
                      messageType === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {message}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-green-600 transition-all disabled:opacity-50 shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}