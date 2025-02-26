import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { userService, timesheetService } from '../services/api';
import { calculateWorkHours, calculatePay, formatTime, formatDate } from '../utils/timeCalculations';

const AdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('timesheets');
  
  // Timesheet state
  const [timesheets, setTimesheets] = useState([]);
  const [timesheetLoading, setTimesheetLoading] = useState(true);
  const [timesheetError, setTimesheetError] = useState('');
  
  // User state
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState('');
  
  // Filter state
  const [filterUser, setFilterUser] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // User form state
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('painter');
  const [hourlyRate, setHourlyRate] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Timesheet form state
  const [showTimesheetForm, setShowTimesheetForm] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [timesheetDate, setTimesheetDate] = useState('');
  const [timesheetStartTime, setTimesheetStartTime] = useState('');
  const [timesheetEndTime, setTimesheetEndTime] = useState('');
  const [timesheetBreakStart, setTimesheetBreakStart] = useState('');
  const [timesheetBreakEnd, setTimesheetBreakEnd] = useState('');
  const [timesheetLocation, setTimesheetLocation] = useState('');
  const [timesheetUserId, setTimesheetUserId] = useState('');
  const [timesheetFormError, setTimesheetFormError] = useState('');
  
  useEffect(() => {
    fetchTimesheets();
    fetchUsers();
    setLastUpdated(new Date());
  }, []);
  
  // Auto-refresh effect
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchTimesheets();
        fetchUsers();
      }, 60000); // Refresh every minute
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);
  
  const fetchTimesheets = () => {
    setTimesheetLoading(true);
    timesheetService.getAll()
      .then(response => {
        setTimesheets(response.data);
        setLastUpdated(new Date());
      })
      .catch(err => {
        setTimesheetError('Failed to load timesheets');
        console.error(err);
      })
      .finally(() => {
        setTimesheetLoading(false);
      });
  };
  
  const fetchUsers = () => {
    setUserLoading(true);
    userService.getAll()
      .then(response => {
        setUsers(response.data);
        setLastUpdated(new Date());
      })
      .catch(err => {
        setUserError('Failed to load users');
        console.error(err);
      })
      .finally(() => {
        setUserLoading(false);
      });
  };
  
  const clearAllFilters = () => {
    setFilterUser('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterLocation('');
    setSearchQuery('');
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const handleExportTimesheets = () => {
    const filters = {
      userId: filterUser !== 'all' ? filterUser : undefined,
      dateFrom: filterDateFrom || undefined,
      dateTo: filterDateTo || undefined,
      location: filterLocation || undefined
    };
    
    timesheetService.export(filters)
      .then(response => {
        // Create a download link for the CSV file
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'timesheets.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(err => {
        console.error('Failed to export timesheets', err);
        alert('Failed to export timesheets');
      });
  };
  
  const handleUserFormSubmit = (e) => {
    e.preventDefault();
    
    if (!username || !role || !hourlyRate || (!editingUser && !password)) {
      setFormError('Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    setFormError('');
    
    const userData = {
      username,
      role,
      hourlyRate: parseFloat(hourlyRate)
    };
    
    if (password) {
      userData.password = password;
    }
    
    const savePromise = editingUser 
      ? userService.update(editingUser.id, userData)
      : userService.create(userData);
    
    savePromise
      .then(() => {
        // Reset form and refresh users
        resetUserForm();
        fetchUsers();
      })
      .catch(err => {
        setFormError(err.response?.data?.message || 'Failed to save user');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };
  
  const handleEditUser = (user) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword('');
    setRole(user.role);
    setHourlyRate(user.hourlyRate.toString());
    setShowUserForm(true);
  };
  
  const handleDeleteUser = (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    userService.delete(userId)
      .then(() => {
        fetchUsers();
      })
      .catch(err => {
        console.error('Failed to delete user', err);
        alert('Failed to delete user');
      });
  };
  
  const handleEditTimesheet = (timesheet) => {
    setEditingTimesheet(timesheet);
    setTimesheetDate(timesheet.date);
    setTimesheetStartTime(timesheet.startTime);
    setTimesheetEndTime(timesheet.endTime);
    setTimesheetBreakStart(timesheet.breakStart || '');
    setTimesheetBreakEnd(timesheet.breakEnd || '');
    setTimesheetUserId(timesheet.userId.toString());
    
    // Parse location
    try {
      const locations = JSON.parse(timesheet.location);
      setTimesheetLocation(Array.isArray(locations) ? locations.join(', ') : timesheet.location);
    } catch (e) {
      setTimesheetLocation(timesheet.location);
    }
    
    setShowTimesheetForm(true);
  };
  
  const handleTimesheetFormSubmit = (e) => {
    e.preventDefault();
    
    if (!timesheetDate || !timesheetStartTime || !timesheetEndTime || !timesheetUserId) {
      setTimesheetFormError('Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    setTimesheetFormError('');
    
    // Format location as JSON array
    const locations = timesheetLocation.split(',').map(loc => loc.trim()).filter(loc => loc);
    
    const timesheetData = {
      userId: parseInt(timesheetUserId),
      date: timesheetDate,
      startTime: timesheetStartTime,
      endTime: timesheetEndTime,
      breakStart: timesheetBreakStart || null,
      breakEnd: timesheetBreakEnd || null,
      location: JSON.stringify(locations)
    };
    
    timesheetService.update(editingTimesheet.id, timesheetData)
      .then(() => {
        resetTimesheetForm();
        fetchTimesheets();
      })
      .catch(err => {
        setTimesheetFormError(err.response?.data?.message || 'Failed to update timesheet');
        console.error(err);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };
  
  const resetTimesheetForm = () => {
    setEditingTimesheet(null);
    setTimesheetDate('');
    setTimesheetStartTime('');
    setTimesheetEndTime('');
    setTimesheetBreakStart('');
    setTimesheetBreakEnd('');
    setTimesheetLocation('');
    setTimesheetUserId('');
    setTimesheetFormError('');
    setShowTimesheetForm(false);
  };
  
  const handleDeleteTimesheet = (timesheetId) => {
    if (window.confirm('Are you sure you want to delete this timesheet entry?')) {
      timesheetService.delete(timesheetId)
        .then(() => {
          // Refresh the timesheets list
          fetchTimesheets();
        })
        .catch(err => {
          setTimesheetError('Failed to delete timesheet');
          console.error(err);
        });
    }
  };
  
  const resetUserForm = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setRole('painter');
    setHourlyRate('');
    setFormError('');
    setShowUserForm(false);
  };
  
  // Filter timesheets based on selected filters
  const filteredTimesheets = timesheets.filter(timesheet => {
    // Filter by user
    if (filterUser !== 'all' && timesheet.userId !== parseInt(filterUser)) {
      return false;
    }
    
    // Filter by date range
    if (filterDateFrom && new Date(timesheet.date) < new Date(filterDateFrom)) {
      return false;
    }
    if (filterDateTo && new Date(timesheet.date) > new Date(filterDateTo)) {
      return false;
    }
    
    // Filter by location
    if (filterLocation) {
      try {
        // Try to parse location as JSON (for new format)
        const locations = JSON.parse(timesheet.location);
        if (Array.isArray(locations)) {
          // Check if any location includes the filter text
          if (!locations.some(loc => loc.toLowerCase().includes(filterLocation.toLowerCase()))) {
            return false;
          }
        } else if (!timesheet.location.toLowerCase().includes(filterLocation.toLowerCase())) {
          return false;
        }
      } catch (e) {
        // Fallback to old format
        if (!timesheet.location.toLowerCase().includes(filterLocation.toLowerCase())) {
          return false;
        }
      }
    }
    
    // Search query (search across all fields)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const user = users.find(u => u.id === timesheet.userId);
      const username = user?.username?.toLowerCase() || '';
      const date = formatDate(timesheet.date).toLowerCase();
      const times = `${formatTime(timesheet.startTime)} - ${formatTime(timesheet.endTime)}`.toLowerCase();
      const location = timesheet.location.toLowerCase();
      
      if (!username.includes(query) && 
          !date.includes(query) && 
          !times.includes(query) && 
          !location.includes(query)) {
        return false;
      }
    }
    
    return true;
  });
  
  // Calculate summary statistics
  const totalHours = filteredTimesheets.reduce((total, timesheet) => {
    const { hours } = calculateWorkHours(
      timesheet.startTime,
      timesheet.endTime,
      timesheet.breakStart,
      timesheet.breakEnd,
      true
    );
    return total + hours;
  }, 0);
  
  const totalPay = filteredTimesheets.reduce((total, timesheet) => {
    const user = users.find(u => u.id === timesheet.userId);
    if (!user) return total;
    
    const { hours } = calculateWorkHours(
      timesheet.startTime,
      timesheet.endTime,
      timesheet.breakStart,
      timesheet.breakEnd,
      true
    );
    return total + calculatePay(hours, user.hourlyRate);
  }, 0);
  
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
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
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex">
              <button
                className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'timesheets'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('timesheets')}
              >
                Timesheets
              </button>
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('users')}
              >
                User Management
              </button>
            </nav>
          </div>
          
          {/* Timesheets Tab */}
          {activeTab === 'timesheets' && (
            <div>
              {/* Dashboard Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-gray-500 text-sm">Total Hours (Current Period)</h3>
                  <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-gray-500 text-sm">Total Pay (Current Period)</h3>
                  <p className="text-2xl font-bold">${totalPay.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-gray-500 text-sm">Active Painters</h3>
                  <p className="text-2xl font-bold">{users.filter(u => u.role === 'painter').length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-gray-500 text-sm">Timesheet Entries</h3>
                  <p className="text-2xl font-bold">{filteredTimesheets.length}</p>
                </div>
              </div>
              
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Timesheet Filters</h2>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center mr-2">
                      <input
                        type="checkbox"
                        id="autoRefresh"
                        checked={autoRefresh}
                        onChange={() => setAutoRefresh(!autoRefresh)}
                        className="mr-1"
                      />
                      <label htmlFor="autoRefresh" className="text-xs text-gray-600">
                        Auto-refresh
                      </label>
                    </div>
                    <button
                      onClick={fetchTimesheets}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                      title="Refresh data"
                    >
                      Refresh Data
                    </button>
                    <button
                      onClick={clearAllFilters}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  {/* Search bar */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Timesheets
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="form-input w-full"
                      placeholder="Search by name, date, time, or location..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        // Today
                        const today = new Date();
                        const dateStr = today.toISOString().split('T')[0];
                        setFilterDateFrom(dateStr);
                        setFilterDateTo(dateStr);
                      }}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // This Week (Monday to Sunday)
                        const today = new Date();
                        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                        const monday = new Date(today);
                        monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
                        const sunday = new Date(monday);
                        sunday.setDate(monday.getDate() + 6);
                        
                        setFilterDateFrom(monday.toISOString().split('T')[0]);
                        setFilterDateTo(sunday.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >
                      This Week
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Last Week
                        const today = new Date();
                        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                        const monday = new Date(today);
                        monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) - 7);
                        const sunday = new Date(monday);
                        sunday.setDate(monday.getDate() + 6);
                        
                        setFilterDateFrom(monday.toISOString().split('T')[0]);
                        setFilterDateTo(sunday.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >
                      Last Week
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // This Month
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        
                        setFilterDateFrom(firstDay.toISOString().split('T')[0]);
                        setFilterDateTo(lastDay.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Last Month
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                        
                        setFilterDateFrom(firstDay.toISOString().split('T')[0]);
                        setFilterDateTo(lastDay.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >
                      Last Month
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // All Time (clear filters)
                        setFilterDateFrom('');
                        setFilterDateTo('');
                      }}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                    >
                      All Time
                    </button>
                  </div>
                
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User
                      </label>
                      <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="form-input"
                      >
                        <option value="all">All Users</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.username}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date From
                      </label>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date To
                      </label>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={filterLocation}
                        onChange={(e) => setFilterLocation(e.target.value)}
                        className="form-input"
                        placeholder="Filter by location"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <div>
                      <span className="font-medium">Total Hours:</span> {totalHours.toFixed(2)} |
                      <span className="font-medium ml-2">Total Pay:</span> ${totalPay.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Last updated: {lastUpdated.toLocaleString()}
                      {autoRefresh && ' (Auto-refresh enabled)'}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleExportTimesheets}
                    className="btn btn-primary"
                  >
                    Export to CSV
                  </button>
                </div>
              </div>
              
              {/* Timesheet Edit Form */}
              {showTimesheetForm && (
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Edit Timesheet</h2>
                    <button
                      onClick={resetTimesheetForm}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      &times;
                    </button>
                  </div>
                  
                  {timesheetFormError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                      {timesheetFormError}
                    </div>
                  )}
                  
                  <form onSubmit={handleTimesheetFormSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          User
                        </label>
                        <select
                          value={timesheetUserId}
                          onChange={(e) => setTimesheetUserId(e.target.value)}
                          className="form-input"
                          required
                        >
                          <option value="">Select User</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.username}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={timesheetDate}
                          onChange={(e) => setTimesheetDate(e.target.value)}
                          className="form-input"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={timesheetStartTime}
                          onChange={(e) => setTimesheetStartTime(e.target.value)}
                          className="form-input"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={timesheetEndTime}
                          onChange={(e) => setTimesheetEndTime(e.target.value)}
                          className="form-input"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Break Start (optional)
                        </label>
                        <input
                          type="time"
                          value={timesheetBreakStart}
                          onChange={(e) => setTimesheetBreakStart(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Break End (optional)
                        </label>
                        <input
                          type="time"
                          value={timesheetBreakEnd}
                          onChange={(e) => setTimesheetBreakEnd(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Locations (comma separated)
                        </label>
                        <input
                          type="text"
                          value={timesheetLocation}
                          onChange={(e) => setTimesheetLocation(e.target.value)}
                          className="form-input"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={resetTimesheetForm}
                        className="btn btn-secondary"
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                      >
                        {submitting ? 'Saving...' : 'Update Timesheet'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <h2 className="text-xl font-semibold p-6 border-b">Timesheet Entries</h2>
                
                {timesheetLoading ? (
                  <p className="p-6">Loading timesheets...</p>
                ) : timesheetError ? (
                  <p className="p-6 text-red-500">{timesheetError}</p>
                ) : filteredTimesheets.length === 0 ? (
                  <p className="p-6 text-gray-500">No timesheets found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Break
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pay
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
                        {filteredTimesheets.map(timesheet => {
                          const user = users.find(u => u.id === timesheet.userId);
                          const { hours } = calculateWorkHours(
                            timesheet.startTime,
                            timesheet.endTime,
                            timesheet.breakStart,
                            timesheet.breakEnd,
                            true
                          );
                          const pay = user ? calculatePay(hours, user.hourlyRate) : 0;
                          
                          return (
                            <tr key={timesheet.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {user?.username || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {formatDate(timesheet.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {formatTime(timesheet.startTime)} - {formatTime(timesheet.endTime)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {timesheet.breakStart && timesheet.breakEnd ? (
                                  `${formatTime(timesheet.breakStart)} - ${formatTime(timesheet.breakEnd)}`
                                ) : (
                                  'No break'
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {hours.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                ${pay.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {timesheet.location}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">User Management</h2>
                  <button
                    onClick={() => {
                      resetUserForm();
                      setShowUserForm(true);
                    }}
                    className="btn btn-primary"
                  >
                    Add New User
                  </button>
                </div>
                
                {showUserForm && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h3 className="text-lg font-medium mb-4">
                      {editingUser ? 'Edit User' : 'Add New User'}
                    </h3>
                    
                    <form onSubmit={handleUserFormSubmit}>
                      {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                          {formError}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username
                          </label>
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="form-input"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password {editingUser && '(leave blank to keep current)'}
                          </label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input"
                            required={!editingUser}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                          </label>
                          <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="form-input"
                            required
                          >
                            <option value="painter">Painter</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hourly Rate ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={hourlyRate}
                            onChange={(e) => setHourlyRate(e.target.value)}
                            className="form-input"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={resetUserForm}
                          className="btn btn-secondary"
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={submitting}
                        >
                          {submitting ? 'Saving...' : 'Save User'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                {userLoading ? (
                  <p>Loading users...</p>
                ) : userError ? (
                  <p className="text-red-500">{userError}</p>
                ) : users.length === 0 ? (
                  <p className="text-gray-500">No users found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Username
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hourly Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.username}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap capitalize">
                              {user.role}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              ${user.hourlyRate.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
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
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
