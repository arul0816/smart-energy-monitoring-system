import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getProfile } from "../services/api"
import { ArrowLeft, LogOut, AlertCircle } from "lucide-react"
import PersonalInfoSection from "../components/Profile/PersonalInfoSection"
import AddressInfoSection from "../components/Profile/AddressInfoSection"
import PhoneEmailEdit from "../components/Profile/PhoneEmailEdit"

export default function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  // Listen for email verification success from popup window
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data?.type === 'EMAIL_VERIFIED') {
        console.log("✅ Email verified, refreshing profile...")
        fetchProfile()
      }
    }

    window.addEventListener('message', handleMessage)
    
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const data = await getProfile()
      setProfile(data)
    } catch (err) {
      console.error("Profile fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token")
      navigate("/login", { replace: true })
    }
  }

  const getInitials = (name) => {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0]
    }
    return name.substring(0, 2)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Avatar & Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4">
              {getInitials(profile?.name)}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {profile?.name}
            </h2>
            <p className="text-gray-600">{profile?.email}</p>
          </div>
        </div>

        {/* Profile Completion Alert */}
        {!profile?.profile_completed && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">Complete Your Profile</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Please fill in all required information below to complete your profile.
              </p>
            </div>
          </div>
        )}

        {/* Phone/Email Edit Section */}
        <div className="mb-6">
          <PhoneEmailEdit profile={profile} onUpdate={fetchProfile} />
        </div>

        {/* Personal Info Section */}
        <div className="mb-6">
          <PersonalInfoSection profile={profile} onUpdate={fetchProfile} />
        </div>

        {/* Address Info Section */}
        <div className="mb-6">
          <AddressInfoSection profile={profile} onUpdate={fetchProfile} />
        </div>

        {/* Logout Button */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  )
}