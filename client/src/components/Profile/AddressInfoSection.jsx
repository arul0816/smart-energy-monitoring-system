import { useState, useEffect } from "react"
import { Edit2, Save, X } from "lucide-react"
import { updateGeneralInfo } from "../../services/api"

export default function AddressInfoSection({ profile, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    address_line1: "",
    address_line2: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    country: "India"
  })

  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        address_line1: profile.address_line1 || "",
        address_line2: profile.address_line2 || "",
        city: profile.city || "",
        district: profile.district || "",
        state: profile.state || "",
        pincode: profile.pincode || "",
        country: profile.country || "India"
      })
    }
  }, [profile])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Send ALL profile data (including personal info from profile)
      const fullData = {
        name: profile.name || "",
        date_of_birth: profile.date_of_birth || "",
        gender: profile.gender || "",
        alternate_phone: profile.alternate_phone || "",
        ...formData
      }
      
      const result = await updateGeneralInfo(fullData)
      alert(result.message)
      setIsEditing(false)
      onUpdate() // Refresh profile
    } catch (err) {
      alert("Update failed")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      address_line1: profile?.address_line1 || "",
      address_line2: profile?.address_line2 || "",
      city: profile?.city || "",
      district: profile?.district || "",
      state: profile?.state || "",
      pincode: profile?.pincode || "",
      country: profile?.country || "India"
    })
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Address Information</h2>
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
        {/* Address Line 1 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address Line 1
          </label>
          {isEditing ? (
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              placeholder="House/Flat No., Street Name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-gray-900">{profile?.address_line1 || "-"}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address Line 2
          </label>
          {isEditing ? (
            <input
              type="text"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              placeholder="Locality, Landmark"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-gray-900">{profile?.address_line2 || "-"}</p>
          )}
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City
          </label>
          {isEditing ? (
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-gray-900">{profile?.city || "-"}</p>
          )}
        </div>

        {/* District */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            District
          </label>
          {isEditing ? (
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-gray-900">{profile?.district || "-"}</p>
          )}
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State
          </label>
          {isEditing ? (
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-gray-900">{profile?.state || "-"}</p>
          )}
        </div>

        {/* Pincode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pincode
          </label>
          {isEditing ? (
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              maxLength="6"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-gray-900">{profile?.pincode || "-"}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Country
          </label>
          {isEditing ? (
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          ) : (
            <p className="text-gray-900">{profile?.country || "India"}</p>
          )}
        </div>
      </div>
    </div>
  )
}