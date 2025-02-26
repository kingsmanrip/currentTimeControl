# Painter Timesheet Application

A web application for tracking painters' work hours and calculating pay based on customizable hourly rates.

## Overview

The Painter Timesheet app is a full-stack web application that allows painting companies to track their painters' work hours, breaks, and job locations. The app calculates pay based on customizable hourly rates and includes break deduction rules.

### Key Features

- **User Authentication**: Simple login system with role-based access (Admin/Painter)
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

## Installation and Setup

1. Clone the repository:
   ```
   git clone https://github.com/kingsmanrip/painterAppCandidate.git
   cd painterAppCandidate
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the application:
   ```
   npm start
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Usage

### Admin Access
- Login with admin credentials
- Manage painters (add, edit, delete)
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

## Recent Improvements

- Added dashboard summary cards for quick insights
- Implemented timesheet editing functionality for admins
- Added auto-refresh feature for real-time data updates
- Enhanced painter dashboard with hours summary
- Added confirmation dialog for timesheet submission
- Improved success/error messaging
