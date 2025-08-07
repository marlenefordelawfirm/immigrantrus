# TwentyCRM Railway Deployment Guide

## Current Status: Ready for Railway Deployment

### Files Prepared ✅
- `twentycrm-docker/.env` - Environment configuration with Railway database connections
- `twentycrm-docker/docker-compose.yml` - Modified to use external databases
- `twentycrm-docker/railway.toml` - Railway deployment configuration
- `twentycrm-docker/Dockerfile` - Railway build configuration

## Railway Deployment Steps

### Step 1: Create New Railway Service

1. **Go to your Railway project**: https://railway.app/project/[your-project-id]
2. **Add New Service**:
   - Click "New Service" 
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Set source directory to `twentycrm-docker/`

### Step 2: Configure Environment Variables

In the Railway dashboard for the new TwentyCRM service, add these environment variables:

#### Required Variables:
```env
# Database Configuration (use your existing Railway internal URLs)
PG_DATABASE_URL=postgresql://postgres:nqzDmVNVUXYyupnmxshwSJRTbvD0nmUgpostgres.railway.internal:5432/railway
REDIS_URL=redis://default:gBPCxDLfruwPGpnHhKdTAKNGLhxuoEGGredis.railway.internal:6379

# Server Configuration
SERVER_URL=https://immigrantrus.org/staff-portal
FRONTEND_URL=https://immigrantrus.org/staff-portal
NODE_PORT=3000

# Generated Secret (from our setup)
APP_SECRET=GzyJLd6V2jx18iIdBXlwlahnt3PWqby/VddgKoWGXyc=

# Storage Configuration
STORAGE_TYPE=local

# Migration Settings
DISABLE_DB_MIGRATIONS=false
DISABLE_CRON_JOBS_REGISTRATION=false
```

#### Optional Variables (can be added later):
```env
# Email Configuration
EMAIL_FROM_ADDRESS=contact@immigrantrus.org
EMAIL_FROM_NAME=ImmigrantsRUs Staff
EMAIL_SYSTEM_ADDRESS=system@immigrantrus.org

# OAuth (if needed later)
# AUTH_GOOGLE_CLIENT_ID=
# AUTH_GOOGLE_CLIENT_SECRET=
# AUTH_GOOGLE_CALLBACK_URL=https://immigrantrus.org/staff-portal/auth/google/callback
```

### Step 3: Configure Domain Routing

#### Option A: Railway Custom Domain (Recommended)
1. In Railway TwentyCRM service settings
2. Go to "Domains" 
3. Add custom domain: `immigrantrus.org`
4. Set path prefix: `/staff-portal`

#### Option B: Reverse Proxy from Main App
Update your main app's `server.js` to proxy `/staff-portal` requests:

```javascript
// Add to your server.js
app.use('/staff-portal', createProxyMiddleware({
  target: 'https://[twentycrm-service-url].railway.app',
  changeOrigin: true,
  pathRewrite: {
    '^/staff-portal': '', // Remove /staff-portal prefix when forwarding
  },
}));
```

### Step 4: Deploy and Test

1. **Deploy the service** - Railway will automatically build and deploy
2. **Check logs** - Monitor deployment in Railway dashboard
3. **Test health endpoint** - Visit `https://[service-url]/healthz`
4. **Test TwentyCRM** - Visit `https://immigrantrus.org/staff-portal`

## Database Integration

### TwentyCRM Database Schema
TwentyCRM will automatically create its own tables in your existing PostgreSQL database:
- Tables will be prefixed or in separate schema
- No conflicts with existing ImmigrantsRUs tables
- Shared database allows for future integrations

### Expected Tables Created:
- `workspace`, `user`, `company`, `person`, `opportunity`
- `activity`, `comment`, `attachment`, `webhook`
- And other CRM-related tables

## Troubleshooting

### Common Issues:

1. **Database Connection Errors**
   - Verify Railway internal URLs are correct
   - Check that PostgreSQL service is running
   - Ensure database allows connections from TwentyCRM service

2. **Domain Routing Issues**
   - Verify custom domain configuration
   - Check DNS settings if using custom domain
   - Test direct service URL first

3. **Environment Variable Issues**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify secret values are correct

### Debug Commands:
```bash
# Check Railway service logs
railway logs --service twentycrm

# Test database connection
railway run --service twentycrm -- psql $PG_DATABASE_URL -c "SELECT 1"

# Test Redis connection  
railway run --service twentycrm -- redis-cli -u $REDIS_URL ping
```

## Post-Deployment Steps

### 1. Initial Setup
- Access TwentyCRM at `https://immigrantrus.org/staff-portal`
- Create admin account
- Configure workspace settings
- Import any existing data if needed

### 2. User Management
- Set up user accounts for staff
- Configure permissions and roles
- Test authentication flow

### 3. Integration Planning
- Plan GetSnug API integration (future)
- Consider data sync requirements
- Plan custom field mappings

## Success Criteria

✅ **TwentyCRM accessible** at `https://immigrantrus.org/staff-portal`
✅ **Database connectivity** - TwentyCRM connects to Railway PostgreSQL
✅ **Redis connectivity** - Background jobs and caching work
✅ **User registration** - Can create accounts and log in
✅ **Core CRM functions** - Can create contacts, companies, opportunities
✅ **Data persistence** - Data saves and loads correctly

## Next Steps After Successful Deployment

1. **User Training** - Train staff on TwentyCRM interface
2. **Data Migration** - Import existing client data if needed
3. **Custom Fields** - Configure fields specific to immigration law
4. **Integrations** - Plan GetSnug API integration
5. **Monitoring** - Set up alerts and monitoring
6. **Backup Strategy** - Ensure data backup procedures

---

**Deployment Status**: Ready for Railway deployment
**Estimated Deployment Time**: 15-30 minutes
**Target URL**: `https://immigrantrus.org/staff-portal`
