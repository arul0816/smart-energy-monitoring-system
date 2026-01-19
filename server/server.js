const express = require("express")
const cors = require("cors")
require("dotenv").config()

const db = require("./config/db")
const authRoutes = require("./routes/auth.routes")
const userRoutes = require("./routes/user")



const app = express()

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173")
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") {
    return res.sendStatus(200)
  }

  next()
})

app.use(express.json())

app.get("/", (req, res) => {
  res.send("Backend is running")
})

app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)


const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
