// Client-side HTTP functions using fetch (Expo Go compatible)
// Simplified to only support keep-alive and client functionality

import { NGROK_HOST_URL } from '../constants/connection';

const DEFAULT_SERVER_PORT = 3001;
const DEFAULT_TIMEOUT = 10000;

/**
 * Send HTTP request using fetch (Expo Go compatible)
 * Supports both ngrok URLs (https://) and local IPs (http://host:port)
 */
async function sendHttpRequest(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: any,
  serverHost: string = NGROK_HOST_URL, // Default to ngrok URL
  serverPort?: number // Optional, only used for local IPs
): Promise<string> {
  // If serverHost is a full URL (starts with http:// or https://), use it directly
  // Otherwise, construct URL from host and port
  const url = serverHost.startsWith('http://') || serverHost.startsWith('https://')
    ? `${serverHost}${path}`
    : `http://${serverHost}:${serverPort || DEFAULT_SERVER_PORT}${path}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Ngrok free tier requires these headers to bypass warning page
      'ngrok-skip-browser-warning': 'true',
    },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  };

  if (body && (method === 'POST' || method === 'DELETE')) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`[Client] ${method} ${url}`);
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    return text.trim();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: Server did not respond within 10 seconds');
    }
    throw new Error(`Connection error: ${error.message || error}`);
  }
}

/**
 * Check if the host server is alive/responding
 */
export async function checkHostAlive(
  serverHost: string = NGROK_HOST_URL,
  serverPort?: number
): Promise<boolean> {
  try {
    const hostDisplay = serverHost.startsWith('http') ? serverHost : `${serverHost}:${serverPort || DEFAULT_SERVER_PORT}`;
    console.log(`[Client] 🔍 Checking if host is alive at ${hostDisplay}`);
    const response = await sendHttpRequest('GET', '/hello', undefined, serverHost, serverPort);
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
  serverHost: string = NGROK_HOST_URL,
  serverPort?: number
): Promise<number> {
  try {
    const body = { deviceId, vendorID: deviceId };
    const response = await sendHttpRequest('POST', '/keepalive', body, serverHost, serverPort);
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
  serverHost: string = NGROK_HOST_URL,
  serverPort?: number
): Promise<number> {
  try {
    const response = await sendHttpRequest('GET', '/active-users', undefined, serverHost, serverPort);
    const parsed = JSON.parse(response);
    return parsed.activeUsers || 0;
  } catch (error: any) {
    console.error('[Client] Error getting active user count:', error);
    return 0;
  }
}

// Legacy functions - return empty/error for compatibility
export async function sendGetRequest(
  path: string = '/hello',
  serverHost: string = NGROK_HOST_URL,
  serverPort?: number
): Promise<string> {
  return sendHttpRequest('GET', path, undefined, serverHost, serverPort);
}

export async function sendPostRequest(
  path: string,
  body: any,
  serverHost: string = NGROK_HOST_URL,
  serverPort?: number
): Promise<string> {
  return sendHttpRequest('POST', path, body, serverHost, serverPort);
}

export async function sendDeleteRequest(
  path: string,
  serverHost: string = NGROK_HOST_URL,
  serverPort?: number
): Promise<string> {
  return sendHttpRequest('DELETE', path, undefined, serverHost, serverPort);
}

export async function testServerConnection(
  serverHost: string = NGROK_HOST_URL,
  serverPort?: number
): Promise<string> {
  return sendGetRequest('/hello', serverHost, serverPort);
}

export async function sendListingToHost(
  listing: any,
  serverHost: string = NGROK_HOST_URL,
  serverPort?: number
): Promise<any> {
  const response = await sendPostRequest('/listing', listing, serverHost, serverPort);
  return JSON.parse(response);
}

export async function deleteListingFromHost(
  listingIdOrVendorID: string,
  serverHost: string = NGROK_HOST_URL,
  serverPort?: number
): Promise<any> {
  const response = await sendDeleteRequest(`/listing/${listingIdOrVendorID}`, serverHost, serverPort);
  return JSON.parse(response);
}

export async function pollListingsFromHost(
  serverHost: string = NGROK_HOST_URL,
  serverPort?: number
): Promise<any[]> {
  try {
    const response = await sendGetRequest('/listings', serverHost, serverPort);
    const trimmedBody = response.trim();
    
    if (!trimmedBody || trimmedBody === '') {
      return [];
    }
    
    const parsed = JSON.parse(trimmedBody);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    console.error('[Client] Error polling listings:', error);
    return [];
  }
}
