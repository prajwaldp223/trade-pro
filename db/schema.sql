-- Create database
CREATE DATABASE IF NOT EXISTS trading_platform;
USE trading_platform;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  profile_picture VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stocks table
CREATE TABLE IF NOT EXISTS stocks (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  change DECIMAL(15, 2) NOT NULL,
  change_percent DECIMAL(15, 2) NOT NULL,
  volume BIGINT NOT NULL,
  market_cap BIGINT NOT NULL,
  sector VARCHAR(50) NOT NULL
);

-- Holdings table
CREATE TABLE IF NOT EXISTS holdings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  stock_id VARCHAR(10) NOT NULL,
  quantity INT NOT NULL,
  avg_price DECIMAL(15, 2) NOT NULL,
  total_cost DECIMAL(15, 2) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
  UNIQUE KEY user_stock (user_id, stock_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL') NOT NULL,
  stock_id VARCHAR(10),
  quantity INT,
  price DECIMAL(15, 2),
  total DECIMAL(15, 2),
  amount DECIMAL(15, 2),
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE SET NULL
);

-- Insert sample stocks data
INSERT INTO stocks (id, name, price, change, change_percent, volume, market_cap, sector) VALUES
('AAPL', 'Apple Inc.', 175.43, 2.35, 1.36, 58432100, 2750000000000, 'Technology'),
('MSFT', 'Microsoft Corporation', 338.11, -1.23, -0.36, 22145600, 2520000000000, 'Technology'),
('GOOGL', 'Alphabet Inc.', 131.86, 0.94, 0.72, 19876500, 1680000000000, 'Technology'),
('AMZN', 'Amazon.com Inc.', 127.74, 1.56, 1.24, 35678900, 1310000000000, 'Consumer Cyclical'),
('TSLA', 'Tesla, Inc.', 248.48, -3.78, -1.5, 118765400, 790000000000, 'Automotive'),
('META', 'Meta Platforms, Inc.', 297.74, 4.23, 1.44, 21345600, 765000000000, 'Technology'),
('NFLX', 'Netflix, Inc.', 398.89, 7.65, 1.95, 9876500, 177000000000, 'Entertainment'),
('JPM', 'JPMorgan Chase & Co.', 142.28, -0.87, -0.61, 12345600, 415000000000, 'Financial Services');

