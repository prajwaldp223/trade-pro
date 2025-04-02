const mysql = require("mysql2/promise")

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Prajwal@223",
  database: process.env.DB_NAME || "trading_platform",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

module.exports = pool

