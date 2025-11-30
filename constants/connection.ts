// Connection constants
export const DEFAULT_SERVER_PORT = 3001; // Changed to 3001 for testing (port 3000 was blocked)
export const DEFAULT_HOST = '0.0.0.0'; // Listen on all interfaces

// Host network IP for emulator-to-emulator communication (simulates hotspot)
// This is the host machine's IP on the local network
// Update this if your host's IP changes
export const HOST_NETWORK_IP = '172.20.10.2'; // Your host's network IP

// Storage keys
export const STORAGE_KEYS = {
  MODE: 'connection_mode', // 'host' | 'client'
  HOST_IP: 'hostIP', // Keep consistent with app usage
  SERVER_PORT: 'server_port',
} as const;

// Connection modes
export type ConnectionMode = 'host' | 'client' | null;

