import { useState, useEffect } from "react"
import { Edit2, X, CheckCircle } from "lucide-react"
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth"
import { auth } from "../../firebase"
import { updatePhone, sendEmailVerification } from "../../services/api"

export default function PhoneEmailEdit({ profile, onUpdate }) {
  // Phone State
  const [editingPhone, setEditingPhone] = useState(false)
  const [newPhone, setNewPhone] = useState("")
  const [phoneOTP, setPhoneOTP] = useState("")
  const [phoneConfirmation, setPhoneConfirmation] = useState(null)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneTimer, setPhoneTimer] = useState(0)

  // Email State
  const [editingEmail, setEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Listen for email verification from popup
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data?.type === 'EMAIL_VERIFIED') {
        setEditingEmail(false)
        setNewEmail("")
        setEmailSent(false)
        onUpdate()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onUpdate])

  // Poll for email verification status (backup when postMessage doesn't work)
  useEffect(() => {
    if (!emailSent || !newEmail) return

    const pollInterval = setInterval(async () => {
      try {
        // Fetch fresh profile to check if email was updated
        const token = localStorage.getItem("token")
        if (!token) return

        const res = await fetch("http://localhost:5000/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()

        // If email was updated to the new email, verification succeeded
        if (data.email && data.email.toLowerCase() === newEmail.toLowerCase()) {
          setEditingEmail(false)
          setNewEmail("")
          setEmailSent(false)
          clearInterval(pollInterval)
          onUpdate()
        }
      } catch (e) {
        console.error("Profile poll error:", e)
      }
    }, 3000) // Check every 3 seconds

    return () => clearInterval(pollInterval)
  }, [emailSent, newEmail, onUpdate])

  // Phone OTP timer
  useEffect(() => {
    if (phoneTimer === 0) return
    const interval = setInterval(() => setPhoneTimer((t) => t - 1), 1000)
    return () => clearInterval(interval)
  }, [phoneTimer])

  // Cleanup recaptcha on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifierPhone) {
        try {
          window.recaptchaVerifierPhone.clear()
        } catch (e) {
          // ignore
        }
        window.recaptchaVerifierPhone = null
      }
    }
  }, [])

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifierPhone) {
      window.recaptchaVerifierPhone = new RecaptchaVerifier(
        auth,
        "recaptcha-phone",
        { size: "invisible" }
      )
    }
  }

  const formatPhoneInput = (value) => {
    // Remove non-digit characters except +
    value = value.replace(/[^\d+]/g, "")
    
    // Auto-add +91 prefix
    if (value && !value.startsWith("+")) {
      if (value.startsWith("91") && value.length > 2) {
        value = "+" + value
      } else {
        value = "+91" + value.replace(/^0+/, "")
      }
    }
    
    // Limit length
    if (value.length > 13) {
      value = value.slice(0, 13)
    }
    
    return value
  }

  const handleSendPhoneOTP = async () => {
    if (!newPhone || !newPhone.startsWith("+91") || newPhone.length !== 13) {
      alert("Please enter a valid 10-digit phone number")
      return
    }

    // Check if same as current phone
    if (newPhone === profile?.phone) {
      alert("This is already your current phone number")
      return
    }

    setPhoneLoading(true)
    try {
      setupRecaptcha()
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        newPhone,
        window.recaptchaVerifierPhone
      )
      setPhoneConfirmation(confirmationResult)
      setPhoneTimer(60)
      alert("OTP sent to " + newPhone)
    } catch (err) {
      console.error("Phone OTP Error:", err)
      alert("Failed to send OTP. Please try again.")
      // Reset recaptcha on error
      if (window.recaptchaVerifierPhone) {
        try {
          window.recaptchaVerifierPhone.clear()
        } catch (e) {}
        window.recaptchaVerifierPhone = null
      }
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleVerifyPhoneOTP = async () => {
    if (!phoneOTP || phoneOTP.length !== 6) {
      alert("Please enter 6-digit OTP")
      return
    }

    setPhoneLoading(true)
    try {
      await phoneConfirmation.confirm(phoneOTP)
      // OTP verified, now update in backend (updates both users and eb_consumers)
      const result = await updatePhone(newPhone)
      alert(result.message || "Phone number updated successfully!")
      handleCancelPhone()
      onUpdate()
    } catch (err) {
      console.error("Phone update error:", err)
      alert(err.message || "Invalid OTP or update failed")
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleCancelPhone = () => {
    setEditingPhone(false)
    setNewPhone("")
    setPhoneOTP("")
    setPhoneConfirmation(null)
    setPhoneTimer(0)
  }

  const handleSendEmailVerification = async () => {
    if (!newEmail || !newEmail.includes("@")) {
      alert("Please enter a valid email address")
      return
    }

    // Check if same as current email
    if (newEmail.toLowerCase() === profile?.email?.toLowerCase()) {
      alert("This is already your current email address")
      return
    }

    setEmailLoading(true)
    try {
      const result = await sendEmailVerification(newEmail)
      alert(result.message || "Verification email sent! Please check your inbox.")
      setEmailSent(true)
    } catch (err) {
      console.error("Email verification error:", err)
      alert(err.message || "Failed to send verification email")
    } finally {
      setEmailLoading(false)
    }
  }

  const handleCancelEmail = () => {
    setEditingEmail(false)
    setNewEmail("")
    setEmailSent(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div id="recaptcha-phone"></div>
      
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Contact Information
      </h2>

      <div className="space-y-6">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          {!editingEmail ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-900">{profile?.email}</span>
              <button
                onClick={() => setEditingEmail(true)}
                className="text-blue-600 hover:text-blue-700 p-1"
                title="Edit email"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email"
                disabled={emailSent}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              />
              {emailSent ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">Verification email sent!</span>
                  </div>
                  <p className="text-green-700 text-sm">
                    Please check your inbox at <strong>{newEmail}</strong> and click the verification link.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleSendEmailVerification}
                      disabled={emailLoading}
                      className="text-sm text-blue-600 underline disabled:opacity-50"
                    >
                      Resend email
                    </button>
                    <button
                      onClick={handleCancelEmail}
                      className="text-sm text-gray-600 underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSendEmailVerification}
                    disabled={emailLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {emailLoading ? "Sending..." : "Send Verification Email"}
                  </button>
                  <button
                    onClick={handleCancelEmail}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          {!editingPhone ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-900">{profile?.phone}</span>
              <button
                onClick={() => setEditingPhone(true)}
                className="text-blue-600 hover:text-blue-700 p-1"
                title="Edit phone"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(formatPhoneInput(e.target.value))}
                placeholder="+91XXXXXXXXXX"
                disabled={phoneConfirmation !== null}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              />
              {!phoneConfirmation ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSendPhoneOTP}
                    disabled={phoneLoading || phoneTimer > 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {phoneLoading ? "Sending..." : phoneTimer > 0 ? `Resend in ${phoneTimer}s` : "Send OTP"}
                  </button>
                  <button
                    onClick={handleCancelPhone}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={phoneOTP}
                    onChange={(e) => setPhoneOTP(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength="6"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-xl tracking-widest"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleVerifyPhoneOTP}
                      disabled={phoneLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {phoneLoading ? "Verifying..." : "Verify & Update"}
                    </button>
                    <button
                      onClick={handleCancelPhone}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {phoneTimer > 0 && (
                    <p className="text-sm text-gray-500 text-center">
                      Resend OTP in {phoneTimer}s
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Meter ID (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meter ID
          </label>
          <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
            <span className="text-gray-700 font-medium">{profile?.meter_id}</span>
            <span className="ml-2 text-xs text-gray-400">(Cannot be changed)</span>
          </div>
        </div>

        {/* Consumer Type (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Consumer Type
          </label>
          <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
            <span className="text-gray-700 font-medium">{profile?.consumer_type}</span>
            <span className="ml-2 text-xs text-gray-400">(Cannot be changed)</span>
          </div>
        </div>
      </div>
    </div>
  )
}