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

// Get user portfolio
router.get("/", isAuthenticated, async (req, res) => {
  try {
    // Get user holdings with stock details
    const [holdings] = await pool.query(
      "SELECT h.*, s.name, s.price, s.change, s.change_percent FROM holdings h " +
        "JOIN stocks s ON h.stock_id = s.id " +
        "WHERE h.user_id = ?",
      [req.session.user.id],
    )

    // Calculate portfolio summary
    let totalValue = 0
    let totalCost = 0

    const holdingsWithStats = holdings.map((holding) => {
      const currentValue = holding.price * holding.quantity
      const cost = holding.avg_price * holding.quantity
      const profit = currentValue - cost
      const profitPercent = cost > 0 ? (profit / cost) * 100 : 0

      totalValue += currentValue
      totalCost += cost

      return {
        ...holding,
        currentValue,
        profit,
        profitPercent,
      }
    })

    const totalProfit = totalValue - totalCost
    const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

    const summary = {
      totalValue,
      totalCost,
      totalProfit,
      totalProfitPercent,
    }

    res.render("portfolio/index", {
      title: "Portfolio - TradePro",
      holdings: holdingsWithStats,
      summary,
      user: req.session.user,
    })
  } catch (error) {
    console.error("Error fetching portfolio:", error)
    req.flash("error_msg", "Error loading portfolio data")
    res.redirect("/dashboard")
  }
})

module.exports = router

