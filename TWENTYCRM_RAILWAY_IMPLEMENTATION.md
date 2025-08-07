# TwentyCRM Railway Implementation Guide

## Goal
Deploy TwentyCRM to Railway so that `https://immigrantrus.org/staff-portal` leads directly to a fully functional TwentyCRM instance.

## Current Railway Infrastructure
- **PostgreSQL**: `postgresql://postgres:nqzDmVNVUXYyupnmxshwSJRTbvD0nmUgpostgres.railway.internal:5432/railway`
- **Redis**: `redis://default:gBPCxDLfruwPGpnHhKdTAKNGLhxuoEGGredis.railway.internal:6379`
- **Domain**: `https://immigrantrus.org`
- **Existing secrets**: Available in Railway environment

## Implementation Plan

### Phase 1: Local Development & Testing ✅

#### Step 1.1: Download TwentyCRM Docker Files
```bash
# Create twentycrm directory
mkdir twentycrm-docker
cd twentycrm-docker

# Download official files
curl -o .env https://raw.githubusercontent.com/twentyhq/twenty/refs/heads/main/packages/twenty-docker/.env.example
curl -o docker-compose.yml https://raw.githubusercontent.com/twentyhq/twenty/refs/heads/main/packages/twenty-docker/docker-compose.yml
```

#### Step 1.2: Configure Environment for Railway Databases
```env
# Database Configuration (Railway)
PG_DATABASE_URL=postgresql://postgres:nqzDmVNVUXYyupnmxshwSJRTbvD0nmUgpostgres.railway.internal:5432/railway
REDIS_URL=redis://default:gBPCxDLfruwPGpnHhKdTAKNGLhxuoEGGredis.railway.internal:6379

# TwentyCRM Configuration
SERVER_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Generate new secrets
APP_SECRET=[generate with: openssl rand -base64 32]
ACCESS_TOKEN_SECRET=[generate with: openssl rand -base64 32]
LOGIN_TOKEN_SECRET=[generate with: openssl rand -base64 32]
REFRESH_TOKEN_SECRET=[generate with: openssl rand -base64 32]
FILE_TOKEN_SECRET=[generate with: openssl rand -base64 32]

# Database Password (for local PostgreSQL if needed)
PG_DATABASE_PASSWORD=twentycrm_password
```

#### Step 1.3: Test Local Installation
```bash
# Start TwentyCRM locally
docker compose up -d

# Verify it's running
curl http://localhost:3000

# Check logs
docker compose logs
```

### Phase 2: Railway Deployment ✅

#### Step 2.1: Prepare Railway Deployment Files
- Create `railway.toml` for TwentyCRM service
- Create `Dockerfile` if needed
- Configure environment variables for Railway

#### Step 2.2: Deploy TwentyCRM to Railway
- Add new service to existing Railway project
- Configure to use shared PostgreSQL and Redis
- Set up environment variables
- Deploy and test

#### Step 2.3: Configure Domain Routing
```env
# Production environment variables
SERVER_URL=https://immigrantrus.org/staff-portal
FRONTEND_URL=https://immigrantrus.org/staff-portal
```

### Phase 3: Integration with Main App ✅

#### Step 3.1: Update Staff Portal Routing
- Modify main app to route `/staff-portal` to TwentyCRM service
- Update `src/pages/StaffPortalPage.tsx` if needed
- Configure reverse proxy or direct routing

#### Step 3.2: Test End-to-End
- Verify `https://immigrantrus.org/staff-portal` loads TwentyCRM
- Test TwentyCRM functionality
- Verify database persistence

## Implementation Checklist

### Phase 1: Local Development
- [x] Download TwentyCRM Docker files
- [x] Configure .env with Railway database connections
- [x] Generate required secrets
- [x] Skip local testing (Docker not available)
- [x] Prepare for direct Railway deployment
- [x] Create Railway deployment files

### Phase 2: Railway Deployment
- [x] Create Railway deployment configuration
- [x] Create Dockerfile for Railway
- [x] Create railway.toml configuration
- [x] Prepare environment variables list
- [x] Create comprehensive deployment guide
- [ ] Deploy TwentyCRM as new Railway service (Ready to deploy)
- [ ] Configure environment variables in Railway dashboard
- [ ] Set up domain routing
- [ ] Test Railway deployment
- [ ] Verify database connections

### Phase 3: Integration
- [ ] Update main app routing
- [ ] Configure `/staff-portal` path
- [ ] Test production deployment
- [ ] Verify end-to-end functionality
- [ ] Document final configuration

## Expected Results

✅ **`https://immigrantrus.org/staff-portal`** → Direct access to TwentyCRM
✅ **Standalone TwentyCRM** with full CRM functionality
✅ **Shared Railway infrastructure** (PostgreSQL + Redis)
✅ **Clean separation** between main app and CRM
✅ **Production ready** deployment

## Troubleshooting

### Common Issues
- Database connection errors → Check Railway internal URLs
- Port conflicts → Ensure proper Railway service configuration
- Environment variable issues → Verify all required secrets are set
- Domain routing problems → Check Railway domain configuration

### Debug Commands
```bash
# Check TwentyCRM logs
docker compose logs

# Test database connection
psql $PG_DATABASE_URL

# Test Redis connection
redis-cli -u $REDIS_URL ping
```

## Next Steps After Implementation
1. Test all TwentyCRM features
2. Set up user accounts and permissions
3. Configure data import/export if needed
4. Plan future customizations and integrations
5. Monitor performance and resource usage

---

**Implementation Status**: Ready for Railway Deployment
**Start Date**: January 8, 2025
**Current Phase**: Phase 2 - Railway Deployment
**Completion Target**: Full TwentyCRM deployment at `/staff-portal`

## Files Created:
- `twentycrm-docker/.env` - Configured for Railway databases
- `twentycrm-docker/docker-compose.yml` - Modified for external databases
- `twentycrm-docker/railway.toml` - Railway service configuration
- `twentycrm-docker/Dockerfile` - Railway build configuration
- `TWENTYCRM_RAILWAY_DEPLOYMENT_GUIDE.md` - Complete deployment instructions

## Next Action Required:
Follow the deployment guide to create the Railway service and deploy TwentyCRM.
