#!/bin/bash

# Database backup script for Painter Timesheet App
# This script creates a backup of the SQLite database and manages backup retention

# Configuration
BACKUP_DIR="/home/javier/backups/painter-timesheet"
DB_PATH="/home/javier/Desktop/mostrar/painter/painterAppCandidate/server/database.sqlite"
RETENTION_DAYS=30  # Number of days to keep backups

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Generate timestamp for the backup file
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/database_$TIMESTAMP.sqlite"

# Create the backup
echo "Creating database backup: $BACKUP_FILE"
cp "$DB_PATH" "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo "Backup completed successfully"
  
  # Create a compressed version to save space
  gzip -f "$BACKUP_FILE"
  echo "Backup compressed: $BACKUP_FILE.gz"
  
  # Delete backups older than RETENTION_DAYS
  echo "Removing backups older than $RETENTION_DAYS days..."
  find "$BACKUP_DIR" -name "database_*.sqlite.gz" -type f -mtime +$RETENTION_DAYS -delete
  
  echo "Backup process completed at $(date)"
else
  echo "Backup failed!"
  exit 1
fi
