# Painter Timesheet App Deployment Guide

This guide provides instructions for deploying the Painter Timesheet application on a Hostinger Ubuntu VPS.

## Prerequisites

- Ubuntu VPS from Hostinger
- SSH access to your VPS
- Domain name pointed to your VPS (optional but recommended)
- Basic knowledge of Linux commands

## Step 1: Initial Server Setup

1. Connect to your VPS via SSH:
   ```
   ssh username@your_server_ip
   ```

2. Update your system:
   ```
   sudo apt update && sudo apt upgrade -y
   ```

3. Install required dependencies:
   ```
   sudo apt install -y git nodejs npm build-essential
   ```

4. Install Node.js version manager (optional but recommended):
   ```
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
   source ~/.bashrc
   nvm install 16  # or your preferred Node.js version
   ```

## Step 2: Clone the Repository

1. Create a directory for your application:
   ```
   mkdir -p /var/www/painter-timesheet
   cd /var/www/painter-timesheet
   ```

2. Clone your repository:
   ```
   git clone https://github.com/kingsmanrip/currentTimeControl.git .
   ```

## Step 3: Environment Configuration

1. Create and configure the server .env file:
   ```
   cd server
   cp .env.example .env
   nano .env
   ```

2. Update the following values in the .env file:
   - `JWT_SECRET`: Generate a strong random string (e.g., using `openssl rand -base64 32`)
   - `CORS_ORIGIN`: Set to your domain (e.g., `https://yourdomain.com`)
   - `NODE_ENV`: Set to `production`

## Step 4: Install Dependencies and Build the Application

1. Install server dependencies:
   ```
   cd /var/www/painter-timesheet
   npm run install-all
   ```

2. Build the React application:
   ```
   npm run build
   ```

## Step 5: Set Up Process Management with PM2

1. Install PM2 globally:
   ```
   npm install -g pm2
   ```

2. Start the application with PM2:
   ```
   cd /var/www/painter-timesheet
   pm2 start server/server.js --name painter-timesheet
   ```

3. Configure PM2 to start on system boot:
   ```
   pm2 startup
   ```
   (Follow the instructions provided by the command)

4. Save the PM2 process list:
   ```
   pm2 save
   ```

## Step 6: Set Up Nginx as a Reverse Proxy

1. Install Nginx:
   ```
   sudo apt install -y nginx
   ```

2. Create a new Nginx site configuration:
   ```
   sudo nano /etc/nginx/sites-available/painter-timesheet
   ```

3. Add the following configuration (replace yourdomain.com with your actual domain):
   ```
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. Enable the site and restart Nginx:
   ```
   sudo ln -s /etc/nginx/sites-available/painter-timesheet /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Step 7: Set Up SSL with Let's Encrypt

1. Install Certbot:
   ```
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. Obtain and install SSL certificate:
   ```
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. Follow the prompts to complete the SSL setup.

## Step 8: Set Up Database Backups

1. Copy the backup script to a suitable location:
   ```
   sudo mkdir -p /opt/scripts
   sudo cp /var/www/painter-timesheet/server/backup-db.sh /opt/scripts/
   sudo chmod +x /opt/scripts/backup-db.sh
   ```

2. Edit the script to update paths:
   ```
   sudo nano /opt/scripts/backup-db.sh
   ```
   
   Update the following variables:
   - `BACKUP_DIR`: Set to `/var/backups/painter-timesheet`
   - `DB_PATH`: Set to `/var/www/painter-timesheet/server/database.sqlite`

3. Set up a cron job to run the backup script daily:
   ```
   sudo crontab -e
   ```
   
   Add the following line:
   ```
   0 2 * * * /opt/scripts/backup-db.sh >> /var/log/painter-timesheet-backup.log 2>&1
   ```

## Step 9: Monitoring and Maintenance

1. Monitor the application logs:
   ```
   pm2 logs painter-timesheet
   ```

2. Set up log rotation for PM2 logs:
   ```
   sudo pm2 install pm2-logrotate
   ```

3. Configure log rotation settings:
   ```
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   ```

## Troubleshooting

- If the application doesn't start, check the logs:
  ```
  pm2 logs painter-timesheet
  ```

- If Nginx isn't working, check its status and logs:
  ```
  sudo systemctl status nginx
  sudo cat /var/log/nginx/error.log
  ```

- If you need to restart the application:
  ```
  pm2 restart painter-timesheet
  ```

## Security Considerations

1. Set up a firewall:
   ```
   sudo apt install -y ufw
   sudo ufw allow ssh
   sudo ufw allow http
   sudo ufw allow https
   sudo ufw enable
   ```

2. Consider setting up fail2ban to protect against brute force attacks:
   ```
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

3. Regularly update your system and dependencies:
   ```
   sudo apt update && sudo apt upgrade -y
   ```

## Updating the Application

When you need to update the application:

1. Pull the latest changes:
   ```
   cd /var/www/painter-timesheet
   git pull
   ```

2. Install dependencies and rebuild:
   ```
   npm run install-all
   npm run build
   ```

3. Restart the application:
   ```
   pm2 restart painter-timesheet
   ```
