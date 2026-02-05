import { useState, useEffect, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth"
import { auth } from "../../firebase"
import { Zap, AlertCircle, CheckCircle } from "lucide-react"

export default function Register() {
  const navigate = useNavigate()
  const recaptchaRef = useRef(null)

  const [name, setName] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [confirmation, setConfirmation] = useState(null)
  const [otpVerified, setOtpVerified] = useState(false)

  const [timer, setTimer] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("")
  const [emailVerified, setEmailVerified] = useState(false)
  const [emailVerifying, setEmailVerifying] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Show message helper
  const showMessage = (msg, type) => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(""), 5000)
  }

  // Listen for email verification from popup window
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return

      if (event.data?.type === "EMAIL_VERIFIED") {
        setEmailVerified(true)
        setEmailSent(false)
        showMessage("Email verified successfully!", "success")
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  // Poll for email verification (backup for when postMessage doesn't work)
  useEffect(() => {
    if (!emailSent || emailVerified || !email) return

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/auth/check-register-email?email=${encodeURIComponent(email)}`
        )
        const data = await res.json()

        if (data.verified) {
          setEmailVerified(true)
          setEmailSent(false)
          showMessage("Email verified successfully!", "success")
          clearInterval(pollInterval)
        }
      } catch (e) {
        console.error("Email poll error:", e)
      }
    }, 3000) // Check every 3 seconds

    return () => clearInterval(pollInterval)
  }, [emailSent, emailVerified, email])

  // Recaptcha setup
  useEffect(() => {
    const setupRecaptcha = () => {
      try {
        if (!window.recaptchaVerifierRegister) {
          window.recaptchaVerifierRegister = new RecaptchaVerifier(
            auth,
            "recaptcha-register",
            { size: "invisible" }
          )
        }
      } catch (e) {
        console.log("Recaptcha setup error:", e)
      }
    }

    setupRecaptcha()

    return () => {
      try {
        if (window.recaptchaVerifierRegister) {
          window.recaptchaVerifierRegister.clear()
          window.recaptchaVerifierRegister = null
        }
      } catch (e) {
        window.recaptchaVerifierRegister = null
      }
    }
  }, [])

  // OTP Timer
  useEffect(() => {
    if (timer === 0) return
    const interval = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(interval)
  }, [timer])

  // Send email verification
  const sendEmailVerification = async () => {
    if (!email) {
      showMessage("Please enter email address", "error")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showMessage("Please enter a valid email address", "error")
      return
    }

    setEmailVerifying(true)

    try {
      const res = await fetch(
        "http://localhost:5000/api/auth/send-register-email-verification",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        }
      )

      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error. Please try again.")
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Email verification failed")
      }

      setEmailSent(true)
      showMessage("Verification email sent! Please check your inbox and click the link.", "success")
    } catch (err) {
      console.error("Email verify error:", err)
      showMessage(err.message || "Email verification failed", "error")
    } finally {
      setEmailVerifying(false)
    }
  }

  // Send OTP
  const sendOtp = async () => {
    if (!identifier) {
      showMessage("Please enter Meter ID or Phone Number", "error")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const res = await fetch("http://localhost:5000/api/auth/get-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      })

      const data = await res.json()

      if (!res.ok) {
        showMessage(data.message || "Not an EB consumer", "error")
        setLoading(false)
        return
      }

      if (!data.phone || !data.phone.startsWith("+")) {
        showMessage("Invalid phone returned from server", "error")
        setLoading(false)
        return
      }

      const appVerifier = window.recaptchaVerifierRegister
      const confirmationResult = await signInWithPhoneNumber(auth, data.phone, appVerifier)

      setConfirmation(confirmationResult)
      setOtpSent(true)
      setTimer(60)
      showMessage(`OTP sent to ${data.phone}`, "success")
    } catch (err) {
      console.error("OTP Error:", err)
      showMessage("OTP sending failed. Please try again.", "error")
      
      // Reset recaptcha on error
      try {
        if (window.recaptchaVerifierRegister) {
          window.recaptchaVerifierRegister.clear()
          window.recaptchaVerifierRegister = new RecaptchaVerifier(
            auth,
            "recaptcha-register",
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

  // Verify OTP
  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showMessage("Please enter 6-digit OTP", "error")
      return
    }

    setLoading(true)

    try {
      await confirmation.confirm(otp)
      setOtpVerified(true)
      showMessage("OTP verified successfully!", "success")
    } catch (err) {
      console.error("OTP Verification Error:", err)
      setOtpVerified(false)
      showMessage("Invalid OTP. Please try again.", "error")
    } finally {
      setLoading(false)
    }
  }

  // Register
  const handleRegister = async (e) => {
    e.preventDefault()

    if (!otpVerified) {
      showMessage("Please verify OTP before registering", "error")
      return
    }

    if (!emailVerified) {
      showMessage("Please verify email before registering", "error")
      return
    }

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
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, identifier, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        showMessage(data.message || "Registration failed", "error")
        setLoading(false)
        return
      }

      localStorage.setItem("token", data.token)
      showMessage("Registration successful! Redirecting...", "success")
      setTimeout(() => navigate("/dashboard"), 1500)
    } catch (err) {
      console.error("Registration Error:", err)
      showMessage("Registration failed. Please try again.", "error")
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
            Create Account
          </h1>
          <p className="text-gray-600">Join Smart Energy Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div id="recaptcha-register" ref={recaptchaRef}></div>

          <form onSubmit={handleRegister} autoComplete="on">
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              {/* Identifier + OTP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meter ID or Phone Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="identifier"
                    placeholder="EB123456 or 9876543210"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="off"
                    disabled={otpSent}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={timer > 0 || loading || otpVerified}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading && !otpSent ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : timer > 0 ? (
                      `${timer}s`
                    ) : otpSent && !otpVerified ? (
                      "Resend"
                    ) : otpVerified ? (
                      "✓ Done"
                    ) : (
                      "Send OTP"
                    )}
                  </button>
                </div>
              </div>

              {/* OTP Input */}
              {otpSent && !otpVerified && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="one-time-code"
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength="6"
                      autoComplete="one-time-code"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Verified Badge */}
              {otpVerified && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-medium">Phone verified successfully</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={emailVerified}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={sendEmailVerification}
                    disabled={emailVerified || emailVerifying}
                    className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                      emailVerified
                        ? "bg-green-500 text-white cursor-not-allowed"
                        : emailVerifying
                        ? "bg-blue-400 text-white cursor-wait"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {emailVerifying ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : emailVerified ? (
                      "✓ Verified"
                    ) : emailSent ? (
                      "Resend"
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
                {emailSent && !emailVerified && (
                  <p className="text-sm text-blue-600 mt-2">
                    📧 Verification email sent! Please check your inbox and click the link.
                  </p>
                )}
              </div>

              {/* Email Verified Badge */}
              {emailVerified && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-medium">Email verified successfully</span>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="new-password"
                  placeholder="Create password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="new-password-confirm"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              {/* Message */}
              {message && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    messageType === "success"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {messageType === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
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

              {/* Register Button */}
              <button
                type="submit"
                disabled={!otpVerified || !emailVerified || loading}
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registering...
                  </span>
                ) : (
                  "Register"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}