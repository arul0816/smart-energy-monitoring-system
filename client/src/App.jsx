import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import ForgotPassword from "./pages/ForgotPassword"
import DashboardHome from "./pages/DashboardHome"
import ProfilePage from "./pages/ProfilePage"
import EmailVerificationPage from "./pages/EmailVerificationPage"
import RegisterEmailVerificationPage from "./pages/RegisterEmailVerificationPage"
import ProtectedRoute from "./components/Auth/ProtectedRoute"

export default function App() {
  const token = localStorage.getItem("token")

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={token ? <Navigate to="/dashboard" /> : <RegisterPage />} />
        <Route path="/forgot-password" element={token ? <Navigate to="/dashboard" /> : <ForgotPassword />} />
        
        {/* Email Verification Pages (Public) */}
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="/verify-register-email" element={<RegisterEmailVerificationPage />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}