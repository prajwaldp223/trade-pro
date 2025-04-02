const express = require("express")
const router = express.Router()
const mysql = require("mysql2/promise")

// Get database connection pool from app
const pool = require("../db")

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next()
  }
  req.flash("error_msg", "Please log in to access this page")
  res.redirect("/auth/login")
}

// Get user transactions
router.get("/", isAuthenticated, async (req, res) => {
  try {
    // Get all user transactions
    const [transactions] = await pool.query(
      "SELECT t.*, s.name as stock_name FROM transactions t " +
        "LEFT JOIN stocks s ON t.stock_id = s.id " +
        "WHERE t.user_id = ? " +
        "ORDER BY t.transaction_date DESC",
      [req.session.user.id],
    )

    res.render("transactions/index", {
      title: "Transaction History - TradePro",
      transactions,
      user: req.session.user,
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    req.flash("error_msg", "Error loading transaction history")
    res.redirect("/dashboard")
  }
})

module.exports = router

