import { useState, useEffect } from "react"
import { Edit2, Save, X } from "lucide-react"
import { updateGeneralInfo } from "../../services/api"

export default function PersonalInfoSection({ profile, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    date_of_birth: "",
    gender: "",
    alternate_phone: ""
  })

  // Format date helper
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return ""
    // Convert ISO or any date string to YYYY-MM-DD
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ""
    return date.toISOString().split('T')[0]
  }

  // Sync with profile whenever it changes
  useEffect(() => {
    if (profile) {
      console.log("📝 Syncing personal info from profile:", profile)
      setFormData({
        name: profile.name || "",
        date_of_birth: formatDateForInput(profile.date_of_birth),
        gender: profile.gender || "",
        alternate_phone: profile.alternate_phone || ""
      })
    }
  }, [profile])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Combine with current profile address data
      const fullData = {
        ...formData,
        address_line1: profile?.address_line1 || "",
        address_line2: profile?.address_line2 || "",
        city: profile?.city || "",
        district: profile?.district || "",
        state: profile?.state || "",
        pincode: profile?.pincode || "",
        country: profile?.country || "India"
      }
      
      console.log("💾 Saving personal info:", fullData)
      
      const result = await updateGeneralInfo(fullData)
      alert(result.message)
      setIsEditing(false)
      onUpdate()
    } catch (err) {
      console.error("Save error:", err)
      alert("Update failed: " + (err.message || "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: profile?.name || "",
      date_of_birth: formatDateForInput(profile?.date_of_birth),
      gender: profile?.gender || "",
      alternate_phone: profile?.alternate_phone || ""
    })
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span className="text-sm font-medium">Edit</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="text-sm font-medium">Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm font-medium">
                {loading ? "Saving..." : "Save"}
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          {isEditing ? (
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-gray-900">{profile?.name || "-"}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Birth
          </label>
          {isEditing ? (
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-gray-900">
              {profile?.date_of_birth ? formatDateForInput(profile.date_of_birth) : "-"}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gender
          </label>
          {isEditing ? (
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Select Gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          ) : (
            <p className="text-gray-900">{profile?.gender || "-"}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alternate Phone
          </label>
          {isEditing ? (
            <input
              type="text"
              name="alternate_phone"
              value={formData.alternate_phone}
              onChange={handleChange}
              placeholder="+91XXXXXXXXXX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-gray-900">{profile?.alternate_phone || "-"}</p>
          )}
        </div>
      </div>
    </div>
  )
}