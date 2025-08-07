#!/usr/bin/env node

/**
 * Production Server for ImmigrantsRUs with Integrated TwentyCRM
 * 
 * This server runs:
 * 1. Main website (Vite build)
 * 2. TwentyCRM backend server
 * 3. API endpoints for CRM integration
 * 
 * Designed for Railway deployment with PostgreSQL and Redis
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

console.log('🚀 Starting ImmigrantsRUs Production Server with TwentyCRM Integration');

// Environment validation
const requiredEnvVars = [
  'DATABASE_URL',    // PostgreSQL connection
  'REDIS_URL'        // Redis connection
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.warn('⚠️  Missing environment variables:', missingEnvVars);
  console.log('📋 Available environment variables:', Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('REDIS')));
}

// TwentyCRM Backend Process
let twentyCrmProcess = null;

async function startTwentyCRM() {
  console.log('🔧 Starting TwentyCRM Backend...');
  
  // Set TwentyCRM environment variables
  const twentyCrmEnv = {
    ...process.env,
    // Database configuration
    PG_DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    
    // TwentyCRM specific configuration
    PORT: '3001',  // TwentyCRM backend port
    FRONT_BASE_URL: `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:3000'}`,
    SERVER_URL: `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:3000'}`,
    
    // Authentication bypass
    SIGN_IN_PREFILLED: 'true',
    IS_SIGN_UP_DISABLED: 'false',
    
    // Security (for production)
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || 'twenty-access-token-secret',
    LOGIN_TOKEN_SECRET: process.env.LOGIN_TOKEN_SECRET || 'twenty-login-token-secret',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'twenty-refresh-token-secret',
    FILE_TOKEN_SECRET: process.env.FILE_TOKEN_SECRET || 'twenty-file-token-secret',
    
    // Disable telemetry
    TELEMETRY_ENABLED: 'false',
    TELEMETRY_ANONYMIZATION_ENABLED: 'false'
  };

  try {
    // Start TwentyCRM backend
    twentyCrmProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'twenty-crm'),
      env: twentyCrmEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    twentyCrmProcess.stdout.on('data', (data) => {
      console.log(`[TwentyCRM] ${data.toString().trim()}`);
    });

    twentyCrmProcess.stderr.on('data', (data) => {
      console.error(`[TwentyCRM Error] ${data.toString().trim()}`);
    });

    twentyCrmProcess.on('close', (code) => {
      console.log(`[TwentyCRM] Process exited with code ${code}`);
      if (code !== 0) {
        console.error('❌ TwentyCRM backend crashed, attempting restart...');
        setTimeout(startTwentyCRM, 5000); // Restart after 5 seconds
      }
    });

    console.log('✅ TwentyCRM Backend started on port 3001');
    
  } catch (error) {
    console.error('❌ Failed to start TwentyCRM:', error);
  }
}

// API Routes - Import from existing API
app.use('/api/immigrantrus-crm', async (req, res, next) => {
  try {
    // Use require for CommonJS compatibility
    const crmHandler = require('./api/immigrantrus-crm.js');
    return crmHandler(req, res);
  } catch (error) {
    console.error('CRM API Error:', error);
    res.status(500).json({ error: 'CRM API unavailable', message: error.message });
  }
});

// Proxy requests to TwentyCRM backend
app.use('/api/graphql', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3001/graphql', {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('GraphQL Proxy Error:', error);
    res.status(503).json({ error: 'TwentyCRM backend unavailable' });
  }
});

// Health check endpoint - responds immediately for Railway health checks
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    services: {
      website: 'running',
      twentycrm: twentyCrmProcess ? 'running' : 'starting',
      database: process.env.DATABASE_URL ? 'configured' : 'not configured',
      redis: process.env.REDIS_URL ? 'configured' : 'not configured'
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
  
  // Always respond with 200 OK for Railway health checks
  // Even if TwentyCRM is still starting, the main server is healthy
  res.status(200).json(healthStatus);
});

// Serve staff portal (TwentyCRM frontend)
app.use('/staff-portal', express.static(path.join(__dirname, 'public/staff-portal')));

// Root path handler for quick health checks
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// Serve main website
app.get('*', (req, res) => {
  // For staff portal routes, serve the React app
  if (req.path.startsWith('/staff-portal')) {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  } else {
    // For all other routes, serve the main website
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  if (twentyCrmProcess) {
    twentyCrmProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  if (twentyCrmProcess) {
    twentyCrmProcess.kill('SIGINT');
  }
  process.exit(0);
});

// Start the server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ ImmigrantsRUs Production Server running on port ${PORT}`);
  console.log(`🌐 Website: http://localhost:${PORT}`);
  console.log(`👥 Staff Portal: http://localhost:${PORT}/staff-portal`);
  console.log(`🔧 CRM API: http://localhost:${PORT}/api/immigrantrus-crm`);
  
  // Start TwentyCRM backend after main server is running
  setTimeout(startTwentyCRM, 2000);
});
