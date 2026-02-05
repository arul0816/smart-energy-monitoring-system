import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import { loginUser } from "../../services/api"
import { Zap, Lock, Mail, Phone, AlertCircle, Eye, EyeOff } from "lucide-react"

export default function Login() {
  const [inputType, setInputType] = useState("email") // "email" or "phone"
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    // Validate input based on type
    if (inputType === "email") {
      if (!identifier.includes("@")) {
        setMessage("Please enter a valid email address")
        setLoading(false)
        return
      }
    } else if (inputType === "phone") {
      if (!identifier.startsWith("+91") || identifier.length < 13) {
        setMessage("Please enter a valid phone number (+91XXXXXXXXXX)")
        setLoading(false)
        return
      }
    }

    try {
      const res = await loginUser({ identifier, password })

      if (res.token) {
        localStorage.setItem("token", res.token)
        navigate("/dashboard", { replace: true })
      } else {
        setMessage(res.message || "Login failed")
      }
    } catch (err) {
      setMessage("Invalid credentials")
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Smart Energy System
          </h1>
          <p className="text-gray-600">
            Monitor & Optimize Your Energy Consumption
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Sign In
          </h2>

          <form onSubmit={handleSubmit} autoComplete="on">
            <div className="space-y-5">
              {/* Toggle Between Email and Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Login Method
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

              {/* Email/Phone Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {inputType === "email" ? "Email Address" : "Phone Number"}
                </label>
                <div className="relative">
                  {inputType === "email" ? (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  ) : (
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  )}
                  <input
                    type="text"
                    name="identifier"
                    value={identifier}
                    onChange={handleInputChange}
                    autoComplete={inputType === "email" ? "email" : "tel"}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder={
                      inputType === "email"
                        ? "Enter your email address"
                        : "Enter your phone number (+91XXXXXXXXXX)"
                    }
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Error Message */}
              {message && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-600">{message}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Register Now
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Track your energy usage • Reduce bills • Go green</p>
        </div>
      </div>
    </div>
  )
}