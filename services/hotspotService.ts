import { Platform } from 'react-native';
import { DEFAULT_SERVER_PORT } from '../constants/connection';
import { getHostIP, setHostIP } from './connection';
import { checkHostAlive, testServerConnection } from './localclient';

/**
 * Hotspot Service - Handles hotspot-based network connections
 * 
 * When clients connect to the host's hotspot, this service helps:
 * 1. Detect the host's IP address (gateway IP on hotspot network)
 * 2. Connect to the host's local server
 * 3. Manage the connection lifecycle
 */

/**
 * Get the gateway IP address (host IP when connected to hotspot)
 * For Android emulators: Returns 10.0.2.2 (maps to host machine)
 * For real Android devices: Usually 192.168.43.1
 * On iOS hotspot: Usually 172.20.10.1
 * 
 * TODO: Replace with actual gateway detection when implementing real hotspot
 */
export async function getHotspotGatewayIP(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      // For Android emulators, use 10.0.2.2 (maps to host machine's localhost)
      // This requires ADB reverse port forwarding: adb reverse tcp:3000 tcp:3000
      // For real devices, would be the hotspot gateway (usually 192.168.43.1)
      return '10.0.2.2'; // Emulator mode - maps to host machine
    } else if (Platform.OS === 'ios') {
      // iOS hotspot default gateway
      return '172.20.10.1';
    }
    return null;
  } catch (error) {
    console.error('[Hotspot] Error getting gateway IP:', error);
    return null;
  }
}

/**
 * Discover the host IP by scanning common hotspot gateway IPs
 * For emulators: Checks 10.0.2.2 (maps to host machine)
 * For real devices: Checks common hotspot gateway IPs
 * Returns the first reachable host
 */
export async function discoverHostIP(
  port: number = DEFAULT_SERVER_PORT,
  timeout: number = 2000
): Promise<string | null> {
  console.log('[Hotspot] 🔍 Discovering host IP...');
  
  // For Android emulators, 10.0.2.2 maps to host machine's localhost
  // This requires ADB reverse port forwarding on the host machine
  const emulatorIP = '10.0.2.2';
  
  // Common hotspot gateway IPs for real devices
  const gatewayIPs = Platform.OS === 'android' 
    ? ['192.168.43.1', '192.168.137.1', '10.0.0.1'] // Android hotspot common IPs
    : ['172.20.10.1', '192.168.2.1']; // iOS hotspot common IPs
  
  // Try multiple ports in case server is using a different port (after hot reload)
  const portsToTry = [port, port + 1, port + 2, port + 3, port + 4];
  
  // For emulators, check 10.0.2.2 first (most common case)
  if (Platform.OS === 'android') {
    for (const testPort of portsToTry) {
      try {
        console.log(`[Hotspot] Checking emulator IP ${emulatorIP}:${testPort}...`);
        const isAlive = await checkHostAlive(emulatorIP, testPort, timeout);
        if (isAlive) {
          console.log(`[Hotspot] ✅ Found host at ${emulatorIP}:${testPort} (emulator mode)`);
          return emulatorIP;
        }
      } catch (error) {
        console.log(`[Hotspot] ❌ ${emulatorIP}:${testPort} not reachable`);
      }
    }
  }
  
  // Check hotspot gateway IPs (for real devices)
  for (const ip of gatewayIPs) {
    for (const testPort of portsToTry) {
      try {
        console.log(`[Hotspot] Checking ${ip}:${testPort}...`);
        const isAlive = await checkHostAlive(ip, testPort, timeout);
        if (isAlive) {
          console.log(`[Hotspot] ✅ Found host at ${ip}:${testPort}`);
          return ip;
        }
      } catch (error) {
        // Continue checking other IPs/ports
        console.log(`[Hotspot] ❌ ${ip}:${testPort} not reachable`);
      }
    }
  }
  
  console.log('[Hotspot] ❌ No host found');
  return null;
}

/**
 * Connect to host via hotspot
 * Automatically discovers host IP and connects
 */
export async function connectToHostViaHotspot(
  port: number = DEFAULT_SERVER_PORT
): Promise<{ success: boolean; hostIP: string | null; error?: string }> {
  try {
    console.log('[Hotspot] 🔌 Connecting to host via hotspot...');
    
    // First, try to discover the host IP
    const hostIP = await discoverHostIP(port, 3000);
    
    if (!hostIP) {
      return {
        success: false,
        hostIP: null,
        error: 'Could not find host on hotspot network. Make sure:\n1. Host device has hotspot enabled\n2. Host device has server running\n3. You are connected to the host\'s hotspot'
      };
    }
    
    // Test connection to the host
    try {
      const response = await testServerConnection(hostIP, port);
      if (response && response.includes('hello')) {
        // Save the host IP
        await setHostIP(hostIP);
        console.log(`[Hotspot] ✅ Connected to host at ${hostIP}:${port}`);
        return {
          success: true,
          hostIP
        };
      }
    } catch (error: any) {
      return {
        success: false,
        hostIP,
        error: `Found host at ${hostIP} but connection failed: ${error.message || 'Unknown error'}`
      };
    }
    
    return {
      success: false,
      hostIP,
      error: 'Connection test failed'
    };
  } catch (error: any) {
    console.error('[Hotspot] ❌ Error connecting via hotspot:', error);
    return {
      success: false,
      hostIP: null,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Get the current host IP (if already connected)
 */
export async function getCurrentHostIP(): Promise<string | null> {
  return await getHostIP();
}

/**
 * Check if currently connected to a host
 */
export async function isConnectedToHost(): Promise<boolean> {
  const hostIP = await getHostIP();
  if (!hostIP) return false;
  
  try {
    return await checkHostAlive(hostIP, DEFAULT_SERVER_PORT, 2000);
  } catch {
    return false;
  }
}

/**
 * Manual connection to a specific host IP
 * Useful when auto-discovery fails or for emulator testing
 */
export async function connectToHostIP(
  hostIP: string,
  port: number = DEFAULT_SERVER_PORT
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Hotspot] 🔌 Connecting to host at ${hostIP}:${port}...`);
    
    const response = await testServerConnection(hostIP, port);
    if (response && response.includes('hello')) {
      await setHostIP(hostIP);
      console.log(`[Hotspot] ✅ Connected to host at ${hostIP}:${port}`);
      return { success: true };
    }
    
    return {
      success: false,
      error: 'Connection test failed - server did not respond correctly'
    };
  } catch (error: any) {
    console.error(`[Hotspot] ❌ Failed to connect to ${hostIP}:`, error);
    return {
      success: false,
      error: error.message || 'Connection failed'
    };
  }
}

