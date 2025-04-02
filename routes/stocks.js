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

// Get all stocks
router.get("/", async (req, res) => {
  try {
    const [stocks] = await pool.query("SELECT * FROM stocks")

    res.render("stocks/index", {
      title: "Stocks - TradePro",
      stocks,
      user: req.session.user,
    })
  } catch (error) {
    console.error("Error fetching stocks:", error)
    req.flash("error_msg", "Error loading stocks")
    res.redirect("/")
  }
})

// Get single stock
router.get("/:id", async (req, res) => {
  try {
    const [stocks] = await pool.query("SELECT * FROM stocks WHERE id = ?", [req.params.id])

    if (stocks.length === 0) {
      req.flash("error_msg", "Stock not found")
      return res.redirect("/stocks")
    }

    const stock = stocks[0]

    // Get user's holding of this stock if logged in
    let holding = null
    if (req.session.user) {
      const [holdings] = await pool.query("SELECT * FROM holdings WHERE user_id = ? AND stock_id = ?", [
        req.session.user.id,
        req.params.id,
      ])

      if (holdings.length > 0) {
        holding = holdings[0]
      }
    }

    res.render("stocks/show", {
      title: `${stock.name} (${stock.id}) - TradePro`,
      stock,
      holding,
      user: req.session.user,
    })
  } catch (error) {
    console.error("Error fetching stock:", error)
    req.flash("error_msg", "Error loading stock details")
    res.redirect("/stocks")
  }
})

// Buy stock (POST)
router.post("/:id/buy", isAuthenticated, async (req, res) => {
  const { quantity } = req.body
  const stockId = req.params.id

  // Validate quantity
  if (!quantity || quantity <= 0) {
    req.flash("error_msg", "Please enter a valid quantity")
    return res.redirect(`/stocks/${stockId}`)
  }

  try {
    // Start transaction
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // Get stock
      const [stocks] = await connection.query("SELECT * FROM stocks WHERE id = ?", [stockId])

      if (stocks.length === 0) {
        await connection.rollback()
        connection.release()
        req.flash("error_msg", "Stock not found")
        return res.redirect("/stocks")
      }

      const stock = stocks[0]
      const totalCost = stock.price * quantity

      // Check if user has enough balance
      if (req.session.user.balance < totalCost) {
        await connection.rollback()
        connection.release()
        req.flash("error_msg", "Insufficient funds")
        return res.redirect(`/stocks/${stockId}`)
      }

      // Update user balance
      await connection.query("UPDATE users SET balance = balance - ? WHERE id = ?", [totalCost, req.session.user.id])

      // Check if user already has this stock
      const [holdings] = await connection.query("SELECT * FROM holdings WHERE user_id = ? AND stock_id = ?", [
        req.session.user.id,
        stockId,
      ])

      if (holdings.length > 0) {
        // Update existing holding
        const holding = holdings[0]
        const newQuantity = holding.quantity + Number.parseInt(quantity)
        const newTotalCost = holding.total_cost + totalCost
        const newAvgPrice = newTotalCost / newQuantity

        await connection.query("UPDATE holdings SET quantity = ?, avg_price = ?, total_cost = ? WHERE id = ?", [
          newQuantity,
          newAvgPrice,
          newTotalCost,
          holding.id,
        ])
      } else {
        // Create new holding
        await connection.query(
          "INSERT INTO holdings (user_id, stock_id, quantity, avg_price, total_cost) VALUES (?, ?, ?, ?, ?)",
          [req.session.user.id, stockId, quantity, stock.price, totalCost],
        )
      }

      // Create transaction record
      await connection.query(
        "INSERT INTO transactions (user_id, type, stock_id, quantity, price, total, transaction_date) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [req.session.user.id, "BUY", stockId, quantity, stock.price, totalCost],
      )

      // Commit transaction
      await connection.commit()
      connection.release()

      // Update session balance
      req.session.user.balance -= totalCost

      req.flash("success_msg", `Successfully purchased ${quantity} shares of ${stock.name}`)
      res.redirect(`/stocks/${stockId}`)
    } catch (error) {
      await connection.rollback()
      connection.release()
      throw error
    }
  } catch (error) {
    console.error("Error buying stock:", error)
    req.flash("error_msg", "An error occurred while processing your purchase")
    res.redirect(`/stocks/${stockId}`)
  }
})

// Sell stock (POST)
router.post("/:id/sell", isAuthenticated, async (req, res) => {
  const { quantity } = req.body
  const stockId = req.params.id

  // Validate quantity
  if (!quantity || quantity <= 0) {
    req.flash("error_msg", "Please enter a valid quantity")
    return res.redirect(`/stocks/${stockId}`)
  }

  try {
    // Start transaction
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // Get stock
      const [stocks] = await connection.query("SELECT * FROM stocks WHERE id = ?", [stockId])

      if (stocks.length === 0) {
        await connection.rollback()
        connection.release()
        req.flash("error_msg", "Stock not found")
        return res.redirect("/stocks")
      }

      const stock = stocks[0]

      // Check if user has this stock
      const [holdings] = await connection.query("SELECT * FROM holdings WHERE user_id = ? AND stock_id = ?", [
        req.session.user.id,
        stockId,
      ])

      if (holdings.length === 0) {
        await connection.rollback()
        connection.release()
        req.flash("error_msg", "You don't own this stock")
        return res.redirect(`/stocks/${stockId}`)
      }

      const holding = holdings[0]

      // Check if user has enough shares
      if (holding.quantity < quantity) {
        await connection.rollback()
        connection.release()
        req.flash("error_msg", "You don't have enough shares")
        return res.redirect(`/stocks/${stockId}`)
      }

      const totalValue = stock.price * quantity

      // Update user balance
      await connection.query("UPDATE users SET balance = balance + ? WHERE id = ?", [totalValue, req.session.user.id])

      // Update holding
      const newQuantity = holding.quantity - Number.parseInt(quantity)

      if (newQuantity === 0) {
        // Remove holding if no shares left
        await connection.query("DELETE FROM holdings WHERE id = ?", [holding.id])
      } else {
        // Update holding quantity (avg_price stays the same)
        const newTotalCost = holding.avg_price * newQuantity
        await connection.query("UPDATE holdings SET quantity = ?, total_cost = ? WHERE id = ?", [
          newQuantity,
          newTotalCost,
          holding.id,
        ])
      }

      // Create transaction record
      await connection.query(
        "INSERT INTO transactions (user_id, type, stock_id, quantity, price, total, transaction_date) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [req.session.user.id, "SELL", stockId, quantity, stock.price, totalValue],
      )

      // Commit transaction
      await connection.commit()
      connection.release()

      // Update session balance
      req.session.user.balance += totalValue

      req.flash("success_msg", `Successfully sold ${quantity} shares of ${stock.name}`)
      res.redirect(`/stocks/${stockId}`)
    } catch (error) {
      await connection.rollback()
      connection.release()
      throw error
    }
  } catch (error) {
    console.error("Error selling stock:", error)
    req.flash("error_msg", "An error occurred while processing your sale")
    res.redirect(`/stocks/${stockId}`)
  }
})

// Refresh stock prices (for demo purposes)
router.post("/refresh", async (req, res) => {
  try {
    // Get current stocks
    const [stocks] = await pool.query("SELECT * FROM stocks");

    // Update stock prices with random changes
    for (const stock of stocks) {
      // Ensure price is a number
      const currentPrice = parseFloat(stock.price);
      const changePercent = (Math.random() * 4 - 2); // Random change between -2% and 2%
      const change = (currentPrice * changePercent) / 100;
      const newPrice = Math.max(0.01, currentPrice + change); // Ensure price doesn't go negative

      console.log(`Updating ${stock.id}: New price = ${newPrice.toFixed(2)}, Change = ${change.toFixed(2)}, Change % = ${changePercent.toFixed(2)}`);

      // Update the stock in the database
      await pool.query(
        "UPDATE stocks SET price = ?, `change` = ?, change_percent = ? WHERE id = ?",
        [
          newPrice,  // Don't convert to string with toFixed
          change,    // Don't convert to string with toFixed
          changePercent,  // Don't convert to string with toFixed
          stock.id
        ]
      );
    }

    req.flash("success_msg", "Stock prices refreshed");
    res.redirect("/stocks");
  } catch (error) {
    console.error("Error refreshing stocks:", error);
    req.flash("error_msg", "Error refreshing stock prices");
    res.redirect("/stocks");
  }
});

module.exports = router

