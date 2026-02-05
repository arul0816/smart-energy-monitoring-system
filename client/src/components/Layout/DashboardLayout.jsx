import { useState, useEffect } from "react"
import { getProfile } from "../../services/api"
import Sidebar from "./Sidebar"
import Navbar from "./Navbar"

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await getProfile()
      setProfile(data)
    } catch (err) {
      console.error("Profile fetch error:", err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <Navbar 
          onMenuClick={() => setSidebarOpen(true)} 
          profile={profile}
        />

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}