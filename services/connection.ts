import AsyncStorage from '@react-native-async-storage/async-storage';

const MODE_KEY = 'connection_mode';
const HOST_IP_KEY = 'host_ip';

/**
 * Get current mode: 'host' | 'client' | null
 */
export async function getMode(): Promise<string | null> {
  return await AsyncStorage.getItem(MODE_KEY);
}

/**
 * Set mode
 */
export async function setMode(mode: 'host' | 'client' | null): Promise<void> {
  if (mode) {
    await AsyncStorage.setItem(MODE_KEY, mode);
  } else {
    await AsyncStorage.removeItem(MODE_KEY);
  }
}

/**
 * Get host IP
 */
export async function getHostIP(): Promise<string | null> {
  return await AsyncStorage.getItem(HOST_IP_KEY);
}

/**
 * Set host IP
 */
export async function setHostIP(ip: string): Promise<void> {
  await AsyncStorage.setItem(HOST_IP_KEY, ip);
}
