import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth"
import { auth } from "../firebase"
import { Zap, AlertCircle, CheckCircle } from "lucide-react"

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
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
  }

  const createRecaptcha = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear()
      window.recaptchaVerifier = null
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    })
    return window.recaptchaVerifier
  }

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
      showMessage("Enter Email / Phone / Meter ID", "error")
      return
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

      setResolvedPhone(data.phone)
      const appVerifier = createRecaptcha()
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
      console.error("OTP ERROR:", err)
      showMessage("OTP sending failed", "error")
    } finally {
      setLoading(false)
    }
  }

  // VERIFY OTP
  const verifyOtp = async () => {
    if (!otp) {
      showMessage("Enter OTP", "error")
      return
    }

    try {
      await confirmation.confirm(otp)
      showMessage("OTP verified! Enter new password.", "success")
      setStep(3)
    } catch (err) {
      showMessage("Invalid OTP", "error")
    }
  }

  // RESET PASSWORD
  const resetPassword = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      showMessage("Passwords do not match", "error")
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
      showMessage("Password reset failed", "error")
    } finally {
      setLoading(false)
    }
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
          <div id="recaptcha-container"></div>

          {/* STEP 1 - IDENTIFIER */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email / Phone / Meter ID
                </label>
                <input
                  type="text"
                  placeholder="Enter your identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
                type="button"
                onClick={sendOtp}
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
            </div>
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
                className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-all shadow-md"
              >
                Verify OTP
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
            <div className="space-y-5">
              <p className="text-sm text-gray-600 text-center">
                Resetting password for <b>{identifier}</b>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                onClick={resetPassword}
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}