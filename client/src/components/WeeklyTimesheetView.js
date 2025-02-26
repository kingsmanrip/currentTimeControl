import React, { useState, useEffect } from 'react';
import { timesheetService } from '../services/api';
import { calculateWorkHours, formatTime, formatDate, toDateInputValue } from '../utils/timeCalculations';

const WeeklyTimesheetView = ({ currentUser, onTimesheetSubmitted }) => {
  // Get the current week's dates (Monday to Sunday)
  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate the Monday of this week
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    
    // Generate array of dates for the week
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push({
        date: toDateInputValue(date),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        formattedDate: formatDate(date)
      });
    }
    
    return weekDates;
  };
  
  const [weekDates, setWeekDates] = useState(getWeekDates());
  const [selectedDate, setSelectedDate] = useState(weekDates[0].date);
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state for each day
  const [dailyEntries, setDailyEntries] = useState(
    weekDates.map(day => ({
      date: day.date,
      startTime: '',
      endTime: '',
      breakStart: '',
      breakEnd: '',
      locations: [''],
      notes: '',
      calculatedHours: 0,
      breakDeduction: 0,
      submitted: false
    }))
  );
  
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    fetchTimesheets();
  }, []);
  
  useEffect(() => {
    // Mark days that already have submissions
    if (timesheets.length > 0) {
      const updatedEntries = [...dailyEntries];
      
      timesheets.forEach(timesheet => {
        const entryIndex = updatedEntries.findIndex(entry => entry.date === timesheet.date);
        
        if (entryIndex !== -1) {
          try {
            const locations = JSON.parse(timesheet.location);
            updatedEntries[entryIndex] = {
              ...updatedEntries[entryIndex],
              startTime: timesheet.startTime,
              endTime: timesheet.endTime,
              breakStart: timesheet.breakStart || '',
              breakEnd: timesheet.breakEnd || '',
              locations: Array.isArray(locations) ? locations : [timesheet.location],
              notes: timesheet.notes || '',
              submitted: true
            };
          } catch (e) {
            // Handle old format
            updatedEntries[entryIndex] = {
              ...updatedEntries[entryIndex],
              startTime: timesheet.startTime,
              endTime: timesheet.endTime,
              breakStart: timesheet.breakStart || '',
              breakEnd: timesheet.breakEnd || '',
              locations: [timesheet.location],
              notes: timesheet.notes || '',
              submitted: true
            };
          }
        }
      });
      
      setDailyEntries(updatedEntries);
    }
  }, [timesheets]);
  
  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const response = await timesheetService.getByUser(currentUser.id);
      
      // Filter timesheets to only include the current week
      const weekStart = new Date(weekDates[0].date);
      const weekEnd = new Date(weekDates[6].date);
      weekEnd.setHours(23, 59, 59, 999);
      
      const thisWeekTimesheets = response.data.filter(timesheet => {
        const timesheetDate = new Date(timesheet.date);
        return timesheetDate >= weekStart && timesheetDate <= weekEnd;
      });
      
      setTimesheets(thisWeekTimesheets);
    } catch (err) {
      setError('Failed to load timesheets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (dayIndex, field, value) => {
    const updatedEntries = [...dailyEntries];
    updatedEntries[dayIndex] = {
      ...updatedEntries[dayIndex],
      [field]: value
    };
    
    // Calculate hours if time fields are updated
    if (['startTime', 'endTime', 'breakStart', 'breakEnd'].includes(field)) {
      const entry = updatedEntries[dayIndex];
      if (entry.startTime && entry.endTime) {
        const { hours, deduction } = calculateWorkHours(
          entry.startTime,
          entry.endTime,
          entry.breakStart,
          entry.breakEnd,
          true
        );
        updatedEntries[dayIndex].calculatedHours = hours;
        updatedEntries[dayIndex].breakDeduction = deduction;
      }
    }
    
    setDailyEntries(updatedEntries);
  };
  
  const handleLocationChange = (dayIndex, locationIndex, value) => {
    const updatedEntries = [...dailyEntries];
    const locations = [...updatedEntries[dayIndex].locations];
    locations[locationIndex] = value;
    updatedEntries[dayIndex].locations = locations;
    setDailyEntries(updatedEntries);
  };
  
  const addLocation = (dayIndex) => {
    const updatedEntries = [...dailyEntries];
    updatedEntries[dayIndex].locations.push('');
    setDailyEntries(updatedEntries);
  };
  
  const removeLocation = (dayIndex, locationIndex) => {
    const updatedEntries = [...dailyEntries];
    const locations = [...updatedEntries[dayIndex].locations];
    locations.splice(locationIndex, 1);
    updatedEntries[dayIndex].locations = locations;
    setDailyEntries(updatedEntries);
  };
  
  const handleSubmit = async (dayIndex) => {
    const entry = dailyEntries[dayIndex];
    
    // Filter out empty locations
    const filteredLocations = entry.locations.filter(loc => loc.trim() !== '');
    
    if (!entry.date || !entry.startTime || !entry.endTime || filteredLocations.length === 0) {
      setError('Please fill in all required fields for ' + weekDates[dayIndex].dayName);
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      const timesheetData = {
        userId: currentUser.id,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        breakStart: entry.breakStart || null,
        breakEnd: entry.breakEnd || null,
        location: JSON.stringify(filteredLocations),
        notes: entry.notes || null
      };
      
      await timesheetService.create(timesheetData);
      
      // Mark as submitted
      const updatedEntries = [...dailyEntries];
      updatedEntries[dayIndex].submitted = true;
      setDailyEntries(updatedEntries);
      
      // Refresh timesheets
      fetchTimesheets();
      
      // Notify parent component
      if (onTimesheetSubmitted) {
        onTimesheetSubmitted();
      }
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit timesheet');
    } finally {
      setSubmitting(false);
    }
  };
  
  const copyFromPrevious = (dayIndex) => {
    if (dayIndex === 0) return; // No previous day
    
    const updatedEntries = [...dailyEntries];
    const previousEntry = dailyEntries[dayIndex - 1];
    
    updatedEntries[dayIndex] = {
      ...updatedEntries[dayIndex],
      startTime: previousEntry.startTime,
      endTime: previousEntry.endTime,
      breakStart: previousEntry.breakStart,
      breakEnd: previousEntry.breakEnd,
      locations: [...previousEntry.locations],
      notes: previousEntry.notes
    };
    
    // Recalculate hours
    if (previousEntry.startTime && previousEntry.endTime) {
      const { hours, deduction } = calculateWorkHours(
        previousEntry.startTime,
        previousEntry.endTime,
        previousEntry.breakStart,
        previousEntry.breakEnd,
        true
      );
      updatedEntries[dayIndex].calculatedHours = hours;
      updatedEntries[dayIndex].breakDeduction = deduction;
    }
    
    setDailyEntries(updatedEntries);
  };
  
  return (
    <div className="bg-white dark:bg-dark-bg-secondary shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-dark-text-primary">Weekly Timesheet</h2>
      
      {error && (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
      
      <div className="mb-4 grid grid-cols-7 gap-2">
        {weekDates.map((day, index) => (
          <div 
            key={day.date} 
            className={`text-center p-2 cursor-pointer rounded 
              ${selectedDate === day.date ? 'bg-indigo-100 dark:bg-indigo-900 font-bold' : ''} 
              ${dailyEntries[index].submitted ? 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800' : ''}
              dark:text-dark-text-primary
            `}
            onClick={() => setSelectedDate(day.date)}
          >
            <div>{day.dayName}</div>
            <div className="text-sm">{day.formattedDate}</div>
            {dailyEntries[index].submitted && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Submitted</div>
            )}
          </div>
        ))}
      </div>
      
      {weekDates.map((day, dayIndex) => {
        const entry = dailyEntries[dayIndex];
        
        // Only show the selected day
        if (day.date !== selectedDate) return null;
        
        return (
          <div key={day.date} className="border dark:border-gray-700 rounded-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium dark:text-dark-text-primary">
                {day.dayName} - {day.formattedDate}
              </h3>
              
              {dayIndex > 0 && !entry.submitted && (
                <button
                  type="button"
                  onClick={() => copyFromPrevious(dayIndex)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Copy from {weekDates[dayIndex - 1].dayName}
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={entry.startTime}
                  onChange={(e) => handleInputChange(dayIndex, 'startTime', e.target.value)}
                  disabled={entry.submitted}
                  required
                  className="form-input dark:bg-dark-bg-tertiary dark:text-dark-text-primary dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  value={entry.endTime}
                  onChange={(e) => handleInputChange(dayIndex, 'endTime', e.target.value)}
                  disabled={entry.submitted}
                  required
                  className="form-input dark:bg-dark-bg-tertiary dark:text-dark-text-primary dark:border-gray-700"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                  Break Time (optional)
                </label>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Break Deduction Rules:
                  <span className="ml-1 text-gray-600 dark:text-gray-400 font-normal">≤30min: No deduction, 31-60min: 30min deducted, {'>'}60min: Full deduction</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="time"
                    value={entry.breakStart}
                    onChange={(e) => handleInputChange(dayIndex, 'breakStart', e.target.value)}
                    disabled={entry.submitted}
                    className="form-input dark:bg-dark-bg-tertiary dark:text-dark-text-primary dark:border-gray-700"
                    placeholder="Start time"
                  />
                </div>
                <div>
                  <input
                    type="time"
                    value={entry.breakEnd}
                    onChange={(e) => handleInputChange(dayIndex, 'breakEnd', e.target.value)}
                    disabled={entry.submitted}
                    className="form-input dark:bg-dark-bg-tertiary dark:text-dark-text-primary dark:border-gray-700"
                    placeholder="End time"
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Locations *
              </label>
              {entry.locations.map((location, locationIndex) => (
                <div key={locationIndex} className="flex mb-2">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => handleLocationChange(dayIndex, locationIndex, e.target.value)}
                    disabled={entry.submitted}
                    required={locationIndex === 0}
                    className="form-input flex-grow dark:bg-dark-bg-tertiary dark:text-dark-text-primary dark:border-gray-700"
                    placeholder={`Work location ${locationIndex + 1}`}
                  />
                  {!entry.submitted && (
                    <div className="flex ml-2">
                      {entry.locations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLocation(dayIndex, locationIndex)}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {!entry.submitted && (
                <button
                  type="button"
                  onClick={() => addLocation(dayIndex)}
                  className="mt-2 px-3 py-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 text-sm dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800"
                >
                  + Add Another Location
                </button>
              )}
            </div>
            
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Notes (optional)
              </label>
              <textarea
                value={entry.notes}
                onChange={(e) => handleInputChange(dayIndex, 'notes', e.target.value)}
                disabled={entry.submitted}
                className="form-input dark:bg-dark-bg-tertiary dark:text-dark-text-primary dark:border-gray-700"
                rows="3"
                placeholder="Any additional notes"
              ></textarea>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-bg-tertiary rounded-md">
              <div className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                Calculated Hours: <span className="font-bold dark:text-dark-text-primary">{entry.calculatedHours}</span>
              </div>
              {entry.breakStart && entry.breakEnd && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Break time: {formatTime(entry.breakStart)} - {formatTime(entry.breakEnd)}
                  {entry.breakDeduction > 0 && (
                    <span className="ml-2 text-red-500 dark:text-red-400 font-medium">
                      ({entry.breakDeduction === 0.5 ? '30 minutes' : entry.breakDeduction + ' hours'} deducted)
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {!entry.submitted ? (
              <button
                type="button"
                onClick={() => handleSubmit(dayIndex)}
                disabled={submitting}
                className="w-full btn btn-primary dark:bg-indigo-700 dark:hover:bg-indigo-800"
              >
                {submitting ? 'Submitting...' : 'Submit Timesheet'}
              </button>
            ) : (
              <div className="text-center text-green-600 dark:text-green-400 font-medium">
                Timesheet submitted for this day
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyTimesheetView;
