import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"

export default function ResetPassword() {
  //const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email
  const [resendTimer, setResendTimer] = useState(60)
const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password")
    }
  }, [email, navigate])


  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setMessage("Passwords do not match")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const res = await fetch(
        "http://localhost:5000/api/auth/verify-otp-reset",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp, password })
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message)
      }

      setMessage("Password reset successful")

      setTimeout(() => {
        navigate("/login")
      }, 1500)
    } catch (err) {
      setMessage(err.message || "Reset failed")
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    if (resendTimer === 0) {
      setCanResend(true)
      return
    }

    const timer = setTimeout(() => {
      setResendTimer(resendTimer - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [resendTimer])

const handleResendOtp = async () => {
  setMessage("")
  setLoading(true)

  try {
    const res = await fetch(
      "http://localhost:5000/api/auth/forgot-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }
    )

    const data = await res.json()

    if (!res.ok) throw new Error(data.message)

    setMessage("OTP resent successfully")
    setResendTimer(60)
    setCanResend(false)
  } catch (err) {
    setMessage(err.message || "Failed to resend OTP")
  } finally {
    setLoading(false)
  }
}

const resetPassword = async (e) => {
  console.log("🔥 resetPassword clicked")

  if (password !== confirmPassword) {
    alert("Passwords do not match")
    return
  }

}


  return (
    <div className="flex h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-80 border p-6 rounded"
      >
        <h2 className="text-2xl font-semibold mb-4">
          Reset Password
        </h2>

        <p className="text-sm text-gray-600 mb-4 text-center">
  <br />
  <span className="font-semibold">{email}</span>
</p>


        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full border p-2 rounded mb-3"
          required
        />

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded mb-3"
          required
        />

        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border p-2 rounded mb-3"
          required
        />

        <button
  type="button"
  onClick={resetPassword}
  disabled={loading}
  className="bg-indigo-600 text-white p-3 rounded"
>
  {loading ? "Resetting..." : "Reset Password"}
</button>


        {message && (
          <p className="text-sm mt-4 text-center">{message}</p>
        )}

        <div className="text-center mt-2">
  {canResend ? (
    <button
      type="button"
      onClick={handleResendOtp}
      className="text-indigo-500 underline text-sm"
      disabled={loading}
    >
      Resend OTP
    </button>
  ) : (
    <p className="text-sm text-gray-500">
      Resend OTP in {resendTimer}s
    </p>
  )}
</div>

      </form>
    </div>
  )
}
