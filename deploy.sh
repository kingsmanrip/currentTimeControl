#!/bin/bash

# Exit on any error
set -e

# Navigate to project root
cd "$(dirname "$0")"

# Install dependencies
echo "Installing server dependencies..."
cd server
npm install

echo "Installing client dependencies..."
cd ../client
npm install

# Build client
echo "Building client production version..."
npm run build

# Return to project root
cd ..

# Set up environment
echo "Setting up production environment..."
cp server/.env.production server/.env

# Start production server with PM2
echo "Starting production server..."
cd server
npm run production

echo "Deployment completed successfully!"
