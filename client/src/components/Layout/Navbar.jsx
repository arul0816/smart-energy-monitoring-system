import { useNavigate } from "react-router-dom"
import { Menu, Zap, User } from "lucide-react"

export default function Navbar({ onMenuClick, profile }) {
  const navigate = useNavigate()

  const getInitials = (name) => {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0]
    }
    return name.substring(0, 2)
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Logo + Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 hidden sm:block">
              Smart Energy System
            </span>
          </div>
        </div>

        {/* Right: Profile Icon */}
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(profile?.name)}
          </div>
          <span className="hidden md:block text-sm font-medium text-gray-700">
            {profile?.name || "User"}
          </span>
        </button>
      </div>
    </header>
  )
}