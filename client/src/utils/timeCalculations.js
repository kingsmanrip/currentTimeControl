/**
 * Calculate the total work hours based on start time, end time, and break times
 * Break deduction rules:
 * - Breaks ≤ 30 minutes: No deduction
 * - Breaks 31-60 minutes: 30-minute deduction
 * - Breaks > 60 minutes: Full break time deducted
 * 
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @param {string} breakStart - Break start time in HH:MM format (optional)
 * @param {string} breakEnd - Break end time in HH:MM format (optional)
 * @param {boolean} includeDeduction - Whether to return deduction details (optional)
 * @returns {number|object} - Hours worked or object with hours and deduction details
 */
export const calculateWorkHours = (startTime, endTime, breakStart, breakEnd, includeDeduction = false) => {
  // Convert time strings to Date objects
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  
  // Calculate total time in milliseconds
  let totalMilliseconds = end - start;
  
  // If end time is earlier than start time, add 24 hours (overnight shift)
  if (totalMilliseconds < 0) {
    totalMilliseconds += 24 * 60 * 60 * 1000;
  }
  
  // Calculate break time if provided
  let breakDeduction = 0;
  let deductionInHours = 0;
  
  if (breakStart && breakEnd) {
    const breakStartDate = new Date(`1970-01-01T${breakStart}`);
    const breakEndDate = new Date(`1970-01-01T${breakEnd}`);
    
    let breakMilliseconds = breakEndDate - breakStartDate;
    
    // If break end time is earlier than break start time, add 24 hours
    if (breakMilliseconds < 0) {
      breakMilliseconds += 24 * 60 * 60 * 1000;
    }
    
    // Apply break deduction rules
    const breakMinutes = breakMilliseconds / (60 * 1000);
    
    if (breakMinutes <= 30) {
      // No deduction
      breakDeduction = 0;
      deductionInHours = 0;
    } else if (breakMinutes <= 60) {
      // 30-minute deduction
      breakDeduction = 30 * 60 * 1000;
      deductionInHours = 0.5;
    } else {
      // Full break time deduction
      breakDeduction = breakMilliseconds;
      deductionInHours = parseFloat((breakMilliseconds / (60 * 60 * 1000)).toFixed(2));
    }
  }
  
  // Subtract break deduction from total time
  const netMilliseconds = totalMilliseconds - breakDeduction;
  
  // Convert to hours (with 2 decimal places)
  const hours = parseFloat((netMilliseconds / (60 * 60 * 1000)).toFixed(2));
  
  if (includeDeduction) {
    return {
      hours,
      deduction: deductionInHours,
      breakMinutes: breakStart && breakEnd ? parseFloat(((new Date(`1970-01-01T${breakEnd}`) - new Date(`1970-01-01T${breakStart}`)) / (60 * 1000)).toFixed(0)) : 0
    };
  }
  
  return hours;
};

/**
 * Calculate total pay based on hours worked and hourly rate
 */
export const calculatePay = (hours, hourlyRate) => {
  return parseFloat((hours * hourlyRate).toFixed(2));
};

/**
 * Format time for display (HH:MM AM/PM)
 */
export const formatTime = (timeString) => {
  if (!timeString) return '';
  
  const date = new Date(`1970-01-01T${timeString}`);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format date for display (MM/DD/YYYY)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

/**
 * Convert a date object to YYYY-MM-DD format for input fields
 */
export const toDateInputValue = (date) => {
  const localDate = new Date(date);
  return localDate.toISOString().split('T')[0];
};

/**
 * Get current time in HH:MM format for input fields
 */
export const getCurrentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};
