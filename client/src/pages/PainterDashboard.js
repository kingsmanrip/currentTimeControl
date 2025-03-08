import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { timesheetService } from '../services/api';
import { calculateWorkHours, formatTime, formatDate, toDateInputValue, getCurrentTime } from '../utils/timeCalculations';

const PainterDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [summaryStats, setSummaryStats] = useState({
    today: { hours: 0, count: 0 },
    thisWeek: { hours: 0, count: 0 },
    thisMonth: { hours: 0, count: 0 }
  });
  
  // Form state
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [startTime, setStartTime] = useState(getCurrentTime());
  const [endTime, setEndTime] = useState(getCurrentTime());
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  const [locations, setLocations] = useState(['']);
  const [notes, setNotes] = useState('');
  const [calculatedHours, setCalculatedHours] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [breakDeduction, setBreakDeduction] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  useEffect(() => {
    fetchTimesheets();
  }, []);
  
  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  useEffect(() => {
    // Calculate hours whenever time inputs change
    if (startTime && endTime) {
      const { hours, deduction } = calculateWorkHours(startTime, endTime, breakStart, breakEnd, true);
      setCalculatedHours(hours);
      setBreakDeduction(deduction);
    }
  }, [startTime, endTime, breakStart, breakEnd]);
  
  const fetchTimesheets = () => {
    setLoading(true);
    timesheetService.getByUser(currentUser.id)
      .then(response => {
        const timesheetData = response.data;
        setTimesheets(timesheetData);
        calculateSummaryStats(timesheetData);
      })
      .catch(err => {
        setError('Failed to load timesheets');
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  const calculateSummaryStats = (timesheetData) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get start of week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
    
    // Get start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    
    const stats = {
      today: { hours: 0, count: 0 },
      thisWeek: { hours: 0, count: 0 },
      thisMonth: { hours: 0, count: 0 }
    };
    
    timesheetData.forEach(timesheet => {
      const { hours } = calculateWorkHours(
        timesheet.startTime,
        timesheet.endTime,
        timesheet.breakStart,
        timesheet.breakEnd,
        true
      );
      
      // Today
      if (timesheet.date === todayStr) {
        stats.today.hours += hours;
        stats.today.count++;
      }
      
      // This week
      if (timesheet.date >= startOfWeekStr) {
        stats.thisWeek.hours += hours;
        stats.thisWeek.count++;
      }
      
      // This month
      if (timesheet.date >= startOfMonthStr) {
        stats.thisMonth.hours += hours;
        stats.thisMonth.count++;
      }
    });
    
    setSummaryStats(stats);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Filter out empty locations
    const filteredLocations = locations.filter(loc => loc.trim() !== '');
    
    if (!date || !startTime || !endTime || filteredLocations.length === 0) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Show confirmation dialog
    setShowConfirmation(true);
  };
  
  const confirmSubmit = () => {
    // Hide confirmation dialog
    setShowConfirmation(false);
    
    // Filter out empty locations
    const filteredLocations = locations.filter(loc => loc.trim() !== '');
    
    setSubmitting(true);
    setError('');
    
    const timesheetData = {
      userId: currentUser.id,
      date,
      startTime,
      endTime,
      breakStart: breakStart || null,
      breakEnd: breakEnd || null,
      location: JSON.stringify(filteredLocations),
      notes: notes || null
    };
    
    const savePromise = editingTimesheet
      ? timesheetService.update(editingTimesheet.id, timesheetData)
      : timesheetService.create(timesheetData);
    
    savePromise
      .then(() => {
        // Show success message
        setSuccessMessage(editingTimesheet 
          ? 'Timesheet updated successfully!' 
          : 'Timesheet submitted successfully!');
        
        // Reset form
        resetForm();
        
        // Refresh timesheets
        fetchTimesheets();
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to submit timesheet');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };
  
  const resetForm = () => {
    setDate(toDateInputValue(new Date()));
    setStartTime(getCurrentTime());
    setEndTime(getCurrentTime());
    setBreakStart('');
    setBreakEnd('');
    setLocations(['']);
    setNotes('');
    setBreakDeduction(0);
    setEditingTimesheet(null);
  };
  
  const handleEditTimesheet = (timesheet) => {
    setEditingTimesheet(timesheet);
    
    // Parse the location from JSON string to array
    let locationArray = [''];
    try {
      const parsedLocations = JSON.parse(timesheet.location);
      locationArray = Array.isArray(parsedLocations) ? parsedLocations : [timesheet.location];
    } catch (e) {
      locationArray = [timesheet.location];
    }
    
    // Set form values
    setDate(timesheet.date);
    setStartTime(timesheet.startTime);
    setEndTime(timesheet.endTime);
    setBreakStart(timesheet.breakStart || '');
    setBreakEnd(timesheet.breakEnd || '');
    setLocations(locationArray);
    setNotes(timesheet.notes || '');
    
    // Scroll to form
    document.getElementById('timesheet-form').scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const handleDeleteTimesheet = async (timesheetId) => {
    if (window.confirm('Are you sure you want to delete this timesheet entry?')) {
      try {
        await timesheetService.delete(timesheetId);
        // Refresh the timesheets list
        fetchTimesheets();
      } catch (err) {
        setError('Failed to delete timesheet');
        console.error(err);
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Painter Dashboard</h1>
          <div className="flex items-center">
            <span className="mr-4">Welcome, {currentUser?.username}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timesheet Form */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingTimesheet ? 'Edit Timesheet' : 'Submit Timesheet'}
              </h2>
              
              {/* Summary Stats */}
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Your Hours Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-indigo-600">{summaryStats.today.hours.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Hours Today</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-indigo-600">{summaryStats.thisWeek.hours.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Hours This Week</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-indigo-600">{summaryStats.thisMonth.hours.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Hours This Month</div>
                  </div>
                </div>
              </div>
              
              {successMessage && (
                <div className="mb-4 text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
                  {successMessage}
                </div>
              )}
              
              {error && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                  {error}
                </div>
              )}
              
              <form id="timesheet-form" onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Break Time (optional)
                    </label>
                    <div className="text-xs text-blue-600 font-medium">
                      Break Deduction Rules:
                      <span className="ml-1 text-gray-600 font-normal">≤30min: No deduction, 31-60min: 30min deducted, {'>'}60min: Full deduction</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="time"
                        value={breakStart}
                        onChange={(e) => setBreakStart(e.target.value)}
                        className="form-input"
                        placeholder="Start time"
                      />
                    </div>
                    <div>
                      <input
                        type="time"
                        value={breakEnd}
                        onChange={(e) => setBreakEnd(e.target.value)}
                        className="form-input"
                        placeholder="End time"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Locations *
                  </label>
                  {locations.map((location, index) => (
                    <div key={index} className="flex mb-2">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => {
                          const newLocations = [...locations];
                          newLocations[index] = e.target.value;
                          setLocations(newLocations);
                        }}
                        required={index === 0}
                        className="form-input flex-grow"
                        placeholder={`Work location ${index + 1}`}
                      />
                      <div className="flex ml-2">
                        {locations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newLocations = [...locations];
                              newLocations.splice(index, 1);
                              setLocations(newLocations);
                            }}
                            className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setLocations([...locations, ''])}
                    className="mt-2 px-3 py-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 text-sm"
                  >
                    + Add Another Location
                  </button>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="form-input"
                    rows="3"
                    placeholder="Any additional notes"
                  ></textarea>
                </div>
                
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm font-medium text-gray-700">
                    Calculated Hours: <span className="font-bold">{calculatedHours}</span>
                  </div>
                  {breakStart && breakEnd && (
                    <div className="text-xs text-gray-500 mt-1">
                      Break time: {formatTime(breakStart)} - {formatTime(breakEnd)}
                      {breakDeduction > 0 && (
                        <span className="ml-2 text-red-500 font-medium">
                          ({breakDeduction === 0.5 ? '30 minutes' : breakDeduction + ' hours'} deducted)
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {editingTimesheet && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 btn btn-secondary"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 btn btn-primary"
                  >
                    {submitting ? 'Submitting...' : (editingTimesheet ? 'Update Timesheet' : 'Submit Timesheet')}
                  </button>
                </div>
              </form>
              
              {/* Confirmation Modal */}
              {showConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                    <h3 className="text-lg font-medium mb-4">Confirm Timesheet Submission</h3>
                    <p className="mb-4">Please review your timesheet details:</p>
                    <div className="mb-4 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="font-medium">Date:</div>
                        <div>{formatDate(date)}</div>
                        <div className="font-medium">Time:</div>
                        <div>{formatTime(startTime)} - {formatTime(endTime)}</div>
                        <div className="font-medium">Break:</div>
                        <div>
                          {breakStart && breakEnd 
                            ? `${formatTime(breakStart)} - ${formatTime(breakEnd)}` 
                            : 'No break'}
                        </div>
                        <div className="font-medium">Hours:</div>
                        <div>{calculatedHours.toFixed(2)}</div>
                        <div className="font-medium">Location(s):</div>
                        <div>{locations.filter(loc => loc.trim() !== '').join(', ')}</div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowConfirmation(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmSubmit}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Recent Timesheets */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Timesheets</h2>
            
              {loading ? (
                <p>Loading timesheets...</p>
              ) : timesheets.length === 0 ? (
                <p className="text-gray-500">No timesheets submitted yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {timesheets.slice(0, 5).map((timesheet) => (
                        <tr key={timesheet.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(timesheet.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTime(timesheet.startTime)} - {formatTime(timesheet.endTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {calculateWorkHours(
                              timesheet.startTime,
                              timesheet.endTime,
                              timesheet.breakStart,
                              timesheet.breakEnd
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(() => {
                              try {
                                const locations = JSON.parse(timesheet.location);
                                return Array.isArray(locations) ? locations.join(', ') : timesheet.location;
                              } catch (e) {
                                return timesheet.location;
                              }
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => handleEditTimesheet(timesheet)}
                              className="text-indigo-600 hover:text-indigo-900 mr-2"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTimesheet(timesheet.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PainterDashboard;
