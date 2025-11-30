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
      await startServer();
      setHostServerStarted(true);
      await AsyncStorage.setItem('connectionMode', 'host');
      
      // Get the host's IP address to display
      const gatewayIP = await getHotspotGatewayIP();
      if (gatewayIP) {
        setHostIPAddress(gatewayIP);
      }
      
      // For emulators, show ADB instructions
      const isEmulator = gatewayIP === '10.0.2.2';
      const message = isEmulator
        ? `Server started! You are now a host.\n\nFor emulator setup:\n1. On your computer, run: "adb reverse tcp:3000 tcp:3000"\n2. Client emulator should connect to: 10.0.2.2`
        : gatewayIP 
          ? `Server started! Your host IP is: ${gatewayIP}\n\nClients should connect to this IP after joining your hotspot.`
          : 'Server started! You are now a host.\n\nClients should connect to your hotspot IP (usually 192.168.43.1 for Android).';
      
      Alert.alert('Success', message);
      // Navigate to home after a short delay
      setTimeout(() => {
        router.replace('/home');
      }, 1000);
    } catch (error) {
      console.error('Error starting server:', error);
      Alert.alert('Error', 'Failed to start server. Please try again.');
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
      const hostIP = await discoverHostIP(3000, 3000);
      if (hostIP) {
        setClientIP(hostIP);
        Alert.alert('Host Found', `Found host at ${hostIP}. You can now connect.`);
      } else {
        Alert.alert(
          'No Host Found',
          Platform.OS === 'android'
            ? 'Could not find host.\n\nFor Emulators:\n1. Make sure host emulator has server running\n2. On your computer, run: "adb reverse tcp:3000 tcp:3000"\n3. Try connecting to 10.0.2.2 manually\n\nFor Real Devices:\n1. Connect to host\'s hotspot\n2. Host IP is usually 192.168.43.1'
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

  const handleConnectClient = async () => {
    // If IP field is empty, try auto-discovery first
    if (!clientIP.trim()) {
      const result = await connectToHostViaHotspot(3000);
      if (result.success && result.hostIP) {
        setClientIP(result.hostIP);
        setClientConnected(true);
        await AsyncStorage.setItem('connectionMode', 'client');
        Alert.alert('Success', `Connected to host at ${result.hostIP}! You are now a client.`);
        setTimeout(() => {
          router.replace('/home');
        }, 1000);
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
      console.log(`Attempting to connect to host at ${hostIP}:3000...`);
      
      // Test connection to the host
      const response = await testServerConnection(hostIP, 3000);
      console.log('Connection successful! Response:', response);
      
      setClientConnected(true);
      await AsyncStorage.setItem('connectionMode', 'client');
      await AsyncStorage.setItem('hostIP', hostIP);
      Alert.alert('Success', 'Connected to host! You are now a client.');
      // Navigate to home after a short delay
      setTimeout(() => {
        router.replace('/home');
      }, 1000);
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
          userMessage += '2. On your computer, run: "adb reverse tcp:3000 tcp:3000"\n';
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
        <Text style={styles.headerTitle}>Choose Your Role</Text>
        <Text style={styles.headerSubtitle}>Become a host or connect as a client</Text>
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
              {Platform.OS === 'android' 
                ? 'For Android Emulators: Just start the server below, then run ADB command on your computer.\n\nFor Real Devices: Enable hotspot first, then start server.'
                : 'To become a host, you need to enable your device\'s hotspot first.'}
            </Text>

            {Platform.OS === 'android' && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={16} color="#4ade80" />
                <Text style={styles.infoText}>
                  Emulator Mode: After starting server, run on your computer:{'\n'}
                  <Text style={styles.codeText}>adb reverse tcp:3000 tcp:3000</Text>
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.linkButton}
              onPress={openHotspotSettings}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={20} color="#4ade80" />
              <Text style={styles.linkText}>Open Hotspot Settings</Text>
            </TouchableOpacity>

            <Text style={styles.stepText}>
              {Platform.OS === 'android'
                ? 'For Emulators:\n1. Click "Start Host" below\n2. On your computer, run: "adb reverse tcp:3000 tcp:3000"\n3. Clients can connect using 10.0.2.2\n\nFor Real Devices:\n1. Enable your device\'s hotspot\n2. Return to this app\n3. Click "Start Host" below'
                : '1. Enable your device\'s hotspot\n2. Return to this app\n3. Click the Host button below'}
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
                      {hostIPAddress === '10.0.2.2' 
                        ? 'Emulator Mode: Clients use 10.0.2.2\n(Run: adb reverse tcp:3000 tcp:3000)'
                        : `Host IP: ${hostIPAddress}`}
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
              {Platform.OS === 'android' 
                ? 'For Android Emulators:\n1. Host: Start server, then run "adb reverse tcp:3000 tcp:3000" on your computer\n2. Client: Use 10.0.2.2 (default) or click "Discover Host"\n\nFor Real Devices:\n1. Connect to host\'s hotspot\n2. Click "Discover Host" or enter IP (usually 192.168.43.1)'
                : selectedNetwork 
                  ? `Selected: ${selectedNetwork}. Click "Discover Host" or enter the host IP address.`
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
  },
  linkText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '500',
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
  },
  flexButton: {
    flex: 1,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  scanButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
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

