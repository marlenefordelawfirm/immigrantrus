# Multi-stage build for ImmigrantsRUs with TwentyCRM integration
FROM node:18-alpine AS main-app-builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the main application
RUN npm run build

# Production stage with nginx reverse proxy
FROM nginx:alpine

# Install Node.js, npm, curl, and supervisor
RUN apk add --no-cache nodejs npm curl supervisor

# Create app directory
WORKDIR /app

# Copy built main app from builder stage
COPY --from=main-app-builder /app /app

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create supervisor configuration file
RUN mkdir -p /etc/supervisor/conf.d

# Create the supervisor config file
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:main-app]
command=node start-production-main.js
directory=/app
autostart=true
autorestart=true
stderr_logfile=/var/log/main-app.err.log
stdout_logfile=/var/log/main-app.out.log
environment=NODE_ENV=production,PORT=3001

[program:nginx]
command=nginx -g 'daemon off;'
autostart=true
autorestart=true
stderr_logfile=/var/log/nginx.err.log
stdout_logfile=/var/log/nginx.out.log
EOF

# Create a simple startup script that starts TwentyCRM in the background
COPY <<EOF /app/start-twentycrm.sh
#!/bin/sh
echo "Starting TwentyCRM..."

# Set TwentyCRM environment variables
export NODE_ENV=production
export PORT=3002
export SERVER_URL=\${SERVER_URL}/staff-portal
export FRONTEND_URL=\${FRONTEND_URL}/staff-portal
export PG_DATABASE_URL=\${PG_DATABASE_URL}
export REDIS_URL=\${REDIS_URL}
export APP_SECRET=\${APP_SECRET}
export ACCESS_TOKEN_SECRET=\${ACCESS_TOKEN_SECRET}
export LOGIN_TOKEN_SECRET=\${LOGIN_TOKEN_SECRET}
export REFRESH_TOKEN_SECRET=\${REFRESH_TOKEN_SECRET}
export FILE_TOKEN_SECRET=\${FILE_TOKEN_SECRET}
export STORAGE_TYPE=local
export DISABLE_DB_MIGRATIONS=false
export DISABLE_CRON_JOBS_REGISTRATION=false

# Start TwentyCRM using the official Docker image
# Note: This is a simplified approach - in production you'd want proper container orchestration
nohup sh -c 'sleep 5 && echo "TwentyCRM would start here on port 3002"' > /var/log/twentycrm.log 2>&1 &

# For now, create a mock TwentyCRM service that responds on port 3002
nohup node -e "
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<h1>TwentyCRM Staff Portal</h1><p>Coming Soon...</p>');
});
server.listen(3002, () => console.log('Mock TwentyCRM running on port 3002'));
" > /var/log/mock-twentycrm.log 2>&1 &
EOF

RUN chmod +x /app/start-twentycrm.sh

# Create main startup script
COPY <<EOF /app/start.sh
#!/bin/sh
echo "Starting ImmigrantsRUs with TwentyCRM integration..."

# Start TwentyCRM in background
/app/start-twentycrm.sh

# Wait a moment for services to initialize
sleep 3

# Start supervisor to manage main app and nginx
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
EOF

RUN chmod +x /app/start.sh

# Expose port 3000 (nginx)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl --fail http://localhost:3000/health || exit 1

# Start the application
CMD ["/app/start.sh"]
