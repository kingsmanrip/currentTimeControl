const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get('/', authMiddleware, authorize('admin'), (req, res) => {
  req.db.all('SELECT id, username, role, hourlyRate FROM users', [], (err, users) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Server error' });
    }
    
    res.json(users);
  });
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin or own user)
 */
router.get('/:id', authMiddleware, (req, res) => {
  const userId = parseInt(req.params.id);
  
  // Check if user is admin or requesting their own data
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ message: 'Not authorized to access this resource' });
  }
  
  req.db.get(
    'SELECT id, username, role, hourlyRate FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    }
  );
});

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (Admin only)
 */
router.post('/', authMiddleware, authorize('admin'), (req, res) => {
  const { username, password, role, hourlyRate } = req.body;
  
  // Validate input
  if (!username || !password || !role || hourlyRate === undefined) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }
  
  // Validate role
  if (role !== 'admin' && role !== 'painter') {
    return res.status(400).json({ message: 'Role must be either "admin" or "painter"' });
  }
  
  // Validate hourly rate
  if (isNaN(hourlyRate) || hourlyRate < 0) {
    return res.status(400).json({ message: 'Hourly rate must be a positive number' });
  }
  
  try {
    // Check if username already exists
    req.db.get('SELECT * FROM users WHERE username = ?', [username], (err, existingUser) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      // Hash password
      bcrypt.genSalt(10, (err, salt) => {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ message: 'Server error' });
        }
        
        bcrypt.hash(password, salt, (err, hashedPassword) => {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Server error' });
          }
          
          // Insert new user
          req.db.run(
            'INSERT INTO users (username, password, role, hourlyRate) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, role, hourlyRate],
            function(err) {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ message: 'Server error' });
              }
              
              // Return new user data
              req.db.get(
                'SELECT id, username, role, hourlyRate FROM users WHERE id = ?',
                [this.lastID],
                (err, newUser) => {
                  if (err) {
                    console.error(err.message);
                    return res.status(500).json({ message: 'Server error' });
                  }
                  
                  res.status(201).json(newUser);
                }
              );
            }
          );
        });
      });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update a user
 * @access  Private (Admin only)
 */
router.put('/:id', authMiddleware, authorize('admin'), (req, res) => {
  const userId = parseInt(req.params.id);
  const { username, password, role, hourlyRate } = req.body;
  
  // Validate input
  if (!username || !role || hourlyRate === undefined) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }
  
  // Validate role
  if (role !== 'admin' && role !== 'painter') {
    return res.status(400).json({ message: 'Role must be either "admin" or "painter"' });
  }
  
  // Validate hourly rate
  if (isNaN(hourlyRate) || hourlyRate < 0) {
    return res.status(400).json({ message: 'Hourly rate must be a positive number' });
  }
  
  try {
    // Check if user exists
    req.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if username already exists (for another user)
      req.db.get(
        'SELECT * FROM users WHERE username = ? AND id != ?',
        [username, userId],
        (err, existingUser) => {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Server error' });
          }
          
          if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
          }
          
          // Update user
          const updateUser = (hashedPassword = null) => {
            let query, params;
            
            if (hashedPassword) {
              query = `
                UPDATE users
                SET username = ?, password = ?, role = ?, hourlyRate = ?
                WHERE id = ?
              `;
              params = [username, hashedPassword, role, hourlyRate, userId];
            } else {
              query = `
                UPDATE users
                SET username = ?, role = ?, hourlyRate = ?
                WHERE id = ?
              `;
              params = [username, role, hourlyRate, userId];
            }
            
            req.db.run(query, params, function(err) {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ message: 'Server error' });
              }
              
              // Return updated user data
              req.db.get(
                'SELECT id, username, role, hourlyRate FROM users WHERE id = ?',
                [userId],
                (err, updatedUser) => {
                  if (err) {
                    console.error(err.message);
                    return res.status(500).json({ message: 'Server error' });
                  }
                  
                  res.json(updatedUser);
                }
              );
            });
          };
          
          // If password is provided, hash it
          if (password) {
            bcrypt.genSalt(10, (err, salt) => {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ message: 'Server error' });
              }
              
              bcrypt.hash(password, salt, (err, hashedPassword) => {
                if (err) {
                  console.error(err.message);
                  return res.status(500).json({ message: 'Server error' });
                }
                
                updateUser(hashedPassword);
              });
            });
          } else {
            // Update without changing password
            updateUser();
          }
        }
      );
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user
 * @access  Private (Admin only)
 */
router.delete('/:id', authMiddleware, authorize('admin'), (req, res) => {
  const userId = parseInt(req.params.id);
  
  try {
    // Check if user exists
    req.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Prevent deleting the last admin
      if (user.role === 'admin') {
        req.db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (err, result) => {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Server error' });
          }
          
          if (result.count <= 1) {
            return res.status(400).json({ message: 'Cannot delete the last admin user' });
          }
          
          // Delete user
          deleteUser();
        });
      } else {
        // Delete user
        deleteUser();
      }
      
      function deleteUser() {
        req.db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Server error' });
          }
          
          res.json({ message: 'User deleted successfully' });
        });
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
