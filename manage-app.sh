#!/bin/bash

# Painter Timesheet Application Management Script
# This script provides commands to start, stop, and restart the application

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$APP_DIR/.app_pid"
LOG_FILE="$APP_DIR/app.log"

# Color codes for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage information
show_usage() {
    echo -e "${BLUE}Painter Timesheet Application Management Script${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start    - Start the server and client"
    echo "  stop     - Stop the running application"
    echo "  restart  - Restart the application"
    echo "  status   - Check if the application is running"
    echo "  help     - Show this help message"
    echo ""
}

# Function to start the application
start_app() {
    echo -e "${BLUE}Starting Painter Timesheet Application...${NC}"
    
    # Check if app is already running
    if [ -f "$PID_FILE" ] && ps -p $(cat "$PID_FILE") > /dev/null; then
        echo -e "${YELLOW}Application is already running with PID $(cat "$PID_FILE")${NC}"
        return 1
    fi
    
    # Navigate to app directory
    cd "$APP_DIR"
    
    # Start the application and save PID
    npm start > "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    
    # Wait a moment to see if process stays alive
    sleep 3
    if ps -p $PID > /dev/null; then
        echo -e "${GREEN}Application started successfully with PID $PID${NC}"
        echo -e "${GREEN}Server running on http://localhost:3001${NC}"
        echo -e "${GREEN}Client running on http://localhost:3003${NC}"
        echo -e "${BLUE}Logs are being written to $LOG_FILE${NC}"
    else
        echo -e "${RED}Failed to start application. Check logs at $LOG_FILE${NC}"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to stop the application
stop_app() {
    echo -e "${BLUE}Stopping Painter Timesheet Application...${NC}"
    
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${YELLOW}No PID file found. Application may not be running.${NC}"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    
    if ! ps -p $PID > /dev/null; then
        echo -e "${YELLOW}Process with PID $PID not found. Cleaning up PID file.${NC}"
        rm -f "$PID_FILE"
        return 1
    fi
    
    # Kill the main process and its children
    pkill -P $PID
    kill $PID
    
    # Wait for process to terminate
    for i in {1..10}; do
        if ! ps -p $PID > /dev/null; then
            break
        fi
        echo "Waiting for process to terminate... ($i/10)"
        sleep 1
    done
    
    # Force kill if still running
    if ps -p $PID > /dev/null; then
        echo -e "${YELLOW}Process still running. Sending SIGKILL...${NC}"
        pkill -9 -P $PID
        kill -9 $PID
    fi
    
    rm -f "$PID_FILE"
    echo -e "${GREEN}Application stopped successfully${NC}"
}

# Function to check application status
check_status() {
    if [ -f "$PID_FILE" ] && ps -p $(cat "$PID_FILE") > /dev/null; then
        echo -e "${GREEN}Application is running with PID $(cat "$PID_FILE")${NC}"
        echo -e "${GREEN}Server running on http://localhost:3001${NC}"
        echo -e "${GREEN}Client running on http://localhost:3003${NC}"
    else
        echo -e "${RED}Application is not running${NC}"
        # Clean up stale PID file if it exists
        [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
    fi
}

# Main script logic
case "$1" in
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        stop_app
        sleep 2
        start_app
        ;;
    status)
        check_status
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

exit 0
