import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import { connectToHostViaHotspot, discoverHostIP, getHotspotGatewayIP } from '../services/hotspotService';
import { startServer } from '../services/localServer';
import { testServerConnection } from '../services/localclient';

interface WiFiNetwork {
    SSID: string;
    BSSID: string;
    capabilities: string;
    frequency: number;
    level: number;
    timestamp: number;
}

export default function ConnectionModeScreen() {
  const router = useRouter();
  const [hostServerStarted, setHostServerStarted] = useState(false);
  // Default IP for Android emulator-to-emulator communication
  // For emulators with ADB forwarding: 10.0.2.2 maps to host machine's localhost
  // For real devices on hotspot: 192.168.43.1 (Android) or 172.20.10.1 (iOS)
  const [clientIP, setClientIP] = useState(Platform.OS === 'android' ? '10.0.2.2' : '172.20.10.1');
  const [clientConnected, setClientConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wifiNetworks, setWifiNetworks] = useState<WiFiNetwork[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [hostIPAddress, setHostIPAddress] = useState<string | null>(null);

  const openHotspotSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        // Try to open Android hotspot settings
        await Linking.openURL('android.settings.WIFI_TETHER_SETTINGS');
      } else if (Platform.OS === 'ios') {
        // iOS doesn't allow direct hotspot settings, open general settings
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening settings:', error);
      Alert.alert('Error', 'Could not open settings. Please manually enable hotspot in your device settings.');
    }
  };

  const handleStartHost = async () => {
    try {
      // Import stopServer to ensure we can stop any existing instance
      const { stopServer, serverIsRunning } = await import('../services/localServer');
      
      // Always try to stop any existing server first (even if state says it's not running,
      // it might still be running from a previous hot reload)
      console.log('[Host] Checking for existing server...');
      if (serverIsRunning()) {
        console.log('[Host] Server is running, stopping it first...');
      }
      
      try {
        await stopServer();
        // Wait longer for port to be fully released (especially after hot reload)
        console.log('[Host] Waiting for port to be released...');
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.log('[Host] Error stopping server (might not exist):', error);
        // Wait anyway
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Try to start the server with retry
      let retries = 2;
      let lastError: any = null;
      
      while (retries >= 0) {
        try {
          await startServer();
          break; // Success, exit retry loop
        } catch (error: any) {
          lastError = error;
          if (error.message?.includes('Address already in use') || error.message?.includes('EADDRINUSE')) {
            retries--;
            if (retries >= 0) {
              console.log(`[Host] Port still in use, waiting and retrying (${retries} retries left)...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              // Try stopping again
              try {
                await stopServer();
                await new Promise(resolve => setTimeout(resolve, 1000));
              } catch (e) {
                // Ignore
              }
            }
          } else {
            throw error; // Not a port conflict, throw immediately
          }
        }
      }
      
      if (retries < 0 && lastError) {
        throw new Error('Failed to start server after retries. Port 3001 is still in use. Please restart the app completely (not just hot reload).');
      }
      setHostServerStarted(true);
      await AsyncStorage.setItem('connectionMode', 'host');
      
      // Get the actual port being used (might be different from default if port was in use)
      const { getCurrentPort } = await import('../services/localServer');
      const actualPort = getCurrentPort();
      
      // Get the host's IP address to display
      const gatewayIP = await getHotspotGatewayIP();
      if (gatewayIP) {
        setHostIPAddress(gatewayIP);
      }
      
      // Navigate to home after a short delay
      setTimeout(() => {
        router.replace('/home');
      }, 500);
    } catch (error: any) {
      console.error('Error starting server:', error);
      const errorMessage = error?.message || 'Unknown error';
      
      if (errorMessage.includes('Address already in use') || errorMessage.includes('EADDRINUSE')) {
        Alert.alert(
          'Port Already in Use',
          'Port 3001 is already in use. This usually happens after a hot reload.\n\n' +
          'Solutions:\n' +
          '1. Restart the app completely (close and reopen, not just hot reload)\n' +
          '2. Wait 10-15 seconds and try again\n' +
          '3. If problem persists, restart your development server'
        );
      } else {
        Alert.alert('Error', `Failed to start server: ${errorMessage}`);
      }
    }
  };

  useEffect(() => {
    // Request location permission for WiFi scanning (required on Android 10+)
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const scanWiFiNetworks = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Supported', 'WiFi scanning is currently only supported on Android.');
      return;
    }

    setIsScanning(true);
    try {
      // Request location permission if not granted
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permission Required', 'Location permission is required to scan WiFi networks.');
          setIsScanning(false);
          return;
        }
      }

      // Load WiFi list
      const networks = await WifiManager.loadWifiList();
      // Filter out networks without SSID and remove duplicates
      const uniqueNetworks = networks
        .filter((net: WiFiNetwork) => net.SSID && net.SSID.trim() !== '')
        .filter((net: WiFiNetwork, index: number, self: WiFiNetwork[]) => 
          index === self.findIndex((n: WiFiNetwork) => n.SSID === net.SSID)
        )
        .sort((a: WiFiNetwork, b: WiFiNetwork) => b.level - a.level); // Sort by signal strength
      
      setWifiNetworks(uniqueNetworks);
    } catch (error: any) {
      console.error('Error scanning WiFi:', error);
      Alert.alert('Scan Failed', error.message || 'Could not scan for WiFi networks. Make sure location services are enabled.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleNetworkSelect = async (ssid: string) => {
    setSelectedNetwork(ssid);
    // Try to connect to the network (open networks only for now)
    try {
      // For open networks, we can connect without password
      // For protected networks, we'd need to prompt for password
      const isProtected = wifiNetworks.find(n => n.SSID === ssid)?.capabilities?.includes('WPA') || false;
      
      if (isProtected) {
        // For protected networks, we'll just select it and let user enter IP manually
        Alert.alert(
          'Protected Network',
          'This network is password protected. Please connect manually in WiFi settings, then enter the host IP address below.',
          [{ text: 'OK' }]
        );
      } else {
        // Try to connect to open network
        try {
          await WifiManager.connectToProtectedSSID(ssid, '', false);
          Alert.alert('Success', `Connected to ${ssid}. Now enter the host IP address.`);
        } catch (error) {
          // If connection fails, just select it
          console.log('Auto-connect failed, user can connect manually');
        }
      }
    } catch (error) {
      console.error('Error selecting network:', error);
    }
  };

  const handleDiscoverHost = async () => {
    setIsDiscovering(true);
    try {
      const hostIP = await discoverHostIP(3001, 2000);
      if (hostIP) {
        setClientIP(hostIP);
        Alert.alert('Host Found', `Found host at ${hostIP}. You can now connect.`);
      } else {
        Alert.alert(
          'No Host Found',
          Platform.OS === 'android'
            ? 'Could not find host.\n\nFor Emulators:\n1. Make sure host emulator has server running\n2. On your computer, run: "adb reverse tcp:3001 tcp:3001"\n3. Try connecting to 10.0.2.2 manually\n\nFor Real Devices:\n1. Connect to host\'s hotspot\n2. Host IP is usually 192.168.43.1'
            : 'Could not find host on hotspot network.\n\nMake sure:\n1. You are connected to the host\'s hotspot\n2. Host device has server running\n3. Try entering the IP manually'
        );
      }
    } catch (error: any) {
      console.error('Error discovering host:', error);
      Alert.alert('Discovery Failed', error.message || 'Could not discover host.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleOfflineMode = async () => {
    try {
      await AsyncStorage.setItem('connectionMode', 'offline');
      Alert.alert(
        'Offline Mode',
        'You are now in offline mode. The app will work without network connectivity.\n\nYou can still:\n• View your local listings\n• Create new listings\n• Use the chatbot\n\nNetwork features will be disabled.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/home');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error setting offline mode:', error);
      Alert.alert('Error', 'Failed to set offline mode');
    }
  };

  const handleConnectClient = async () => {
    // If IP field is empty, try auto-discovery first
    if (!clientIP.trim()) {
      const result = await connectToHostViaHotspot(3001);
      if (result.success && result.hostIP) {
        setClientIP(result.hostIP);
        setClientConnected(true);
        await AsyncStorage.setItem('connectionMode', 'client');
        setTimeout(() => {
          router.replace('/home');
        }, 500);
        return;
      } else {
        Alert.alert(
          'Auto-Connect Failed',
          result.error || 'Could not automatically find host. Please enter the host IP address manually or use "Discover Host" button.'
        );
        return;
      }
    }

    setIsConnecting(true);
    try {
      const hostIP = clientIP.trim();
      console.log(`Attempting to connect to host at ${hostIP}:3001...`);
      
      // Test connection to the host
      const response = await testServerConnection(hostIP, 3001);
      console.log('Connection successful! Response:', response);
      
      setClientConnected(true);
      await AsyncStorage.setItem('connectionMode', 'client');
      await AsyncStorage.setItem('hostIP', hostIP);
      // Navigate to home after a short delay
      setTimeout(() => {
        router.replace('/home');
      }, 500);
    } catch (error: any) {
      console.error('Error connecting to host:', error);
      const errorMessage = error.message || 'Could not connect to host.';
      let userMessage = errorMessage;
      
      // Provide helpful hints
      if (Platform.OS === 'android') {
        const isEmulatorIP = clientIP === '10.0.2.2';
        if (isEmulatorIP) {
          userMessage += '\n\nFor Android Emulators:\n';
          userMessage += '1. Host emulator: Make sure server is running\n';
          userMessage += '2. On your computer, run: "adb reverse tcp:3001 tcp:3001"\n';
          userMessage += '3. This forwards host machine port to host emulator\n';
          userMessage += '4. Client emulator connects to 10.0.2.2 (maps to host machine)';
        } else {
          userMessage += '\n\nFor Real Devices on Hotspot:\n';
          userMessage += '1. Make sure you are connected to the host\'s hotspot\n';
          userMessage += '2. Host IP is usually 192.168.43.1 (check hotspot settings)\n';
          userMessage += '3. Use "Discover Host" button to auto-find the host';
        }
      }
      
      Alert.alert('Connection Failed', userMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Mode</Text>
        <Text style={styles.headerSubtitle}>Select host, client, or offline mode</Text>
      </View>

      {/* OFFLINE MODE BUTTON - Full Width */}
      <View style={styles.offlineContainer}>
        <TouchableOpacity
          style={styles.offlineButton}
          onPress={handleOfflineMode}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-offline" size={24} color="#9ca3af" />
          <View style={styles.offlineButtonContent}>
            <Text style={styles.offlineButtonTitle}>Offline Mode</Text>
            <Text style={styles.offlineButtonSubtitle}>Use the app without network connectivity</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <View style={styles.splitContainer}>
        {/* LEFT SIDE - HOST */}
        <View style={styles.halfContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="server" size={24} color="#4ade80" />
            <Text style={styles.sectionTitle}>Host</Text>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
            <Text style={styles.instructionText}>
              {Platform.OS === 'ios'
                ? 'To become a host, enable your iOS hotspot first, then start the server below.'
                : 'To become a host, enable your device\'s hotspot first, then start the server below.'}
            </Text>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={openHotspotSettings}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={20} color="#4ade80" />
              <Text style={styles.linkText}>Open Hotspot Settings</Text>
            </TouchableOpacity>

            <Text style={styles.stepText}>
              {Platform.OS === 'ios'
                ? '1. Enable your iOS hotspot in Settings\n2. Return to this app\n3. Click "Start Host" below\n4. Note your hotspot IP (usually 172.20.10.1)'
                : '1. Enable your device\'s hotspot\n2. Return to this app\n3. Click "Start Host" below'}
            </Text>

            <TouchableOpacity
              style={[styles.actionButton, styles.hostButton, hostServerStarted && styles.buttonDisabled]}
              onPress={handleStartHost}
              disabled={hostServerStarted}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={20} color="#000" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>
                {hostServerStarted ? 'Server Running' : 'Start Host'}
              </Text>
            </TouchableOpacity>

            {hostServerStarted && (
              <View style={styles.statusContainer}>
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                  <Text style={styles.statusText}>Server Active</Text>
                </View>
                {hostIPAddress && (
                  <View style={styles.ipBadge}>
                    <Ionicons name="information-circle" size={16} color="#4ade80" />
                    <Text style={styles.ipText}>
                      {Platform.OS === 'ios'
                        ? `iOS Hotspot IP: ${hostIPAddress}\nClients connect to this IP`
                        : `Host IP: ${hostIPAddress}\nClients connect to this IP`}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>

        {/* DIVIDER */}
        <View style={styles.divider} />

        {/* RIGHT SIDE - CLIENT */}
        <View style={styles.halfContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="phone-portrait" size={24} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Client</Text>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
            <Text style={styles.instructionText}>
              Connect to the host's hotspot, then discover and connect to the host server.
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.scanButton, styles.flexButton]}
                onPress={handleDiscoverHost}
                disabled={isDiscovering}
                activeOpacity={0.7}
              >
                {isDiscovering ? (
                  <>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text style={styles.scanButtonText}>Discovering...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="search" size={20} color="#3b82f6" />
                    <Text style={styles.scanButtonText}>Discover Host</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scanButton, styles.flexButton]}
                onPress={scanWiFiNetworks}
                disabled={isScanning}
                activeOpacity={0.7}
              >
                {isScanning ? (
                  <>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text style={styles.scanButtonText}>Scanning...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="wifi" size={20} color="#3b82f6" />
                    <Text style={styles.scanButtonText}>Scan WiFi</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {wifiNetworks.length > 0 && (
              <View style={styles.networksContainer}>
                <Text style={styles.networksTitle}>Available Networks:</Text>
                {wifiNetworks.map((network, index) => (
                  <TouchableOpacity
                    key={`${network.SSID}-${index}`}
                    style={[
                      styles.networkItem,
                      selectedNetwork === network.SSID && styles.networkItemSelected
                    ]}
                    onPress={() => handleNetworkSelect(network.SSID)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.networkItemContent}>
                      <Ionicons 
                        name={network.capabilities?.includes('WPA') ? 'lock-closed' : 'lock-open'} 
                        size={16} 
                        color={selectedNetwork === network.SSID ? '#3b82f6' : '#999'} 
                      />
                      <Text style={[
                        styles.networkSSID,
                        selectedNetwork === network.SSID && styles.networkSSIDSelected
                      ]}>
                        {network.SSID}
                      </Text>
                    </View>
                    <View style={styles.networkInfo}>
                      <Text style={styles.networkSignal}>
                        {network.level > -50 ? '●●●' : network.level > -70 ? '●●○' : '●○○'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Host IP Address</Text>
            <TextInput
              style={styles.input}
              value={clientIP}
              onChangeText={setClientIP}
              placeholder={Platform.OS === 'android' ? "10.0.2.2 (emulator with ADB)" : "172.20.10.1"}
              placeholderTextColor="#666"
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.hintText}>
              {Platform.OS === 'ios'
                ? selectedNetwork 
                  ? `Selected: ${selectedNetwork}. Click "Discover Host" or enter the host IP address (usually 172.20.10.1).`
                  : 'Connect to the host\'s iOS hotspot, then click "Discover Host" or enter the host IP (usually 172.20.10.1).'
                : Platform.OS === 'android'
                  ? 'Connect to the host\'s hotspot, then click "Discover Host" or enter the host IP (usually 192.168.43.1).'
                  : 'Connect to the host\'s hotspot, then click "Discover Host" or enter the host IP manually.'}
            </Text>

            <TouchableOpacity
              style={[styles.actionButton, styles.clientButton, (clientConnected || isConnecting) && styles.buttonDisabled]}
              onPress={handleConnectClient}
              disabled={clientConnected || isConnecting}
              activeOpacity={0.8}
            >
              {isConnecting ? (
                <>
                  <Ionicons name="hourglass-outline" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={[styles.actionButtonText, styles.clientButtonText]}>Connecting...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="link" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={[styles.actionButtonText, styles.clientButtonText]}>
                    {clientConnected ? 'Connected' : 'Connect as Client'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {clientConnected && (
              <View style={[styles.statusBadge, styles.clientBadge]}>
                <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
                <Text style={styles.statusText}>Connected to Host</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1724',
  },
  offlineContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  offlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
    gap: 12,
  },
  offlineButtonContent: {
    flex: 1,
  },
  offlineButtonTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  offlineButtonSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
  },
  header: {
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#999',
    fontSize: 14,
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  halfContainer: {
    flex: 1,
    padding: 16,
    minWidth: 0,
    overflow: 'hidden',
  },
  divider: {
    width: 1,
    backgroundColor: '#1C1C1E',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
    paddingRight: 0,
  },
  instructionText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
  },
  linkText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  stepText: {
    color: '#999',
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
    width: '100%',
    minWidth: 0,
  },
  hintText: {
    color: '#666',
    fontSize: 12,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    minWidth: 0,
    width: '100%',
    flexShrink: 1,
  },
  hostButton: {
    backgroundColor: '#4ade80',
  },
  clientButton: {
    backgroundColor: '#3b82f6',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 4,
  },
  actionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  clientButtonText: {
    color: '#fff',
  },
  statusContainer: {
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  ipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  ipText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  infoText: {
    color: '#4ade80',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  codeText: {
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    fontWeight: '600',
  },
  clientBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  statusText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  flexButton: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#3b82f6',
    minWidth: 0,
    flexShrink: 1,
  },
  scanButtonText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  networksContainer: {
    marginBottom: 16,
  },
  networksTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  networkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  networkItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  networkItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  networkSSID: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  networkSSIDSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkSignal: {
    color: '#999',
    fontSize: 12,
  },
});

