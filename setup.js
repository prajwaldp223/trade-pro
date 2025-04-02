const mysql = require("mysql2/promise")
const fs = require("fs")
const path = require("path")
const bcrypt = require("bcrypt")

async function setupDatabase() {
  try {
    // Create connection to MySQL server
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "Prajwal@223",
      multipleStatements: true,
    })

    console.log("Connected to MySQL server")

    // Read schema SQL file
    const schemaSQL = fs.readFileSync(path.join(__dirname, "db", "schema.sql"), "utf8")

    // Execute schema SQL
    await connection.query(schemaSQL)
    console.log("Database schema created successfully")

    // Create demo user
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash("password", salt)

    // Check if demo user already exists
    const [existingUsers] = await connection.query("SELECT * FROM trading_platform.users WHERE email = ?", [
      "demo@example.com",
    ])

    if (existingUsers.length === 0) {
      await connection.query(
        "INSERT INTO trading_platform.users (username, email, password, balance) VALUES (?, ?, ?, ?)",
        ["demouser", "demo@example.com", hashedPassword, 10000],
      )
      console.log("Demo user created successfully")
    } else {
      console.log("Demo user already exists")
    }

    // Close connection
    await connection.end()
    console.log("Setup completed successfully")
  } catch (error) {
    console.error("Error setting up database:", error)
    process.exit(1)
  }
}

setupDatabase()

