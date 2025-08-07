// ImmigrantsRUs CRM API - Vercel Serverless Functions
// This provides the core CRM functionality as specified in the PRD

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Mock data for when Supabase is not configured
const mockContacts = [
  {
    id: '1',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    notes: 'Interested in immigration services',
    practice_areas: ['Immigration'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    email: 'jane.smith@example.com',
    phone: '+1-555-0456',
    notes: 'Estate planning consultation',
    practice_areas: ['Estate Planning', 'Wills and Trust'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Practice Areas as defined in PRD
const PRACTICE_AREAS = [
  'Wills and Trust',
  'Estate Planning', 
  'Immigration',
  'Credit Repair',
  'Mortgages',
  'Personal Injury',
  'Real Estate'
];

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Add CORS headers to all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Safe URL parsing to avoid path-to-regexp errors
  let path = '';
  try {
    // Handle both direct API calls and proxied calls
    if (req.originalUrl) {
      path = req.originalUrl.replace('/api/immigrantrus-crm', '');
    } else if (req.url) {
      path = req.url.replace('/api/immigrantrus-crm', '');
    }
    
    // Clean up the path - remove query parameters and ensure leading slash
    path = path.split('?')[0]; // Remove query parameters
    path = path.split('#')[0]; // Remove hash fragments
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Sanitize path to prevent issues
    path = path.replace(/\/+/g, '/'); // Replace multiple slashes with single slash
    
    console.log(`[API] Processing request: ${req.method} ${path}`);
    
  } catch (error) {
    console.error('URL parsing error:', error);
    path = '/health'; // Default to health check
  }

  try {
    // Route handling
    switch (path) {
      case '/health':
        return handleHealth(req, res);
      
      case '/graphql':
        return handleGraphQL(req, res);
        
      case '/auth/verify':
        return handleAuthVerify(req, res);
        
      case '/auth/challenge':
        return handleAuthChallenge(req, res);
        
      case '/auth/login':
        return handleAuthLogin(req, res);
        
      case '/auth/logout':
        return handleAuthLogout(req, res);
        
      case '/auth/renew':
        return handleAuthRenew(req, res);
      
      case '/contacts':
        if (req.method === 'GET') return getContacts(req, res);
        if (req.method === 'POST') return createContact(req, res);
        break;
        
      case '/practice-areas':
        return getPracticeAreas(req, res);
        
      case '/rest/metadata':
        return handleMetadata(req, res);
        
      case '/rest/workspaces':
        return handleWorkspaces(req, res);
        
      default:
        return res.status(404).json({ 
          error: 'Endpoint not found',
          available_endpoints: [
            '/health - Health check',
            '/graphql - GraphQL endpoint for TwentyCRM',
            '/auth/verify - Authentication verification',
            '/auth/challenge - Authentication challenge',
            '/contacts - GET: List contacts, POST: Create contact',
            '/practice-areas - GET: List available practice areas'
          ]
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// Health check endpoint
async function handleHealth(req, res) {
  try {
    let databaseStatus = 'mock';
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('count', { count: 'exact' })
          .limit(1);
        databaseStatus = error ? 'disconnected' : 'connected';
      } catch (error) {
        databaseStatus = 'disconnected';
      }
    }

    return res.status(200).json({
      status: 'healthy',
      service: 'ImmigrantsRUs CRM API',
      version: '1.0.0',
      database: databaseStatus,
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/immigrantrus-crm/health',
        contacts: '/api/immigrantrus-crm/contacts',
        practice_areas: '/api/immigrantrus-crm/practice-areas'
      }
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}

// Get all contacts
async function getContacts(req, res) {
  try {
    let contacts = mockContacts;
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          contacts = data;
        }
      } catch (error) {
        console.warn('Supabase query failed, using mock data:', error.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: contacts,
      count: contacts.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Create new contact
async function createContact(req, res) {
  try {
    const { email, phone, notes, practiceAreas } = req.body;

    // Validation
    if (!email || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Email and phone are required fields'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate practice areas if provided
    if (practiceAreas && Array.isArray(practiceAreas)) {
      const invalidAreas = practiceAreas.filter(area => !PRACTICE_AREAS.includes(area));
      if (invalidAreas.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid practice areas: ${invalidAreas.join(', ')}`,
          valid_areas: PRACTICE_AREAS
        });
      }
    }

    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email)
      .single();

    if (existingContact) {
      return res.status(409).json({
        success: false,
        error: 'Contact with this email already exists'
      });
    }

    // Create contact
    const contactData = {
      email,
      phone,
      notes: notes || '',
      practice_areas: practiceAreas || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert([contactData])
      .select()
      .single();

    if (error) throw error;

    // Also sync to GetSnug CRM (as required by PRD)
    try {
      await syncToGetSnug({ email, phone });
    } catch (getSnugError) {
      console.warn('GetSnug sync failed:', getSnugError.message);
      // Don't fail the request if GetSnug sync fails
    }

    return res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: newContact
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Get practice areas
async function getPracticeAreas(req, res) {
  return res.status(200).json({
    success: true,
    data: PRACTICE_AREAS,
    count: PRACTICE_AREAS.length
  });
}

// Sync to GetSnug CRM (as required by PRD)
async function syncToGetSnug({ email, phone }) {
  const getSnugUrl = process.env.GETSNUG_API_URL || 'https://api.getsnug.com/v1/contacts';
  const getSnugApiKey = process.env.GETSNUG_API_KEY;

  if (!getSnugApiKey) {
    throw new Error('GetSnug API key not configured');
  }

  const response = await fetch(getSnugUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSnugApiKey}`
    },
    body: JSON.stringify({
      email,
      phone,
      source: 'ImmigrantsRUs_CRM'
    })
  });

  if (!response.ok) {
    throw new Error(`GetSnug sync failed: ${response.statusText}`);
  }

  return await response.json();
}

// Handle GraphQL requests (TwentyCRM compatibility)
async function handleGraphQL(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, variables } = req.body;
    
    // Basic GraphQL introspection query support
    if (query && query.includes('__schema')) {
      return res.status(200).json({
        data: {
          __schema: {
            types: [
              {
                name: 'Contact',
                fields: [
                  { name: 'id', type: { name: 'ID' } },
                  { name: 'email', type: { name: 'String' } },
                  { name: 'phone', type: { name: 'String' } },
                  { name: 'notes', type: { name: 'String' } },
                  { name: 'practiceAreas', type: { name: '[String]' } }
                ]
              }
            ]
          }
        }
      });
    }

    // Handle basic contact queries
    if (query && query.includes('contacts')) {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        data: {
          contacts: contacts.map(contact => ({
            id: contact.id,
            email: contact.email,
            phone: contact.phone,
            notes: contact.notes,
            practiceAreas: contact.practice_areas || []
          }))
        }
      });
    }

    // Default response for unsupported queries
    return res.status(200).json({
      data: {},
      errors: [{ message: 'Query not supported in compatibility mode' }]
    });

  } catch (error) {
    return res.status(500).json({
      errors: [{ message: error.message }]
    });
  }
}

// Handle authentication verification (TwentyCRM compatibility)
async function handleAuthVerify(req, res) {
  // For now, return a simple success response
  // In a real implementation, you'd verify JWT tokens here
  return res.status(200).json({
    success: true,
    user: {
      id: 'staff-user-1',
      email: 'staff@immigrantsrus.org',
      firstName: 'Staff',
      lastName: 'User',
      workspaceId: 'immigrantsrus-workspace'
    }
  });
}

// Handle authentication challenge (TwentyCRM compatibility)
async function handleAuthChallenge(req, res) {
  // For now, return a simple challenge response
  // In a real implementation, you'd handle proper authentication
  return res.status(200).json({
    success: true,
    challenge: 'simple-auth',
    message: 'Authentication not required in demo mode'
  });
}

// Handle authentication login (TwentyCRM compatibility)
async function handleAuthLogin(req, res) {
  // For demo purposes, accept any login
  return res.status(200).json({
    success: true,
    user: {
      id: 'staff-user-1',
      email: 'staff@immigrantsrus.org',
      firstName: 'Staff',
      lastName: 'User',
      workspaceId: 'immigrantsrus-workspace'
    },
    tokens: {
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token'
    }
  });
}

// Handle authentication logout (TwentyCRM compatibility)
async function handleAuthLogout(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}

// Handle authentication token renewal (TwentyCRM compatibility)
async function handleAuthRenew(req, res) {
  return res.status(200).json({
    success: true,
    tokens: {
      accessToken: 'demo-access-token-renewed',
      refreshToken: 'demo-refresh-token-renewed'
    }
  });
}

// Handle metadata requests (TwentyCRM compatibility)
async function handleMetadata(req, res) {
  return res.status(200).json({
    success: true,
    data: {
      objects: [
        {
          id: 'contact',
          nameSingular: 'contact',
          namePlural: 'contacts',
          labelSingular: 'Contact',
          labelPlural: 'Contacts',
          fields: [
            { name: 'id', type: 'UUID', label: 'ID' },
            { name: 'email', type: 'EMAIL', label: 'Email' },
            { name: 'phone', type: 'PHONE', label: 'Phone' },
            { name: 'notes', type: 'TEXT', label: 'Notes' },
            { name: 'practiceAreas', type: 'MULTI_SELECT', label: 'Practice Areas' }
          ]
        }
      ]
    }
  });
}

// Handle workspaces requests (TwentyCRM compatibility)
async function handleWorkspaces(req, res) {
  return res.status(200).json({
    success: true,
    data: {
      workspaces: [
        {
          id: 'immigrantsrus-workspace',
          displayName: 'ImmigrantsRUs',
          domainName: 'immigrantsrus.org',
          subdomain: 'staff-portal',
          logo: '/staff-portal/images/icons/android/android-launchericon-48-48.png'
        }
      ]
    }
  });
}
