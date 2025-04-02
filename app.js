const express = require("express")
const path = require("path")
const mysql = require("mysql2/promise")
const session = require("express-session")
const bcrypt = require("bcrypt")
const methodOverride = require("method-override")
const flash = require("connect-flash")

// Create Express app
const app = express()
const PORT = process.env.PORT || 3000

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Prajwal@223",
  database: process.env.DB_NAME || "trading_platform",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Middleware
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.static(path.join(__dirname, "public")))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(methodOverride("_method"))

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "trading_platform_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
)

// Flash messages
app.use(flash())

// Global variables middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user || null
  res.locals.success_msg = req.flash("success_msg")
  res.locals.error_msg = req.flash("error_msg")
  next()
})

// Routes
const authRoutes = require("./routes/auth")
const stockRoutes = require("./routes/stocks")
const portfolioRoutes = require("./routes/portfolio")
const walletRoutes = require("./routes/wallet")
const transactionRoutes = require("./routes/transactions")
const profileRoutes = require("./routes/profile")

app.use("/auth", authRoutes)
app.use("/stocks", stockRoutes)
app.use("/portfolio", portfolioRoutes)
app.use("/wallet", walletRoutes)
app.use("/transactions", transactionRoutes)
app.use("/profile", profileRoutes)

// Home route
app.get("/", (req, res) => {
  res.render("index", {
    title: "TradePro - Stock Trading Platform",
    user: req.session.user,
  })
})

// Dashboard route (protected)
app.get("/dashboard", async (req, res) => {
  if (!req.session.user) {
    req.flash("error_msg", "Please log in to access the dashboard")
    return res.redirect("/auth/login")
  }

  try {
    // Get stocks data
    const [stocks] = await pool.query("SELECT * FROM stocks LIMIT 3")

    // Get user portfolio
    const [holdings] = await pool.query(
      "SELECT h.*, s.name, s.price, s.change, s.change_percent FROM holdings h " +
      "JOIN stocks s ON h.stock_id = s.id " +
      "WHERE h.user_id = ? LIMIT 3",
      [req.session.user.id],
    )

    res.render("dashboard", {
      title: "Dashboard - TradePro",
      user: req.session.user,
      stocks,
      holdings,
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    req.flash("error_msg", "Error loading dashboard data")
    res.redirect("/")
  }
})

// 404 route
app.use((req, res) => {
  res.status(404).render("404", {
    title: "Page Not Found",
    user: req.session.user,
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).render("error", {
    title: "Server Error",
    user: req.session.user,
    error: process.env.NODE_ENV === "production" ? "An error occurred" : err.message,
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app

