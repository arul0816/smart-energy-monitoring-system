import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { CheckCircle, XCircle, Loader } from "lucide-react"

export default function RegisterEmailVerificationPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState("verifying")
  const [message, setMessage] = useState("")
  const verificationAttempted = useRef(false)

  useEffect(() => {
    if (verificationAttempted.current) return
    
    const token = searchParams.get("token")
    
    if (!token) {
      setStatus("error")
      setMessage("Invalid verification link")
      return
    }

    verificationAttempted.current = true
    verifyEmail(token)
  }, [searchParams])

  const verifyEmail = async (token) => {
    try {
      const res = await fetch(`http://localhost:5000/api/auth/verify-register-email?token=${token}`)
      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage(data.message)
        
        // Notify parent window (Register page)
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: 'EMAIL_VERIFIED', email: data.email }, 
            window.location.origin
          )
        }
        
        // Close tab after 3 seconds
        setTimeout(() => {
          window.close()
        }, 3000)
      } else {
        setStatus("error")
        setMessage(data.message || "Verification failed")
      }
    } catch (err) {
      console.error("Verification error:", err)
      setStatus("error")
      setMessage("Verification failed. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === "verifying" && (
          <>
            <Loader className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying Email...
            </h2>
            <p className="text-gray-600">Please wait</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-900 mb-2">
              Email Verified Successfully! ✅
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              This window will close automatically...
            </p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Close Window
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => window.close()}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  )
}