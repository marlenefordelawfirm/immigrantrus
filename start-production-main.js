import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// GetSnug API configuration (using EXACT working endpoints from final test)
const AUTH_BASE_URL = 'https://auth.getsnug.com';
const API_BASE_URL = 'https://api.getsnug.com';
const SNUG_EMAIL = process.env.VITE_SNUG_EMAIL;
const SNUG_PASSWORD = process.env.VITE_SNUG_PASSWORD;

// Authentication helper (using EXACT working format)
async function authenticateWithSnug() {
  const response = await fetch(`${AUTH_BASE_URL}/api/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: SNUG_EMAIL,  // KEY FIX: Use 'username' not 'email'
      password: SNUG_PASSWORD
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return { 
    accessToken: data.access,
    refreshToken: data.refresh 
  };
}

// Get user profile and professional group info (using api.getsnug.com)
async function getUserProfile(token) {
  const response = await fetch(`${API_BASE_URL}/api/v3/user-data/?expand=professional_group_role`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Profile fetch failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    udId: data.data.ud_id,
    proGroupId: data.data.professional_group_role_user_data.professional_group_id  // KEY FIX: Use correct path
  };
}

// Create client helper (using EXACT working pro-people-roles endpoint)
async function createSnugClient(token, udId, proGroupId, clientData) {
  const response = await fetch(`${API_BASE_URL}/api/v3/${udId}/pro-group/${proGroupId}/pro-people-roles/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(clientData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Client creation failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// API endpoint to create GetSnug clients
app.post('/api/snug-client', async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: firstName, lastName, email' 
      });
    }

    console.log(`Creating GetSnug client for: ${firstName} ${lastName} (${email})`);

    // Check environment variables
    if (!SNUG_EMAIL || !SNUG_PASSWORD) {
      console.error('Missing environment variables:', { 
        SNUG_EMAIL: !!SNUG_EMAIL, 
        SNUG_PASSWORD: !!SNUG_PASSWORD 
      });
      return res.status(500).json({ 
        error: 'Server configuration error - missing credentials' 
      });
    }

    // Step 1: Authenticate with GetSnug
    console.log('Step 1: Authenticating...');
    const authResult = await authenticateWithSnug();
    
    // Step 2: Get user profile and professional group info
    console.log('Step 2: Getting user profile...');
    const profile = await getUserProfile(authResult.accessToken);
    
    // Step 3: Prepare client data (using correct simplified format from documentation)
    const clientData = {
      client_data: {
        full_name: `${firstName} ${lastName}`,
        contact_email: email
      },
      client_role: {
        will_price: 29999,
        trust_price: 59999
      }
    };

    // Step 4: Create the client
    console.log('Step 3: Creating client...');
    const result = await createSnugClient(authResult.accessToken, profile.udId, profile.proGroupId, clientData);
    
    console.log('GetSnug client created successfully:', result);
    
    res.status(200).json({ 
      success: true, 
      message: 'GetSnug client created successfully',
      data: result 
    });

  } catch (error) {
    console.error('GetSnug client creation error:', error);
    
    // Check if it's a "client already exists" error
    if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
      return res.status(200).json({ 
        success: true, 
        message: 'GetSnug client already exists',
        data: { note: 'Client already exists' }
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create GetSnug client',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ImmigrantsRUs main app is running',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React routing - send all non-API requests to React app
app.get('*', (req, res) => {
  // Don't serve React app for /staff-portal routes - let nginx handle those
  if (req.path.startsWith('/staff-portal')) {
    return res.status(404).json({ error: 'Staff portal not available on this service' });
  }
  
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 ImmigrantsRUs main app running on http://localhost:${PORT}`);
  console.log(`📋 Environment check:`);
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - SNUG_EMAIL: ${SNUG_EMAIL ? 'SET' : 'MISSING'}`);
  console.log(`   - SNUG_PASSWORD: ${SNUG_PASSWORD ? 'SET' : 'MISSING'}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
});
