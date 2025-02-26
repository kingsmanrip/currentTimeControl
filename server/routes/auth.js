const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Validate input
  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide username and password' });
  }
  
  try {
    // Check if user exists
    req.db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // Compare password
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ message: 'Server error' });
        }
        
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Create JWT payload
        const payload = {
          id: user.id,
          username: user.username,
          role: user.role
        };
        
        // Sign token
        jwt.sign(
          payload,
          req.app.get('jwt-secret'),
          { expiresIn: '1d' },
          (err, token) => {
            if (err) {
              console.error(err.message);
              return res.status(500).json({ message: 'Server error' });
            }
            
            // Return token and user data
            res.json({
              token,
              user: {
                id: user.id,
                username: user.username,
                role: user.role,
                hourlyRate: user.hourlyRate
              }
            });
          }
        );
      });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
