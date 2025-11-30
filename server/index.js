const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost'; // Use localhost to match ngrok forwarding

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large images in listings

// In-memory storage
const listingsStore = new Map(); // { listingId: listing }
let listingIdCounter = 1;

// Active users tracking: { deviceId: lastKeepAliveTimestamp }
const activeUsers = new Map();
const KEEP_ALIVE_TIMEOUT = 30000; // 30 seconds

// Cleanup inactive users periodically
setInterval(() => {
  const now = Date.now();
  for (const [deviceId, lastSeen] of activeUsers.entries()) {
    if (now - lastSeen > KEEP_ALIVE_TIMEOUT) {
      activeUsers.delete(deviceId);
      console.log(`[Server] Removed inactive user: ${deviceId}`);
    }
  }
}, 10000); // Check every 10 seconds

// Helper functions
function getActiveUserCount() {
  return activeUsers.size;
}

function registerActiveUser(deviceId) {
  activeUsers.set(deviceId, Date.now());
  console.log(`[Server] ✅ Registered active user: ${deviceId} (${getActiveUserCount()} total)`);
}

// Routes

// Health check
app.get('/hello', (req, res) => {
  res.send('hello');
});

// Keep-alive endpoint
app.post('/keepalive', (req, res) => {
  const { deviceId, vendorID } = req.body;
  const id = deviceId || vendorID;
  
  if (id) {
    registerActiveUser(id);
    res.json({ 
      success: true, 
      activeUsers: getActiveUserCount(),
      message: 'Keep-alive received'
    });
  } else {
    res.status(400).json({ error: 'deviceId or vendorID required' });
  }
});

// Get active user count
app.get('/active-users', (req, res) => {
  res.json({ activeUsers: getActiveUserCount() });
});

// Get all listings
app.get('/listings', (req, res) => {
  const listings = Array.from(listingsStore.values());
  console.log(`[Server] GET /listings - returning ${listings.length} listings`);
  res.json(listings);
});

// Add a listing
app.post('/listing', (req, res) => {
  try {
    const listing = req.body;
    
    // Generate server ID if not provided
    if (!listing.serverId) {
      listing.serverId = `server-${listingIdCounter++}`;
    }
    
    // Use vendorID as the key, or generate one
    const listingId = listing.vendorID || listing.serverId || `listing-${Date.now()}`;
    
    // Store the listing
    listingsStore.set(listingId, {
      ...listing,
      serverId: listing.serverId,
      vendorID: listing.vendorID || listingId,
      createdAt: listing.createdAt || Date.now()
    });
    
    console.log(`[Server] ✅ Added listing: ${listing.vendorName || 'Unnamed'} (ID: ${listingId})`);
    
    res.json({
      success: true,
      serverId: listing.serverId,
      listingId: listingId,
      message: 'Listing added successfully'
    });
  } catch (error) {
    console.error('[Server] Error adding listing:', error);
    res.status(500).json({ error: 'Failed to add listing', message: error.message });
  }
});

// Delete a listing by vendorID or serverId
app.delete('/listing/:id', (req, res) => {
  const id = req.params.id;
  
  // Try to find by vendorID first
  let deleted = false;
  for (const [key, listing] of listingsStore.entries()) {
    if (listing.vendorID === id || listing.serverId === id || listing.clientId === id) {
      listingsStore.delete(key);
      deleted = true;
      console.log(`[Server] ✅ Deleted listing: ${id} (found by ${listing.vendorID === id ? 'vendorID' : listing.serverId === id ? 'serverId' : 'clientId'})`);
      break;
    }
  }
  
  // Also try direct key match
  if (!deleted && listingsStore.has(id)) {
    listingsStore.delete(id);
    deleted = true;
    console.log(`[Server] ✅ Deleted listing by key: ${id}`);
  }
  
  if (deleted) {
    res.json({ success: true, message: 'Listing deleted successfully' });
  } else {
    res.status(404).json({ error: 'Listing not found' });
  }
});

// Get server status
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    port: PORT,
    host: HOST,
    activeUsers: getActiveUserCount(),
    totalListings: listingsStore.size,
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Survia Host Server running on http://${HOST}:${PORT}`);
  console.log(`📡 Ready to accept client connections`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /hello          - Health check`);
  console.log(`  POST /keepalive      - Keep-alive with deviceId`);
  console.log(`  GET  /active-users   - Get active user count`);
  console.log(`  GET  /listings       - Get all listings`);
  console.log(`  POST /listing        - Add a listing`);
  console.log(`  DELETE /listing/:id  - Delete a listing`);
  console.log(`  GET  /status         - Server status\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

