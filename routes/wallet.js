const express = require("express")
const router = express.Router()
const mysql = require("mysql2/promise")
const { body, validationResult } = require("express-validator")

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

// Wallet page
router.get("/", isAuthenticated, (req, res) => {
  res.render("wallet/index", {
    title: "Wallet - TradePro",
    user: req.session.user,
  })
})

// Deposit funds
router.post(
  "/deposit",
  [isAuthenticated, body("amount").isFloat({ min: 1 }).withMessage("Amount must be greater than zero")],
  async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      req.flash("error_msg", errors.array()[0].msg)
      return res.redirect("/wallet")
    }

    const amount = Number.parseFloat(req.body.amount)

    try {
      // Start transaction
      const connection = await pool.getConnection()
      await connection.beginTransaction()

      try {
        // Update user balance
        await connection.query("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, req.session.user.id])

        // Create transaction record
        await connection.query(
          "INSERT INTO transactions (user_id, type, amount, transaction_date) VALUES (?, ?, ?, NOW())",
          [req.session.user.id, "DEPOSIT", amount],
        )

        // Commit transaction
        await connection.commit()
        connection.release()

        // Update session balance
        req.session.user.balance += amount

        req.flash("success_msg", `Successfully deposited $${amount.toFixed(2)}`)
        res.redirect("/wallet")
      } catch (error) {
        await connection.rollback()
        connection.release()
        throw error
      }
    } catch (error) {
      console.error("Error depositing funds:", error)
      req.flash("error_msg", "An error occurred while processing your deposit")
      res.redirect("/wallet")
    }
  },
)

// Withdraw funds
router.post(
  "/withdraw",
  [isAuthenticated, body("amount").isFloat({ min: 1 }).withMessage("Amount must be greater than zero")],
  async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      req.flash("error_msg", errors.array()[0].msg)
      return res.redirect("/wallet")
    }

    const amount = Number.parseFloat(req.body.amount)

    // Check if user has enough balance
    if (req.session.user.balance < amount) {
      req.flash("error_msg", "Insufficient funds")
      return res.redirect("/wallet")
    }

    try {
      // Start transaction
      const connection = await pool.getConnection()
      await connection.beginTransaction()

      try {
        // Update user balance
        await connection.query("UPDATE users SET balance = balance - ? WHERE id = ?", [amount, req.session.user.id])

        // Create transaction record
        await connection.query(
          "INSERT INTO transactions (user_id, type, amount, transaction_date) VALUES (?, ?, ?, NOW())",
          [req.session.user.id, "WITHDRAWAL", amount],
        )

        // Commit transaction
        await connection.commit()
        connection.release()

        // Update session balance
        req.session.user.balance -= amount

        req.flash("success_msg", `Successfully withdrew $${amount.toFixed(2)}`)
        res.redirect("/wallet")
      } catch (error) {
        await connection.rollback()
        connection.release()
        throw error
      }
    } catch (error) {
      console.error("Error withdrawing funds:", error)
      req.flash("error_msg", "An error occurred while processing your withdrawal")
      res.redirect("/wallet")
    }
  },
)

module.exports = router

