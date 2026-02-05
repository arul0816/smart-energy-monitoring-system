const express = require("express")
const cors = require("cors")
require("dotenv").config()

const db = require("./config/db")
const authRoutes = require("./routes/auth.routes")
const userRoutes = require("./routes/user")
const energySimulator = require("./services/energySimulator")

const app = express()

// CORS Configuration
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

// Parse JSON
app.use(express.json())

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "Smart Energy System API is running" })
})

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err)
  res.status(500).json({ message: "Internal server error" })
})

// Start Server
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  
  // Test email configuration
  const emailService = require("./utils/emailService")
  if (emailService.testConfig) {
    emailService.testConfig()
  }
  
  // Start Energy Simulation (1 minute for testing, use 60 for production)
  energySimulator.startAutoSimulation(1)
  console.log("⚡ Energy simulation started (runs every 1 minute)")
})