# Painter Timesheet Application

A web application for tracking painters' work hours and calculating pay based on customizable hourly rates.

## Overview

The Painter Timesheet app is a full-stack web application that allows painting companies to track their painters' work hours, breaks, and job locations. The app calculates pay based on customizable hourly rates and includes break deduction rules.

### Key Features

- **User Authentication**: Secure login system with role-based access (Admin/Painter)
- **Timesheet Entry**:
  - Date, start time, end time
  - Optional break times
  - Work location(s)
- **Break Deduction Rules**:
  - Breaks ≤ 30 minutes: No deduction
  - Breaks 31-60 minutes: 30-minute deduction
  - Breaks > 60 minutes: Full break time deducted
- **Admin Dashboard**:
  - User management (add/edit/delete painters)
  - View all timesheet entries
  - Filter by user, date, location
  - Export timesheet data to CSV
  - Edit timesheet entries
  - Auto-refresh data
  - System protection against deleting the last admin user
- **Painter Dashboard**:
  - Submit work hours
  - View and edit previous submissions
  - Weekly summary view
  - Hours summary (today, this week, this month)

## Technology Stack

- **Frontend**:
  - React
  - Tailwind CSS
  - React Router
- **Backend**:
  - Express.js
  - SQLite database
  - bcrypt for password hashing

## Installation and Setup

### Prerequisites
- Node.js (v14 or later)
- npm (v6 or later)

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/kingsmanrip/painterAppCandidate.git
   cd painterAppCandidate
   ```

2. Install dependencies for both client and server:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. Start the application:
   ```bash
   # In one terminal, start the server
   cd server
   npm start

   # In another terminal, start the client
   cd client
   npm start
   ```

4. Access the application:
   - Frontend: http://localhost:3003
   - Backend API: http://localhost:3001

## Development Mode

- The client uses React's development server with hot reloading
- Both servers support live reloading during development
- Environment variables can be configured in server/.env for development

## Usage

### Admin Access
- Login with admin credentials
- Manage painters (add, edit, delete)
  - Note: System prevents deletion of the last admin user to maintain system access
  - To delete an admin, ensure another admin user exists first
- View and filter timesheet entries
- Export data to CSV
- Edit timesheet entries

### Painter Access
- Login with painter credentials
- Submit daily work hours
- View and edit previous submissions
- See summary of hours worked

## Database Schema

### Users Table
- id (Primary Key)
- username
- password (hashed)
- role (admin/painter)
- hourlyRate

### Timesheets Table
- id (Primary Key)
- userId (Foreign Key to users)
- date
- startTime
- endTime
- breakStart (optional)
- breakEnd (optional)
- location
- notes (optional)

## Security Features

- Password hashing using bcrypt
- Role-based access control
- Protection against deleting the last admin user
- Authentication middleware for API routes
- Session-based authentication

## Recent Improvements

- Added dashboard summary cards for quick insights
- Implemented timesheet editing functionality for admins
- Added auto-refresh feature for real-time data updates
- Enhanced painter dashboard with hours summary
- Added confirmation dialog for timesheet submission
- Improved success/error messaging
- Enhanced user management security features

## Troubleshooting

- Ensure all dependencies are installed correctly
- Check that ports 3001 (server) and 3003 (client) are available
- Verify Node.js and npm versions meet the prerequisites
- If unable to delete an admin user, ensure another admin user exists in the system

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE.md file for details
