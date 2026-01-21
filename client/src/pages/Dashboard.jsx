import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { getProfile } from "../services/api"
import { Zap, LogOut, User, Phone, Mail, Gauge } from "lucide-react"

export default function Dashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await getProfile()
      setProfile(data)
    } catch (err) {
      console.error("Profile fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    navigate("/login", { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Smart Energy System</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Welcome back, {profile?.name || "User"}! 👋
          </h2>
          <p className="text-gray-600">
            You are successfully logged in to the Smart Energy System.
          </p>
        </div>

        {/* Profile Information */}
        {profile && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Profile Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{profile.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{profile.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Gauge className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Meter ID</p>
                  <p className="font-medium text-gray-900">{profile.meter_id}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coming Soon */}
        <div className="mt-6 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl shadow-xl p-8 text-white">
          <h3 className="text-lg font-semibold mb-2">Energy Monitoring Coming Soon</h3>
          <p className="text-blue-50">
            Track your energy usage, view bills, and optimize consumption.
          </p>
        </div>
      </div>
    </div>
  )
}