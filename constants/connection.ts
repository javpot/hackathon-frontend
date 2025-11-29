// Connection constants
export const DEFAULT_SERVER_PORT = 3000;
export const DEFAULT_HOST = '0.0.0.0'; // Listen on all interfaces

// Storage keys
export const STORAGE_KEYS = {
  MODE: 'connection_mode', // 'host' | 'client'
  HOST_IP: 'host_ip',
  SERVER_PORT: 'server_port',
} as const;

// Connection modes
export type ConnectionMode = 'host' | 'client' | null;

