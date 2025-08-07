# Clerk Integration Plan for ImmigrantRUs CRM

## Overview
This document outlines the complete plan to remove TwentyCRM's built-in authentication system and replace it with Clerk authentication to eliminate the welcome page redirect issue and provide seamless single sign-on.

## Current Problem
- TwentyCRM's built-in authentication system redirects unauthenticated users to `/welcome`
- This interferes with the staff portal integration
- Users cannot access the CRM directly without going through TwentyCRM's authentication flow

## Existing Clerk Configuration
- **Application**: Immigrantrus
- **Issuer**: `https://good-falcon-78.clerk.accounts.dev`
- **JWKS Endpoint**: `https://good-falcon-78.clerk.accounts.dev/.well-known/jwks.json`
- **JWT Template**: Already configured with custom claims
- **Token Lifetime**: 60 seconds
- **API Keys**: Available and ready for integration

## Implementation Plan

### Phase 1: Remove TwentyCRM Authentication (Immediate Fix)

#### 1.1 Disable Apollo Authentication Redirects
**File**: `twenty-crm/packages/twenty-front/src/modules/apollo/hooks/useApolloFactory.ts`
- Remove or modify the `onUnauthenticatedError` callback
- This callback currently redirects to `AppPath.SignInUp` which triggers the welcome flow
- Replace with either no action or custom Clerk redirect

#### 1.2 Bypass Router Authentication
**File**: `twenty-crm/packages/twenty-front/src/modules/app/hooks/useCreateAppRouter.tsx`
- Remove or modify auth-related routes:
  - `AppPath.SignInUp` → Replace with custom component or remove
  - `AppPath.Verify` → Remove or disable
  - `AppPath.ResetPassword` → Remove or disable
  - Other auth routes as needed

#### 1.3 Update AppPath Configuration
**File**: `twenty-crm/packages/twenty-front/src/modules/types/AppPath.ts`
- Ensure `SignInUp` path doesn't conflict with staff portal
- Update path definitions to prevent authentication triggers

#### 1.4 Expected Outcome
- CRM loads directly without authentication barriers
- No more welcome page redirects
- Staff portal can embed CRM successfully

### Phase 2: Integrate Clerk Authentication

#### 2.1 Install Dependencies

**Main Application** (`package.json`):
```json
{
  "dependencies": {
    "@clerk/clerk-react": "^4.30.0"
  }
}
```

**TwentyCRM** (`twenty-crm/package.json`):
```json
{
  "dependencies": {
    "@clerk/clerk-react": "^4.30.0"
  }
}
```

#### 2.2 Environment Configuration

**Update `.env.example`**:
```env
# Existing variables
EMAIL=user@example.com
PASSWORD=changeme
BASE_URL=https://example.com

# New Clerk variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Z29vZC1mYWxjb24tNzguY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_4mZIjJYkYeDw2NSBv4FjMpURQ8JMfezZtQQ5AGKXF1
CLERK_ISSUER=https://good-falcon-78.clerk.accounts.dev
CLERK_JWKS_URL=https://good-falcon-78.clerk.accounts.dev/.well-known/jwks.json
```

**TwentyCRM Environment** (`twenty-crm/packages/twenty-server/.env`):
```env
# Add Clerk configuration
CLERK_SECRET_KEY=sk_test_4mZIjJYkYeDw2NSBv4FjMpURQ8JMfezZtQQ5AGKXF1
CLERK_JWKS_URL=https://good-falcon-78.clerk.accounts.dev/.well-known/jwks.json
```

#### 2.3 Main Application Integration

**File**: `src/App.tsx`
- Wrap application with `<ClerkProvider>`
- Configure Clerk with publishable key
- Set up routing for authenticated/unauthenticated states

**File**: `src/pages/StaffPortalPage.tsx`
- Add Clerk authentication check
- Redirect to sign-in if not authenticated
- Pass authentication state to embedded CRM

#### 2.4 TwentyCRM Frontend Integration

**File**: `twenty-crm/packages/twenty-front/src/pages/auth/SignInUp.tsx`
- Replace entire component with Clerk authentication
- Use `<SignIn />` component from Clerk
- Handle authentication success/failure

**File**: `twenty-crm/packages/twenty-front/src/modules/apollo/hooks/useApolloFactory.ts`
- Modify Apollo client configuration
- Use Clerk JWT tokens for authentication headers
- Update token refresh logic

**File**: `twenty-crm/packages/twenty-front/src/modules/auth/states/`
- Update authentication state management
- Replace TwentyCRM user state with Clerk user data
- Modify token storage to use Clerk sessions

#### 2.5 TwentyCRM Server Integration

**File**: `twenty-crm/packages/twenty-server/src/engine/core-modules/auth/services/auth.service.ts`
- Replace JWT validation with Clerk token validation
- Use Clerk JWKS endpoint for token verification
- Update user lookup/creation logic

**File**: `twenty-crm/packages/twenty-server/src/engine/core-modules/auth/guards/`
- Update authentication guards
- Validate Clerk JWT tokens instead of internal tokens
- Extract user information from Clerk token claims

#### 2.6 User Data Synchronization

**Create**: `twenty-crm/packages/twenty-server/src/engine/core-modules/auth/services/clerk-user.service.ts`
- Service to sync Clerk users with TwentyCRM user records
- Handle user creation on first login
- Map Clerk user fields to TwentyCRM user schema

## Implementation Steps

### Step 1: Phase 1 Implementation
1. Modify Apollo factory to remove auth redirects
2. Update router configuration to bypass auth
3. Test CRM loads without authentication
4. Verify staff portal integration works

### Step 2: Phase 2 Preparation
1. Install Clerk dependencies
2. Set up environment variables
3. Configure Clerk providers

### Step 3: Frontend Integration
1. Integrate Clerk in main application
2. Replace TwentyCRM auth components
3. Update Apollo client configuration
4. Test authentication flow

### Step 4: Backend Integration
1. Update TwentyCRM server auth services
2. Implement Clerk token validation
3. Set up user synchronization
4. Test end-to-end authentication

### Step 5: Testing & Validation
1. Test single sign-on flow
2. Verify CRM functionality with Clerk auth
3. Test staff portal integration
4. Validate token refresh and session management

## Expected Benefits

### Immediate (Phase 1)
- ✅ Eliminates welcome page redirect issue
- ✅ CRM loads directly in staff portal
- ✅ No authentication barriers for development/testing

### Long-term (Phase 2)
- ✅ Single sign-on between main site and CRM
- ✅ Centralized user management through Clerk
- ✅ Enhanced security with Clerk's authentication features
- ✅ Simplified user experience
- ✅ Consistent authentication across all applications

## Risk Mitigation

### Backup Strategy
- Keep original TwentyCRM auth code in separate branch
- Implement feature flags to toggle between auth systems
- Gradual rollout with ability to rollback

### Testing Strategy
- Test each phase independently
- Validate authentication flows thoroughly
- Test edge cases (token expiry, network issues, etc.)

### Monitoring
- Log authentication events
- Monitor token validation performance
- Track user session management

## Timeline Estimate

- **Phase 1**: 2-4 hours (immediate fix)
- **Phase 2**: 1-2 days (full Clerk integration)
- **Testing & Refinement**: 1 day
- **Total**: 2-3 days for complete implementation

## Next Steps

1. Execute Phase 1 to immediately resolve the welcome page issue
2. Test and validate Phase 1 implementation
3. Proceed with Phase 2 for full Clerk integration
4. Comprehensive testing and deployment

---

*This plan provides a structured approach to eliminating TwentyCRM's authentication system and implementing Clerk-based authentication for seamless integration with the ImmigrantRUs staff portal.*
