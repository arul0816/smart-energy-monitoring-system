import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getProfile } from "../services/api"
import DashboardLayout from "../components/Layout/DashboardLayout"
import { Zap, Wallet, Bell, Target, AlertCircle } from "lucide-react"

export default function DashboardHome() {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const cards = [
    {
      title: "Energy Consumption",
      value: "Coming Soon",
      icon: Zap,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Current Bill",
      value: "Coming Soon",
      icon: Wallet,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Alerts",
      value: "Coming Soon",
      icon: Bell,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Budget Status",
      value: "Coming Soon",
      icon: Target,
      color: "from-teal-500 to-teal-600",
      bgColor: "bg-teal-50"
    }
  ]

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.name}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Here's your energy consumption overview
          </p>
        </div>

        {/* Profile Completion Alert */}
        {!profile?.profile_completed && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">Complete Your Profile</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Please complete your profile information to unlock all features.
              </p>
              <button
                onClick={() => navigate("/profile")}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
              >
                Complete Profile
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, index) => {
            const Icon = card.icon
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
              </div>
            )
          })}
        </div>

        {/* Coming Soon Section */}
        <div className="mt-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl shadow-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">
            Full Dashboard Coming Soon! 🚀
          </h2>
          <p className="text-blue-50">
            We're building amazing features like real-time energy monitoring, 
            detailed analytics, smart billing, and personalized optimization tips.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}