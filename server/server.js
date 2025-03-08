const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const timesheetRoutes = require('./routes/timesheets');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Database setup
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        hourlyRate REAL NOT NULL
      )
    `);

    // Create timesheets table
    db.run(`
      CREATE TABLE IF NOT EXISTS timesheets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        date TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        breakStart TEXT,
        breakEnd TEXT,
        location TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `);

    // Check if admin user exists, if not create one
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (err) {
        console.error('Error checking admin user', err.message);
      } else if (!row) {
        // Create default admin user
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync('admin123', salt);
        
        db.run(
          'INSERT INTO users (username, password, role, hourlyRate) VALUES (?, ?, ?, ?)',
          ['admin', hashedPassword, 'admin', 25.00],
          function(err) {
            if (err) {
              console.error('Error creating admin user', err.message);
            } else {
              console.log('Default admin user created');
            }
          }
        );
      }
    });
  });
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3003',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Make database available to routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in environment variables. Server cannot start securely.');
  process.exit(1);
}
app.set('jwt-secret', JWT_SECRET);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/timesheets', timesheetRoutes);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// For any request that doesn't match an API route, send the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = app;
