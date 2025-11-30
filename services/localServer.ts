import TcpSocket from 'react-native-tcp-socket';
import { Listing } from '../database/db';

const PORT = 3000;
const HOST = '0.0.0.0';

let server: any = null;
let isRunning = false;

// In-memory storage for all listings from connected clients
// Format: { [listingId]: { ...listing, clientId: string } }
const listingsStore: Map<string, Listing & { clientId: string; serverId: string }> = new Map();
let listingIdCounter = 1;

/**
 * Add a listing directly to the store (for host's own listings)
 */
export function addListingToStore(listing: Listing): string {
  // Check for duplicates first
  const existingListings = Array.from(listingsStore.values());
  const duplicate = existingListings.find(
    l => l.vendorID === listing.vendorID &&
         l.vendorName === listing.vendorName &&
         l.description === listing.description &&
         l.productsInReturn === listing.productsInReturn
  );
  
  if (duplicate) {
    console.log(`[Server] ⚠️ Duplicate listing detected in addListingToStore, skipping. Existing: ${duplicate.serverId}`);
    return duplicate.serverId;
  }
  
  const serverId = `server_${listingIdCounter++}`;
  const clientId = listing.vendorID || 'unknown';
  
  const newListing = {
    ...listing,
    serverId,
    clientId,
  };
  
  listingsStore.set(serverId, newListing);
  console.log(`[Server] ✅ Added listing ${serverId} directly to store from ${clientId}`);
  return serverId;
}

/**
 * Start the TCP server
 */
export async function startServer(): Promise<void> {
  if (isRunning) {
    console.log('Server already running');
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      server = TcpSocket.createServer((socket) => {
        console.log('[Server] 🔌 New client connection received');
        let requestData = '';
        let isHandling = false;
        let expectedContentLength: number | null = null;
        let headersReceived = false;
        
        socket.on('data', (data: string | Buffer) => {
          requestData += data.toString();
          
          // Check if we have the HTTP headers (ends with \r\n\r\n)
          if (requestData.includes('\r\n\r\n') && !headersReceived) {
            const headerEnd = requestData.indexOf('\r\n\r\n');
            const headers = requestData.substring(0, headerEnd);
            const bodyStart = headerEnd + 4;
            
            // Check for Content-Length header
            const contentLengthMatch = headers.match(/Content-Length:\s*(\d+)/i);
            if (contentLengthMatch) {
              expectedContentLength = parseInt(contentLengthMatch[1], 10);
              console.log(`[Server] 📏 Expected Content-Length: ${expectedContentLength} bytes`);
              headersReceived = true;
            } else {
              // No Content-Length header, assume request is complete after headers
              expectedContentLength = null;
              headersReceived = true;
            }
          }
          
          // Process request if we have headers and (no Content-Length or full body received)
          if (headersReceived && !isHandling) {
            const headerEnd = requestData.indexOf('\r\n\r\n');
            const bodyStart = headerEnd + 4;
            const currentBodyLength = requestData.length - bodyStart;
            
            if (expectedContentLength === null || currentBodyLength >= expectedContentLength) {
              console.log(`[Server] ✅ Received complete request (body: ${currentBodyLength} bytes)`);
              isHandling = true;
              handleRequest(socket, requestData);
              requestData = '';
              isHandling = false;
              headersReceived = false;
              expectedContentLength = null;
            } else {
              console.log(`[Server] ⏳ Waiting for more data: ${currentBodyLength}/${expectedContentLength} bytes`);
            }
          }
        });

        socket.on('error', (error: any) => {
          console.error('[Server] ❌ Socket error:', error);
        });

        socket.on('close', () => {
          console.log('[Server] 🔌 Client disconnected');
        });

        socket.on('connect', () => {
          console.log('[Server] ✅ Socket connected');
        });
      });

      server.on('error', (error: any) => {
        console.error('Server error:', error);
        reject(error);
      });

      server.listen(PORT, HOST, () => {
        console.log(`[Server] ✅ Server listening on ${HOST}:${PORT}`);
        console.log(`[Server] 📡 Ready to accept connections on port ${PORT}`);
        console.log(`[Server] 💡 For Android emulator clients: Run "adb reverse tcp:${PORT} tcp:${PORT}" on your computer`);
        isRunning = true;
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Stop the server
 */
export async function stopServer(): Promise<void> {
  if (!isRunning || !server) {
    return;
  }

  return new Promise((resolve) => {
    server.close(() => {
      console.log('[Server] 🛑 Server stopped - clearing all listings from memory');
      // Clear all listings from memory when server stops
      listingsStore.clear();
      listingIdCounter = 1; // Reset counter
      isRunning = false;
      server = null;
      resolve();
    });
  });
}

/**
 * Handle HTTP requests
 */
function handleRequest(socket: any, request: string) {
  const lines = request.split('\r\n');
  const requestLine = lines[0];
  const [method, path] = requestLine.split(' ');
  
  console.log(`[Server] ${method} ${path}`);

  // Parse request body if present
  let body = '';
  const bodyIndex = request.indexOf('\r\n\r\n');
  if (bodyIndex !== -1) {
    body = request.substring(bodyIndex + 4);
  }

  // Route requests
  if (method === 'GET' && path === '/hello') {
    const response = 'HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nhello';
    socket.write(response);
    // Close immediately after write
    setTimeout(() => {
      socket.destroy();
    }, 100);
  } else if (method === 'GET' && path === '/listings') {
    // Get all listings
    const allListings = Array.from(listingsStore.values());
    const responseBody = JSON.stringify(allListings);
    const response = `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${responseBody.length}\r\nConnection: close\r\n\r\n${responseBody}`;
    
    // Write the response
    socket.write(response);
    console.log(`[Server] 📤 Sent ${allListings.length} listings (${responseBody.length} bytes) to requester`);
    if (allListings.length > 0) {
      console.log(`[Server] Listing details:`, allListings.map(l => ({ vendorID: l.vendorID, clientId: l.clientId, vendorName: l.vendorName })));
    }
    // Close the connection after a short delay to ensure data is sent
    setTimeout(() => {
      socket.destroy();
    }, 100);
  } else if (method === 'POST' && path === '/listing') {
    // Add a new listing
    console.log(`[Server] 📥 Received POST /listing request`);
    console.log(`[Server] Request body length: ${body.length}`);
    console.log(`[Server] Request body preview: ${body.substring(0, 200)}`);
    try {
      const listing = JSON.parse(body);
      console.log(`[Server] Parsed listing:`, {
        vendorID: listing.vendorID,
        vendorName: listing.vendorName,
        description: listing.description?.substring(0, 50),
        hasImage: !!listing.image
      });
      
      // Check if this listing already exists (deduplication)
      const existingListings = Array.from(listingsStore.values());
      const duplicate = existingListings.find(
        l => l.vendorID === listing.vendorID &&
             l.vendorName === listing.vendorName &&
             l.description === listing.description &&
             l.productsInReturn === listing.productsInReturn
      );
      
      if (duplicate) {
        console.log(`[Server] ⚠️ Duplicate listing detected, skipping. Existing: ${duplicate.serverId}`);
        const responseBody = JSON.stringify({ success: true, id: duplicate.serverId, duplicate: true });
        const response = `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${responseBody.length}\r\nConnection: close\r\n\r\n${responseBody}`;
        socket.write(response);
        setTimeout(() => {
          socket.destroy();
        }, 100);
        return;
      }
      
      const serverId = `server_${listingIdCounter++}`;
      const clientId = listing.vendorID || 'unknown';
      
      const newListing = {
        ...listing,
        serverId,
        clientId,
      };
      
      listingsStore.set(serverId, newListing);
      console.log(`[Server] ✅ STORED listing in server store!`);
      console.log(`[Server] ServerId: ${serverId}, ClientId: ${clientId}, VendorID: ${listing.vendorID}`);
      console.log(`[Server] Server store size: ${listingsStore.size} listings`);
      
      const responseBody = JSON.stringify({ success: true, id: serverId });
      const response = `HTTP/1.1 201 Created\r\nContent-Type: application/json\r\nContent-Length: ${responseBody.length}\r\nConnection: close\r\n\r\n${responseBody}`;
      socket.write(response);
      setTimeout(() => {
        socket.destroy();
      }, 100);
      
      // Log all listings in store for debugging
      const allListings = Array.from(listingsStore.values());
      console.log(`[Server] 📋 All listings in store (${allListings.length} total):`, allListings.map(l => ({ 
        serverId: l.serverId, 
        vendorID: l.vendorID, 
        clientId: l.clientId, 
        vendorName: l.vendorName 
      })));
    } catch (error) {
      const errorBody = JSON.stringify({ error: 'Invalid JSON' });
      const response = `HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nContent-Length: ${errorBody.length}\r\n\r\n${errorBody}`;
      socket.write(response);
    }
  } else if (method === 'DELETE' && path.startsWith('/listing/')) {
    // Delete a listing by serverId or by vendorID
    const listingId = path.split('/listing/')[1];
    let deleted = false;
    let deletedCount = 0;
    
    // Try to delete by serverId first
    deleted = listingsStore.delete(listingId);
    if (deleted) {
      deletedCount = 1;
      console.log(`[Server] Deleted listing by serverId: ${listingId}`);
    }
    
    // If not found by serverId, try to find and delete ALL listings with matching vendorID
    // This allows deleting all listings from a specific vendor
    if (!deleted || listingId.includes('-')) {
      const listingsToDelete: string[] = [];
      for (const [id, listing] of listingsStore.entries()) {
        if (listing.vendorID === listingId || listing.clientId === listingId) {
          listingsToDelete.push(id);
        }
      }
      
      for (const id of listingsToDelete) {
        listingsStore.delete(id);
        deletedCount++;
        deleted = true;
      }
      
      if (deletedCount > 0) {
        console.log(`[Server] Deleted ${deletedCount} listing(s) by vendorID/clientId: ${listingId}`);
      }
    }
    
    if (deleted) {
      const responseBody = JSON.stringify({ success: true });
      const response = `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${responseBody.length}\r\nConnection: close\r\n\r\n${responseBody}`;
      socket.write(response);
      setTimeout(() => {
        socket.destroy();
      }, 100);
      console.log(`[Server] Deleted listing ${listingId}`);
    } else {
      const errorBody = JSON.stringify({ error: 'Listing not found' });
      const response = `HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\nContent-Length: ${errorBody.length}\r\nConnection: close\r\n\r\n${errorBody}`;
      socket.write(response);
      setTimeout(() => {
        socket.destroy();
      }, 100);
    }
  } else {
    // Default response
    const response = 'HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n\r\nNot Found';
    socket.write(response);
  }
}

/**
 * Check if server is running
 */
export function serverIsRunning(): boolean {
  return isRunning;
}

/**
 * Get all listings from the server (for host's own view)
 */
export function getAllServerListings(): Array<Listing & { clientId: string; serverId: string }> {
  return Array.from(listingsStore.values());
}

/**
 * Clear all listings (useful for testing)
 */
export function clearAllListings(): void {
  listingsStore.clear();
  listingIdCounter = 1;
}
