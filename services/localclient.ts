import TcpSocket from 'react-native-tcp-socket';
import { DEFAULT_SERVER_PORT } from '../constants/connection';

/**
 * Send a GET request to the local server and receive the response
 */
export async function sendGetRequest(
  path: string = '/hello',
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT
): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to connect to ${serverHost}:${serverPort}...`);
    
    let connectionEstablished = false;
    let responseReceived = false;
    let responseData = '';
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    console.log(`[Client] 🔌 Creating connection to ${serverHost}:${serverPort}...`);
    const client = TcpSocket.createConnection(
      {
        port: serverPort,
        host: serverHost,
      },
      () => {
        // Connection established
        connectionEstablished = true;
        console.log(`[Client] ✅ Connected to server at ${serverHost}:${serverPort}`);
        
        // Send GET request
        const request = `GET ${path} HTTP/1.1\r\nHost: ${serverHost}:${serverPort}\r\n\r\n`;
        try {
          client.write(request);
          console.log(`[Client] 📤 Sent GET request to ${path}`);
        } catch (writeError: any) {
          console.error('[Client] ❌ Error writing request:', writeError);
          reject(new Error(`Failed to send request: ${writeError.message || writeError}`));
        }
      }
    );

    // Add connection attempt logging
    client.on('connect', () => {
      console.log(`[Client] 🔗 Socket connect event fired for ${serverHost}:${serverPort}`);
    });

    client.on('data', (data: string | Buffer) => {
      responseReceived = true;
      responseData += data.toString();
      // Only log first chunk to avoid spam
      if (responseData.length === data.toString().length) {
        console.log('📥 Received data chunk (first):', data.toString().substring(0, 100) + '...');
      }
      
      // Don't close the connection - let the server close it
      // This ensures we receive all data chunks
    });

    client.on('error', (error: any) => {
      console.error('❌ Client socket error:', error);
      const errorCode = error?.code || 'UNKNOWN';
      const errorMessage = error?.message || String(error);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Provide more specific error messages
      let userMessage = `Connection error: ${errorMessage}`;
      if (errorCode === 'ECONNREFUSED') {
        userMessage = `Connection refused. Is the server running on ${serverHost}:${serverPort}?`;
      } else if (errorCode === 'ENOTFOUND' || errorCode === 'EADDRNOTAVAIL') {
        userMessage = `Cannot resolve host ${serverHost}. Check your network configuration.`;
      } else if (errorCode === 'ETIMEDOUT') {
        userMessage = `Connection timeout. Server may not be responding.`;
      }
      
      reject(new Error(userMessage));
    });

    client.on('close', () => {
      console.log('🔌 Connection closed');
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (responseReceived && responseData) {
        // Parse HTTP response to extract body
        const bodyIndex = responseData.indexOf('\r\n\r\n');
        if (bodyIndex !== -1) {
          const body = responseData.substring(bodyIndex + 4);
          const trimmedBody = body.trim();
          console.log(`[Client] Extracted body length: ${trimmedBody.length}`);
          resolve(trimmedBody);
        } else {
          // No headers found, assume entire response is body
          resolve(responseData.trim());
        }
      } else if (!connectionEstablished) {
        reject(new Error('Connection failed: Could not establish connection to server'));
      } else if (!responseReceived) {
        reject(new Error('No response received from server'));
      } else {
        resolve(responseData.trim() || 'Empty response');
      }
    });

    // Timeout after 10 seconds (increased for large responses)
    timeoutId = setTimeout(() => {
      if (client && !client.destroyed) {
        console.error('⏱️ Request timeout after 10 seconds');
        console.error(`⏱️ Response data received so far: ${responseData.length} bytes`);
        client.destroy();
        reject(new Error('Request timeout: Server did not respond within 10 seconds'));
      }
    }, 10000);
  });
}

/**
 * Simple function to test the server connection
 */
export async function testServerConnection(
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT
): Promise<string> {
  try {
    const response = await sendGetRequest('/hello', serverHost, serverPort);
    return response;
  } catch (error: any) {
    throw new Error(`Failed to connect to server: ${error.message}`);
  }
}

/**
 * Send a POST request with JSON body
 */
export async function sendPostRequest(
  path: string,
  body: any,
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT
): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`[Client] POST ${path} to ${serverHost}:${serverPort}`);
    console.log(`[Client] Request body:`, JSON.stringify(body).substring(0, 200));
    
    let connectionEstablished = false;
    let responseReceived = false;
    let responseData = '';
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const client = TcpSocket.createConnection(
      {
        port: serverPort,
        host: serverHost,
      },
      () => {
        connectionEstablished = true;
        console.log('[Client] ✅ Connected to server for POST request');
        
        const bodyString = JSON.stringify(body);
        const request = `POST ${path} HTTP/1.1\r\nHost: ${serverHost}:${serverPort}\r\nContent-Type: application/json\r\nContent-Length: ${bodyString.length}\r\n\r\n${bodyString}`;
        
        try {
          client.write(request);
          console.log(`[Client] 📤 Sent POST request (${bodyString.length} bytes)`);
        } catch (writeError: any) {
          console.error('[Client] ❌ Error writing request:', writeError);
          reject(new Error(`Failed to send request: ${writeError.message || writeError}`));
        }
      }
    );

    client.on('data', (data: string | Buffer) => {
      responseReceived = true;
      responseData += data.toString();
      console.log(`[Client] 📥 Received POST response data (${data.toString().length} bytes)`);
      // Don't close - wait for server to close connection
    });

    client.on('error', (error: any) => {
      console.error('[Client] ❌ Socket error:', error);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(new Error(`Connection error: ${error.message || error}`));
    });

    client.on('close', () => {
      console.log('[Client] 🔌 Connection closed');
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (responseReceived && responseData) {
        // Parse HTTP response
        const bodyIndex = responseData.indexOf('\r\n\r\n');
        if (bodyIndex !== -1) {
          const body = responseData.substring(bodyIndex + 4);
          resolve(body.trim());
        } else {
          resolve(responseData.trim());
        }
      } else if (!connectionEstablished) {
        reject(new Error('Connection failed: Could not establish connection'));
      } else if (!responseReceived) {
        reject(new Error('No response received from server'));
      } else {
        resolve(responseData.trim() || 'Empty response');
      }
    });

    timeoutId = setTimeout(() => {
      if (client && !client.destroyed) {
        console.error('[Client] ⏱️ Request timeout after 10 seconds');
        console.error(`[Client] Response data received so far: ${responseData.length} bytes`);
        client.destroy();
        reject(new Error('Request timeout: Server did not respond within 10 seconds'));
      }
    }, 10000); // Increased to 10 seconds for large listings with images
  });
}

/**
 * Send a DELETE request
 */
export async function sendDeleteRequest(
  path: string,
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT
): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`[Client] DELETE ${path} to ${serverHost}:${serverPort}`);
    
    let connectionEstablished = false;
    let responseReceived = false;
    let responseData = '';
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const client = TcpSocket.createConnection(
      {
        port: serverPort,
        host: serverHost,
      },
      () => {
        connectionEstablished = true;
        console.log('[Client] ✅ Connected to server');
        
        const request = `DELETE ${path} HTTP/1.1\r\nHost: ${serverHost}:${serverPort}\r\n\r\n`;
        
        try {
          client.write(request);
          console.log('[Client] 📤 Sent DELETE request');
        } catch (writeError: any) {
          console.error('[Client] ❌ Error writing request:', writeError);
          reject(new Error(`Failed to send request: ${writeError.message || writeError}`));
        }
      }
    );

    client.on('data', (data: string | Buffer) => {
      responseReceived = true;
      responseData += data.toString();
      // Don't close - wait for server to close connection
    });

    client.on('error', (error: any) => {
      console.error('[Client] ❌ Socket error:', error);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(new Error(`Connection error: ${error.message || error}`));
    });

    client.on('close', () => {
      console.log('[Client] 🔌 Connection closed');
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (responseReceived && responseData) {
        const bodyIndex = responseData.indexOf('\r\n\r\n');
        if (bodyIndex !== -1) {
          const body = responseData.substring(bodyIndex + 4);
          resolve(body.trim());
        } else {
          resolve(responseData.trim());
        }
      } else if (!connectionEstablished) {
        reject(new Error('Connection failed: Could not establish connection'));
      } else if (!responseReceived) {
        reject(new Error('No response received from server'));
      } else {
        resolve(responseData.trim() || 'Empty response');
      }
    });

    timeoutId = setTimeout(() => {
      if (client && !client.destroyed) {
        console.error('[Client] ⏱️ Request timeout');
        client.destroy();
        reject(new Error('Request timeout: Server did not respond within 10 seconds'));
      }
    }, 10000);
  });
}

/**
 * Send a listing to the host server
 */
export async function sendListingToHost(
  listing: any,
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT
): Promise<any> {
  console.log(`[Client] sendListingToHost called with:`, {
    vendorID: listing.vendorID,
    vendorName: listing.vendorName,
    serverHost,
    serverPort
  });
  try {
    console.log(`[Client] Calling sendPostRequest('/listing', listing, ${serverHost}, ${serverPort})`);
    const response = await sendPostRequest('/listing', listing, serverHost, serverPort);
    console.log(`[Client] Received response from server:`, response);
    const parsed = JSON.parse(response);
    console.log(`[Client] Parsed response:`, parsed);
    return parsed;
  } catch (error: any) {
    console.error(`[Client] Error in sendListingToHost:`, error);
    console.error(`[Client] Error stack:`, error.stack);
    throw new Error(`Failed to send listing to host: ${error.message}`);
  }
}

/**
 * Delete a listing from the host server
 * Can delete by serverId or vendorID
 */
export async function deleteListingFromHost(
  listingIdOrVendorID: string,
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT
): Promise<any> {
  try {
    const response = await sendDeleteRequest(`/listing/${listingIdOrVendorID}`, serverHost, serverPort);
    return JSON.parse(response);
  } catch (error: any) {
    throw new Error(`Failed to delete listing from host: ${error.message}`);
  }
}

/**
 * Check if the host server is alive/responding
 * Returns true if host responds, false otherwise
 */
export async function checkHostAlive(
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT,
  timeout: number = 5000
): Promise<boolean> {
  try {
    console.log(`[Client] 🔍 Checking if host is alive at ${serverHost}:${serverPort}`);
    const response = await sendGetRequest('/hello', serverHost, serverPort);
    const isAlive = response.includes('hello') || response.trim() === 'hello';
    console.log(`[Client] ${isAlive ? '✅' : '❌'} Host is ${isAlive ? 'alive' : 'not responding'}`);
    return isAlive;
  } catch (error: any) {
    console.log(`[Client] ❌ Host health check failed: ${error.message || error}`);
    return false;
  }
}

/**
 * Send keep-alive packet to host server
 * This helps the host track active users
 */
export async function sendKeepAlive(
  deviceId: string,
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT
): Promise<number> {
  try {
    const body = JSON.stringify({ deviceId, vendorID: deviceId });
    const response = await sendPostRequest('/keepalive', JSON.parse(body), serverHost, serverPort);
    const parsed = JSON.parse(response);
    return parsed.activeUsers || 0;
  } catch (error: any) {
    console.error('[Client] Error sending keep-alive:', error);
    return 0;
  }
}

/**
 * Get active user count from host server
 */
export async function getActiveUserCount(
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT
): Promise<number> {
  try {
    const response = await sendGetRequest('/active-users', serverHost, serverPort);
    const parsed = JSON.parse(response);
    return parsed.activeUsers || 0;
  } catch (error: any) {
    console.error('[Client] Error getting active user count:', error);
    return 0;
  }
}

/**
 * Poll listings from the host server
 */
export async function pollListingsFromHost(
  serverHost: string = '127.0.0.1',
  serverPort: number = DEFAULT_SERVER_PORT
): Promise<any[]> {
  try {
    const response = await sendGetRequest('/listings', serverHost, serverPort);
    console.log(`[Client] Raw response length: ${response.length}`);
    console.log(`[Client] Raw response preview: ${response.substring(0, 200)}...`);
    
    // The response from sendGetRequest should already be just the body
    // But check if there are still headers
    const bodyIndex = response.indexOf('\r\n\r\n');
    let body = response;
    
    if (bodyIndex !== -1) {
      body = response.substring(bodyIndex + 4);
    }
    
    const trimmedBody = body.trim();
    
    // Handle empty response
    if (!trimmedBody || trimmedBody === '') {
      console.log('[Client] Empty response, returning empty array');
      return [];
    }
    
    // Try to parse JSON
    try {
      const parsed = JSON.parse(trimmedBody);
      console.log(`[Client] Successfully parsed ${Array.isArray(parsed) ? parsed.length : 'non-array'} listings`);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError: any) {
      console.error('[Client] JSON parse error:', parseError);
      console.error('[Client] Body that failed to parse:', trimmedBody.substring(0, 500));
      // Return empty array instead of throwing
      return [];
    }
  } catch (error: any) {
    console.error('[Client] Error polling listings:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}

