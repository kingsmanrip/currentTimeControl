import axios from 'axios';

// Get the current hostname from the browser
const hostname = window.location.hostname;
const API_URL = `http://${hostname}:3001/api`;

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Unauthorized - clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: (username, password) => api.post('/auth/login', { username, password }),
};

// User services
export const userService = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
};

// Timesheet services
export const timesheetService = {
  getAll: (filters = {}) => api.get('/timesheets', { params: filters }),
  getById: (id) => api.get(`/timesheets/${id}`),
  getByUser: (userId) => api.get(`/timesheets/user/${userId}`),
  create: (timesheetData) => api.post('/timesheets', timesheetData),
  update: (id, timesheetData) => api.put(`/timesheets/${id}`, timesheetData),
  delete: (id) => api.delete(`/timesheets/${id}`),
  export: (filters = {}) => api.get('/timesheets/export', { 
    params: filters,
    responseType: 'blob'
  }),
};

export default api;
