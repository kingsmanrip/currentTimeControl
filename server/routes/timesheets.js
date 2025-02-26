const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/timesheets
 * @desc    Get all timesheets (admin) or user's timesheets (painter)
 * @access  Private
 */
router.get('/', authMiddleware, (req, res) => {
  try {
    // Admin can see all timesheets, painters can only see their own
    if (req.user.role === 'admin') {
      req.db.all(
        `SELECT t.*, u.username, u.hourlyRate 
         FROM timesheets t
         JOIN users u ON t.userId = u.id
         ORDER BY t.date DESC, t.startTime DESC`,
        [],
        (err, timesheets) => {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Server error' });
          }
          
          res.json(timesheets);
        }
      );
    } else {
      req.db.all(
        `SELECT t.*, u.username, u.hourlyRate 
         FROM timesheets t
         JOIN users u ON t.userId = u.id
         WHERE t.userId = ?
         ORDER BY t.date DESC, t.startTime DESC`,
        [req.user.id],
        (err, timesheets) => {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Server error' });
          }
          
          res.json(timesheets);
        }
      );
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/timesheets/:id
 * @desc    Get timesheet by ID
 * @access  Private (Admin or owner)
 */
router.get('/:id', authMiddleware, (req, res) => {
  const timesheetId = parseInt(req.params.id);
  
  try {
    req.db.get(
      `SELECT t.*, u.username, u.hourlyRate 
       FROM timesheets t
       JOIN users u ON t.userId = u.id
       WHERE t.id = ?`,
      [timesheetId],
      (err, timesheet) => {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ message: 'Server error' });
        }
        
        if (!timesheet) {
          return res.status(404).json({ message: 'Timesheet not found' });
        }
        
        // Check if user is admin or owner
        if (req.user.role !== 'admin' && req.user.id !== timesheet.userId) {
          return res.status(403).json({ message: 'Not authorized to access this resource' });
        }
        
        res.json(timesheet);
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/timesheets/user/:userId
 * @desc    Get timesheets by user ID
 * @access  Private (Admin or owner)
 */
router.get('/user/:userId', authMiddleware, (req, res) => {
  const userId = parseInt(req.params.userId);
  
  // Check if user is admin or requesting their own data
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ message: 'Not authorized to access this resource' });
  }
  
  try {
    req.db.all(
      `SELECT t.*, u.username, u.hourlyRate 
       FROM timesheets t
       JOIN users u ON t.userId = u.id
       WHERE t.userId = ?
       ORDER BY t.date DESC, t.startTime DESC`,
      [userId],
      (err, timesheets) => {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ message: 'Server error' });
        }
        
        res.json(timesheets);
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/timesheets
 * @desc    Create a new timesheet
 * @access  Private
 */
router.post('/', authMiddleware, (req, res) => {
  const { userId, date, startTime, endTime, breakStart, breakEnd, location, notes } = req.body;
  
  // Validate input
  if (!userId || !date || !startTime || !endTime || !location) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }
  
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  // Validate time format (HH:MM)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return res.status(400).json({ message: 'Invalid time format. Use HH:MM (24-hour)' });
  }
  
  if (breakStart && !timeRegex.test(breakStart)) {
    return res.status(400).json({ message: 'Invalid break start time format. Use HH:MM (24-hour)' });
  }
  
  if (breakEnd && !timeRegex.test(breakEnd)) {
    return res.status(400).json({ message: 'Invalid break end time format. Use HH:MM (24-hour)' });
  }
  
  // Check if user is admin or creating for themselves
  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    return res.status(403).json({ message: 'Not authorized to create timesheets for other users' });
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
      
      // Insert timesheet
      req.db.run(
        `INSERT INTO timesheets 
         (userId, date, startTime, endTime, breakStart, breakEnd, location, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, date, startTime, endTime, breakStart, breakEnd, location, notes],
        function(err) {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Server error' });
          }
          
          // Return new timesheet data
          req.db.get(
            `SELECT t.*, u.username, u.hourlyRate 
             FROM timesheets t
             JOIN users u ON t.userId = u.id
             WHERE t.id = ?`,
            [this.lastID],
            (err, newTimesheet) => {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ message: 'Server error' });
              }
              
              res.status(201).json(newTimesheet);
            }
          );
        }
      );
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/timesheets/:id
 * @desc    Update a timesheet
 * @access  Private (Admin or owner)
 */
router.put('/:id', authMiddleware, (req, res) => {
  const timesheetId = parseInt(req.params.id);
  const { date, startTime, endTime, breakStart, breakEnd, location, notes } = req.body;
  
  // Validate input
  if (!date || !startTime || !endTime || !location) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }
  
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  // Validate time format (HH:MM)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return res.status(400).json({ message: 'Invalid time format. Use HH:MM (24-hour)' });
  }
  
  if (breakStart && !timeRegex.test(breakStart)) {
    return res.status(400).json({ message: 'Invalid break start time format. Use HH:MM (24-hour)' });
  }
  
  if (breakEnd && !timeRegex.test(breakEnd)) {
    return res.status(400).json({ message: 'Invalid break end time format. Use HH:MM (24-hour)' });
  }
  
  try {
    // Check if timesheet exists and if user is authorized to update it
    req.db.get('SELECT * FROM timesheets WHERE id = ?', [timesheetId], (err, timesheet) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!timesheet) {
        return res.status(404).json({ message: 'Timesheet not found' });
      }
      
      // Check if user is admin or owner
      if (req.user.role !== 'admin' && req.user.id !== timesheet.userId) {
        return res.status(403).json({ message: 'Not authorized to update this timesheet' });
      }
      
      // Update timesheet
      req.db.run(
        `UPDATE timesheets 
         SET date = ?, startTime = ?, endTime = ?, breakStart = ?, breakEnd = ?, location = ?, notes = ?
         WHERE id = ?`,
        [date, startTime, endTime, breakStart, breakEnd, location, notes, timesheetId],
        function(err) {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ message: 'Server error' });
          }
          
          // Return updated timesheet data
          req.db.get(
            `SELECT t.*, u.username, u.hourlyRate 
             FROM timesheets t
             JOIN users u ON t.userId = u.id
             WHERE t.id = ?`,
            [timesheetId],
            (err, updatedTimesheet) => {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ message: 'Server error' });
              }
              
              res.json(updatedTimesheet);
            }
          );
        }
      );
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/timesheets/:id
 * @desc    Delete a timesheet
 * @access  Private (Admin or owner)
 */
router.delete('/:id', authMiddleware, (req, res) => {
  const timesheetId = parseInt(req.params.id);
  
  try {
    // Check if timesheet exists and if user is authorized to delete it
    req.db.get('SELECT * FROM timesheets WHERE id = ?', [timesheetId], (err, timesheet) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!timesheet) {
        return res.status(404).json({ message: 'Timesheet not found' });
      }
      
      // Check if user is admin or owner
      if (req.user.role !== 'admin' && req.user.id !== timesheet.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this timesheet' });
      }
      
      // Delete timesheet
      req.db.run('DELETE FROM timesheets WHERE id = ?', [timesheetId], function(err) {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ message: 'Server error' });
        }
        
        res.json({ message: 'Timesheet deleted successfully' });
      });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/timesheets/export
 * @desc    Export timesheets as CSV
 * @access  Private (Admin only)
 */
router.get('/export', authMiddleware, authorize('admin'), (req, res) => {
  try {
    // Build query with optional filters
    let query = `
      SELECT 
        u.username, 
        t.date, 
        t.startTime, 
        t.endTime, 
        t.breakStart, 
        t.breakEnd, 
        t.location, 
        t.notes,
        u.hourlyRate
      FROM timesheets t
      JOIN users u ON t.userId = u.id
    `;
    
    const params = [];
    const conditions = [];
    
    // Apply filters if provided
    if (req.query.userId && req.query.userId !== 'all') {
      conditions.push('t.userId = ?');
      params.push(req.query.userId);
    }
    
    if (req.query.dateFrom) {
      conditions.push('t.date >= ?');
      params.push(req.query.dateFrom);
    }
    
    if (req.query.dateTo) {
      conditions.push('t.date <= ?');
      params.push(req.query.dateTo);
    }
    
    if (req.query.location) {
      conditions.push('t.location LIKE ?');
      params.push(`%${req.query.location}%`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY t.date DESC, u.username';
    
    req.db.all(query, params, (err, timesheets) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Server error' });
      }
      
      // Generate CSV
      const csvHeader = 'Username,Date,Start Time,End Time,Break Start,Break End,Location,Notes,Hourly Rate\n';
      
      const csvRows = timesheets.map(t => {
        return `${t.username},${t.date},${t.startTime},${t.endTime},${t.breakStart || ''},${t.breakEnd || ''},${t.location.replace(/,/g, ';')},${(t.notes || '').replace(/,/g, ';')},${t.hourlyRate}`;
      });
      
      const csv = csvHeader + csvRows.join('\n');
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=timesheets.csv');
      
      res.send(csv);
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
