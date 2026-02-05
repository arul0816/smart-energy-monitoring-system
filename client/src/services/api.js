const BASE_URL = "http://localhost:5000/api"

/* ======================================================
   AUTH APIs
====================================================== */
export const registerUser = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  return res.json()
}

export const loginUser = async (data) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  return res.json()
}

/* ======================================================
   PROFILE APIs
====================================================== */
export const getProfile = async () => {
  const token = localStorage.getItem("token")
  const res = await fetch(`${BASE_URL}/user/profile`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return res.json()
}

export const updateGeneralInfo = async (data) => {
  const token = localStorage.getItem("token")
  const res = await fetch(`${BASE_URL}/user/profile/general`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })
  return res.json()
}

export const sendPhoneOTP = async (phone) => {
  const token = localStorage.getItem("token")
  const res = await fetch(`${BASE_URL}/user/profile/phone/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ phone })
  })
  return res.json()
}

export const updatePhone = async (phone) => {
  const token = localStorage.getItem("token")
  const res = await fetch(`${BASE_URL}/user/profile/phone`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ phone })
  })
  return res.json()
}

export const sendEmailVerification = async (email) => {
  const token = localStorage.getItem("token")
  const res = await fetch(`${BASE_URL}/user/profile/email/send-verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ email })
  })
  return res.json()
}