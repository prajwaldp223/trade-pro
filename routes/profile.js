const express = require("express")
const router = express.Router()
const mysql = require("mysql2/promise")
const bcrypt = require("bcrypt")
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

// Profile page
router.get("/", isAuthenticated, (req, res) => {
  res.render("profile/index", {
    title: "Profile - TradePro",
    user: req.session.user,
  })
})

// Update profile
router.post(
  "/",
  [
    isAuthenticated,
    body("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
    body("email").isEmail().withMessage("Please enter a valid email"),
  ],
  async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.render("profile/index", {
        title: "Profile - TradePro",
        user: req.session.user,
        errors: errors.array(),
      })
    }

    try {
      // Check if email is already taken by another user
      const [existingUsers] = await pool.query("SELECT * FROM users WHERE email = ? AND id != ?", [
        req.body.email,
        req.session.user.id,
      ])

      if (existingUsers.length > 0) {
        return res.render("profile/index", {
          title: "Profile - TradePro",
          user: req.session.user,
          error_msg: "Email is already in use by another account",
        })
      }

      // Update user
      await pool.query("UPDATE users SET username = ?, email = ? WHERE id = ?", [
        req.body.username,
        req.body.email,
        req.session.user.id,
      ])

      // Update session
      req.session.user.username = req.body.username
      req.session.user.email = req.body.email

      req.flash("success_msg", "Profile updated successfully")
      res.redirect("/profile")
    } catch (error) {
      console.error("Error updating profile:", error)
      req.flash("error_msg", "An error occurred while updating your profile")
      res.redirect("/profile")
    }
  },
)

// Change password
router.post(
  "/change-password",
  [
    isAuthenticated,
    body("current_password").notEmpty().withMessage("Current password is required"),
    body("new_password").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
    body("confirm_password").custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error("Passwords do not match")
      }
      return true
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.render("profile/index", {
        title: "Profile - TradePro",
        user: req.session.user,
        passwordErrors: errors.array(),
      })
    }

    try {
      // Get user with password
      const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [req.session.user.id])

      if (users.length === 0) {
        req.flash("error_msg", "User not found")
        return res.redirect("/profile")
      }

      const user = users[0]

      // Check current password
      const isMatch = await bcrypt.compare(req.body.current_password, user.password)

      if (!isMatch) {
        return res.render("profile/index", {
          title: "Profile - TradePro",
          user: req.session.user,
          password_error: "Current password is incorrect",
        })
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(req.body.new_password, salt)

      // Update password
      await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.session.user.id])

      req.flash("success_msg", "Password changed successfully")
      res.redirect("/profile")
    } catch (error) {
      console.error("Error changing password:", error)
      req.flash("error_msg", "An error occurred while changing your password")
      res.redirect("/profile")
    }
  },
)

module.exports = router

