const BASE_URL = "http://localhost:5000/api/auth"

// REGISTER API
export const registerUser = async (data) => {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })

  return res.json()
}

// LOGIN API (we’ll use later)
export const loginUser = async (data) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })

  return res.json()
}

export const getProfile = async () => {
  const token = localStorage.getItem("token")

  const res = await fetch("http://localhost:5000/api/user/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return res.json()
}
