import { useNavigate } from "react-router-dom"

export default function Dashboard() {
  const navigate = useNavigate()

  const logout = () => {
    localStorage.removeItem("token")
    navigate("/login", { replace: true })
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">
        Dashboard
      </h1>

      <p className="mb-6">
        Welcome! You are logged in.
      </p>

      <button
        onClick={logout}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        Logout
      </button>
    </div>
  )
}
