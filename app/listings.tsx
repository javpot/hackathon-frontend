import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
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
import { addListing, deleteAllListings, deleteListingById, getAllListings, getAllRessources, initDB, Listing, Resource } from '../database/db';
import { checkHostAlive, deleteListingFromHost, pollListingsFromHost, sendListingToHost } from '../services/localclient';
import { addListingToStore, getAllServerListings } from '../services/localServer';

type ServerListing = Listing & { clientId?: string; serverId?: string };

type TabType = 'myListings' | 'barter';

export default function ListingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('myListings');
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [barterListings, setBarterListings] = useState<ServerListing[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'host' | 'client' | null>(null);
  const [hostIP, setHostIP] = useState<string>('');

  // Form state
  const [vendorName, setVendorName] = useState('');
  const [vendorID, setVendorID] = useState('');
  const [description, setDescription] = useState('');
  const [productsInReturn, setProductsInReturn] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      await loadConnectionInfo(); // Load connection mode first
      await loadUserData(); // Then load user data (which will use connection mode)
      // Initialize DB with device-specific ID
      const deviceVendorID = await AsyncStorage.getItem('deviceVendorID');
      if (deviceVendorID) {
        await initDB(deviceVendorID);
      } else {
        await initDB();
      }
      // Wait a bit for vendorID state to be set, then load data
      setTimeout(() => {
        loadData();
      }, 100);
    };
    initialize();
  }, []);

  // Reload listings when vendorID changes (important for proper filtering)
  useEffect(() => {
    if (vendorID) {
      console.log(`[Device] vendorID changed to "${vendorID}" - reloading listings`);
      loadData();
    }
  }, [vendorID]);

  // Separate effect for when connection mode is set
  useEffect(() => {
    if (!connectionMode) {
      // If no connection mode, clear barter listings (server not running)
      setBarterListings([]);
      return;
    }

    const initialize = async () => {
      // If host, sync existing SQLite listings to server store
      if (connectionMode === 'host') {
        const { serverIsRunning } = await import('../services/localServer');
        if (serverIsRunning()) {
          await syncListingsToServer();
        } else {
          console.log('[Host] ⚠️ Server is not running - cannot sync listings');
          setBarterListings([]);
          return;
        }
      } else if (connectionMode === 'client' && hostIP) {
        // If client, sync existing listings to host
        // If sync fails, host might be down - check health first
        try {
          const isAlive = await checkHostAlive(hostIP, 3001, 5000);
          if (!isAlive) {
            console.log('[Client] ⚠️ Host is not alive during initialization - forcing navigation');
            await AsyncStorage.multiRemove(['connectionMode', 'hostIP']);
            router.replace('/connection-mode');
            return;
          }
          await syncClientListingsToHost();
        } catch (error) {
          console.error('[Client] Error during initial health check:', error);
          await AsyncStorage.multiRemove(['connectionMode', 'hostIP']);
          router.replace('/connection-mode');
          return;
        }
      }
      
      // Load barter listings after connection info is loaded
      // Small delay to ensure vendorID is set
      setTimeout(() => {
        loadBarterListings();
      }, 500);
    };
    
    initialize();
    
    // Set up constant polling for barter listings - both host and client need to refresh
    // Host polls to see new listings from clients, client polls to see all listings from host
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    if (connectionMode === 'client' && hostIP) {
      // Client polls host every 2 seconds
      pollInterval = setInterval(() => {
        loadBarterListings();
      }, 2000);
    } else if (connectionMode === 'host') {
      // Host also polls its own store every 3 seconds to see new client listings
      pollInterval = setInterval(() => {
        loadBarterListings();
      }, 3000); // 3 seconds for host - slightly less frequent since it's local
      // Also load immediately
      loadBarterListings();
    }

    // Set up health check for client mode - check every 7 seconds (between 5-10)
    let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
    if (connectionMode === 'client' && hostIP) {
      console.log('[Client] 🏥 Starting health check - will check host every 7 seconds');
      healthCheckInterval = setInterval(async () => {
        try {
          const isAlive = await checkHostAlive(hostIP, 3001, 5000);
          if (!isAlive) {
            console.log('[Client] ⚠️ Host is not responding - navigating back to connection mode');
            // Clear connection info
            await AsyncStorage.multiRemove(['connectionMode', 'hostIP']);
            // Clear barter listings
            setBarterListings([]);
            // Navigate back to connection mode
            router.replace('/connection-mode');
          }
        } catch (error) {
          console.error('[Client] Error during health check:', error);
          // If health check fails, cleanup listings and assume host is down
          if (vendorID && hostIP) {
            try {
              await deleteListingFromHost(vendorID, hostIP, 3001);
              console.log('[Client] ✅ Cleaned up listings before disconnect');
            } catch (cleanupError) {
              console.error('[Client] Error cleaning up listings:', cleanupError);
            }
          }
          await AsyncStorage.multiRemove(['connectionMode', 'hostIP']);
          setBarterListings([]);
          router.replace('/connection-mode');
        }
      }, 7000); // 7 seconds - between 5-10 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
      // If client disconnects, remove all their listings from host
      if (connectionMode === 'client' && hostIP && vendorID) {
        console.log('[Client] 🧹 Cleaning up: Removing all listings from host before disconnect');
        // Delete all listings for this client's vendorID
        deleteListingFromHost(vendorID, hostIP, 3000).catch(error => {
          console.error('[Client] Error cleaning up listings on disconnect:', error);
          // Continue anyway - cleanup is best effort
        });
      }
      // Clear barter listings when connection mode changes or component unmounts
      setBarterListings([]);
    };
  }, [connectionMode, hostIP, vendorID]);

  const syncClientListingsToHost = async () => {
    try {
      // Ensure DB is initialized
      const deviceVendorID = await AsyncStorage.getItem('deviceVendorID');
      if (deviceVendorID) {
        await initDB(deviceVendorID);
      }
      // Get all listings from SQLite
      const localListings = await getAllListings();
      console.log(`[Client] Syncing ${localListings.length} listings to host`);
      
      // Send each listing to host
      for (const listing of localListings) {
        // Update vendorID if it's the old simulator-device format
        let listingToSync = { ...listing };
        if (listingToSync.vendorID === 'simulator-device' && connectionMode) {
          listingToSync.vendorID = `${connectionMode}-${listingToSync.vendorID}`;
          console.log(`[Client] Updated listing vendorID from simulator-device to ${listingToSync.vendorID}`);
        }
        
        try {
          const result = await sendListingToHost(listingToSync, hostIP, 3001);
          console.log(`[Client] ✅ Synced listing "${listingToSync.vendorName}" to host:`, result);
        } catch (error: any) {
          console.error(`[Client] ❌ Failed to sync listing "${listingToSync.vendorName}" to host:`, error.message || error);
        }
      }
      console.log(`[Client] Sync complete. Sent ${localListings.length} listings to host`);
    } catch (error) {
      console.error('[Client] Error syncing listings to host:', error);
    }
  };

  const syncListingsToServer = async () => {
    try {
      // Ensure DB is initialized
      const deviceVendorID = await AsyncStorage.getItem('deviceVendorID');
      if (deviceVendorID) {
        await initDB(deviceVendorID);
      }
      // Get all listings from SQLite
      const localListings = await getAllListings();
      console.log(`[Host] Syncing ${localListings.length} listings from SQLite to server store`);
      
      // Add each listing to server store (if not already there)
      for (const listing of localListings) {
        // Update vendorID if it's the old simulator-device format
        let listingToSync = { ...listing };
        if (listingToSync.vendorID === 'simulator-device' && connectionMode) {
          listingToSync.vendorID = `${connectionMode}-${listingToSync.vendorID}`;
          console.log(`[Host] Updated listing vendorID from simulator-device to ${listingToSync.vendorID}`);
        }
        
        // Check if listing already exists in server store
        const existingListings = getAllServerListings();
        const exists = existingListings.some(
          l => l.vendorID === listingToSync.vendorID && 
               l.description === listingToSync.description &&
               l.productsInReturn === listingToSync.productsInReturn
        );
        
        if (!exists) {
          addListingToStore(listingToSync);
          console.log(`[Host] Synced listing to server store: ${listingToSync.vendorName} (vendorID: ${listingToSync.vendorID})`);
        }
      }
      console.log(`[Host] Sync complete. Server store now has ${getAllServerListings().length} listings`);
    } catch (error) {
      console.error('[Host] Error syncing listings to server:', error);
    }
  };

  const loadUserData = async () => {
    try {
      // Load username from AsyncStorage
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName) {
        setVendorName(storedName);
      }

      // Get or create a unique device ID
      let deviceVendorID = await AsyncStorage.getItem('deviceVendorID');
      
      if (!deviceVendorID) {
        // Generate a unique ID for this device instance
        // Use timestamp + random to ensure uniqueness even on simulators
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        deviceVendorID = `device-${timestamp}-${random}`;
        await AsyncStorage.setItem('deviceVendorID', deviceVendorID);
        console.log(`[Device] Generated new unique vendorID: ${deviceVendorID}`);
      } else {
        console.log(`[Device] Using existing vendorID: ${deviceVendorID}`);
      }
      
      // Update vendorID with connection mode prefix if available
      const mode = await AsyncStorage.getItem('connectionMode');
      if (mode) {
        // Only add mode prefix if not already present
        const finalVendorID = deviceVendorID.startsWith(`${mode}-`) 
          ? deviceVendorID 
          : `${mode}-${deviceVendorID}`;
        setVendorID(finalVendorID);
        console.log(`[${mode}] Set vendorID to: ${finalVendorID}`);
      } else {
        setVendorID(deviceVendorID);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadConnectionInfo = async () => {
    try {
      const mode = await AsyncStorage.getItem('connectionMode');
      const ip = await AsyncStorage.getItem('hostIP');
      setConnectionMode(mode as 'host' | 'client' | null);
      // Default to 10.0.2.2 for Android emulators (maps to host machine)
      // For real devices, this should be set when connecting
      setHostIP(ip || (Platform.OS === 'android' ? '10.0.2.2' : '172.20.10.1'));
    } catch (error) {
      console.error('Error loading connection info:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Ensure DB is initialized with current device ID
      const deviceVendorID = await AsyncStorage.getItem('deviceVendorID');
      if (deviceVendorID) {
        await initDB(deviceVendorID);
      } else {
        await initDB();
      }
      const allListings = await getAllListings();
      const allResources = await getAllRessources();
      
      // Get the current device's vendorID - ensure we have it
      let currentDeviceID = vendorID;
      let baseDeviceID = '';
      
      // If vendorID state is not set, get it from AsyncStorage
      if (!currentDeviceID) {
        const storedDeviceID = await AsyncStorage.getItem('deviceVendorID');
        const mode = await AsyncStorage.getItem('connectionMode');
        if (storedDeviceID) {
          baseDeviceID = storedDeviceID;
          currentDeviceID = mode ? `${mode}-${storedDeviceID}` : storedDeviceID;
          // Update state for next time
          setVendorID(currentDeviceID);
        } else {
          // No device ID yet - show all listings (shouldn't happen after first run)
          console.log('[Device] ⚠️ No device vendorID found - showing all listings');
          setMyListings(allListings);
          setResources(allResources);
          setLoading(false);
          return;
        }
      } else {
        // Extract base device ID from current vendorID
        baseDeviceID = currentDeviceID.replace(/^(host|client)-/, '');
      }
      
      // Get connection mode for old format matching
      const mode = await AsyncStorage.getItem('connectionMode');
      
      console.log(`[Device] Loading listings - Current vendorID: "${currentDeviceID}", Base ID: "${baseDeviceID}", Mode: "${mode}"`);
      console.log(`[Device] Total listings in SQLite: ${allListings.length}`);
      
      // Filter listings by vendorID - only show listings created by this device
      // Match if:
      // 1. vendorID exactly matches current device ID (with mode prefix)
      // 2. OR vendorID matches base device ID (for old listings without mode prefix)
      // 3. OR listing has old format and device is in same mode (backward compatibility)
      const myDeviceListings = allListings.filter(listing => {
        if (!listing.vendorID) {
          return false;
        }
        
        // Exact match with current device ID
        if (listing.vendorID === currentDeviceID) {
          return true;
        }
        
        // Match with base device ID (without mode prefix)
        const listingBaseID = listing.vendorID.replace(/^(host|client)-/, '');
        if (baseDeviceID && listingBaseID === baseDeviceID) {
          return true;
        }
        
        // Handle old format: if listing has old "simulator-device" format and we're in the same mode
        // This is for backward compatibility with existing listings
        if (mode && (listing.vendorID === 'simulator-device' || listing.vendorID === `${mode}-simulator-device`)) {
          // Only match if this device also has the old format (for backward compatibility)
          if (baseDeviceID.includes('simulator-device') || currentDeviceID.includes('simulator-device')) {
            return true;
          }
        }
        
        return false;
      });
      
      console.log(`[Device] ✅ Loaded ${myDeviceListings.length} listings for this device (from ${allListings.length} total)`);
      if (myDeviceListings.length === 0 && allListings.length > 0) {
        console.log(`[Device] ⚠️ WARNING: No listings matched! Current vendorID: "${currentDeviceID}", Listing vendorIDs:`, allListings.map(l => l.vendorID));
      }
      
      setMyListings(myDeviceListings);
      setResources(allResources);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const loadBarterListings = async () => {
    try {
      if (connectionMode === 'host') {
        // Check if server is running - if not, clear barter listings
        const { serverIsRunning } = await import('../services/localServer');
        if (!serverIsRunning()) {
          console.log('[Host] ⚠️ Server is not running - clearing barter listings');
          setBarterListings([]);
          return;
        }
        
        // Host gets listings from in-memory store
        const serverListings = getAllServerListings();
        // Get current vendorID - use the same logic as loadUserData to ensure exact match
        let currentVendorID = vendorID;
        if (!currentVendorID) {
          // Use the exact same logic as loadUserData
          const deviceVendorID = await AsyncStorage.getItem('deviceVendorID');
          const mode = await AsyncStorage.getItem('connectionMode');
          if (deviceVendorID && mode) {
            // Only add mode prefix if not already present (same logic as loadUserData)
            currentVendorID = deviceVendorID.startsWith(`${mode}-`) 
              ? deviceVendorID 
              : `${mode}-${deviceVendorID}`;
            setVendorID(currentVendorID);
            console.log(`[Host] Set vendorID from AsyncStorage: ${currentVendorID}`);
          } else if (mode === 'host') {
            currentVendorID = 'host-simulator-device'; // Fallback for simulator
            setVendorID(currentVendorID);
            console.log(`[Host] Set vendorID to fallback: ${currentVendorID}`);
          }
        }
        
        // Also try to get base device ID for flexible matching
        const baseDeviceID = currentVendorID ? currentVendorID.replace(/^(host|client)-/, '') : null;
        
        console.log(`[Host] 🔄 Regenerating barter list - Total server listings: ${serverListings.length}`);
        console.log(`[Host] My vendorID: "${currentVendorID}", Base ID: "${baseDeviceID || 'N/A'}"`);
        console.log(`[Host] State vendorID: "${vendorID}"`);
        if (serverListings.length > 0) {
          console.log(`[Host] All server listings:`, serverListings.map(l => ({ 
            vendorID: l.vendorID, 
            clientId: l.clientId, 
            vendorName: l.vendorName,
            serverId: l.serverId,
            isOwn: l.vendorID === currentVendorID || l.clientId === currentVendorID || 
                   (baseDeviceID && l.vendorID?.replace(/^(host|client)-/, '') === baseDeviceID) ||
                   (baseDeviceID && l.clientId?.replace(/^(host|client)-/, '') === baseDeviceID)
          })));
        } else {
          console.log(`[Host] ⚠️ No listings in server store!`);
        }
        
        // Filter out own listings (by vendorID and clientId)
        // Also deduplicate by serverId to prevent duplicates
        const seenServerIds = new Set<string>();
        const filtered = currentVendorID 
          ? serverListings
              .filter(listing => {
                // Deduplicate by serverId
                if (listing.serverId && seenServerIds.has(listing.serverId)) {
                  return false;
                }
                if (listing.serverId) {
                  seenServerIds.add(listing.serverId);
                }
                
                // Check if this is the host's own listing
                // Extract base IDs for comparison (remove host/client prefix)
                const listingVendorBaseID = listing.vendorID ? listing.vendorID.replace(/^(host|client)-/, '') : null;
                const listingClientBaseID = listing.clientId ? listing.clientId.replace(/^(host|client)-/, '') : null;
                
                // Check multiple ways to identify own listings:
                // 1. Exact vendorID match
                // 2. Exact clientId match (when host adds listing, clientId = vendorID)
                // 3. Base ID match (for flexible matching without prefix)
                // Note: When host adds listing via addListingToStore, clientId is set to listing.vendorID
                const isOwnListing = 
                  (listing.vendorID && listing.vendorID === currentVendorID) ||  // Exact vendorID match
                  (listing.clientId && listing.clientId === currentVendorID) ||  // Exact clientId match
                  (baseDeviceID && listingVendorBaseID && listingVendorBaseID === baseDeviceID) ||  // Base vendorID match
                  (baseDeviceID && listingClientBaseID && listingClientBaseID === baseDeviceID);     // Base clientId match
                
                if (isOwnListing) {
                  console.log(`[Host] ❌ Filtering out OWN listing: vendorID="${listing.vendorID}" (base: "${listingVendorBaseID}"), clientId="${listing.clientId}" (base: "${listingClientBaseID}"), myVendorID="${currentVendorID}" (base: "${baseDeviceID}")`);
                  return false;
                } else {
                  console.log(`[Host] ✅ Keeping OTHER listing: vendorID="${listing.vendorID}", clientId="${listing.clientId}", vendorName="${listing.vendorName}"`);
                  return true;
                }
              })
          : serverListings; // Show all if vendorID not set yet (shouldn't happen)
        
        console.log(`[Host] 📊 Filtered barter listings: ${filtered.length} (filtered out ${serverListings.length - filtered.length} own/duplicate listings)`);
        if (filtered.length > 0) {
          console.log(`[Host] 📋 Barter listings to display:`, filtered.map(l => `${l.vendorName} (${l.vendorID}, serverId: ${l.serverId})`));
        } else if (serverListings.length > 0) {
          console.log(`[Host] ⚠️ WARNING: Have ${serverListings.length} server listings but 0 in barter! Check filtering logic.`);
        }
        // Always update, even if empty (to reflect deletions)
        setBarterListings(filtered);
      } else if (connectionMode === 'client' && hostIP) {
        // Client polls host for listings - this regenerates the barter list every time
        // If connection fails, force navigation back to connection mode
        let serverListings;
        try {
          serverListings = await pollListingsFromHost(hostIP, 3001);
        } catch (error) {
          console.log('[Client] ⚠️ Failed to poll host - server is down, cleaning up and forcing navigation');
          // Remove client listings from host before disconnecting
          if (vendorID && hostIP) {
            try {
              await deleteListingFromHost(vendorID, hostIP, 3001);
              console.log('[Client] ✅ Cleaned up listings before disconnect');
            } catch (cleanupError) {
              console.error('[Client] Error cleaning up listings:', cleanupError);
            }
          }
          // Clear connection info
          await AsyncStorage.multiRemove(['connectionMode', 'hostIP']);
          // Clear barter listings
          setBarterListings([]);
          // Force navigation back to connection mode
          router.replace('/connection-mode');
          return;
        }
        console.log(`[Client] Received ${serverListings?.length || 0} listings from host, My vendorID: "${vendorID}"`);
        if (serverListings && serverListings.length > 0) {
          console.log(`[Client] Server listings:`, serverListings.map((l: any) => ({ 
            vendorID: l.vendorID, 
            clientId: l.clientId, 
            vendorName: l.vendorName,
            serverId: l.serverId 
          })));
        } else {
          console.log(`[Client] ⚠️ No listings received from host`);
        }
        
        // Filter out own listings (by vendorID - the device ID)
        // Only filter if vendorID is set
        // This regenerates the barter list with current data (including deletions)
        // Also deduplicate by serverId to prevent duplicates
        const seenServerIds = new Set<string>();
        const filtered = vendorID
          ? (serverListings || []).filter(
              (listing: any) => {
                // Deduplicate by serverId
                if (listing.serverId && seenServerIds.has(listing.serverId)) {
                  console.log(`[Client] ⚠️ Skipping duplicate listing: serverId=${listing.serverId}`);
                  return false;
                }
                if (listing.serverId) {
                  seenServerIds.add(listing.serverId);
                }
                
                const isOwnListing = listing.vendorID === vendorID || listing.clientId === vendorID;
                if (isOwnListing) {
                  console.log(`[Client] Filtering out own listing: vendorID=${listing.vendorID}, clientId=${listing.clientId}, myVendorID=${vendorID}`);
                  return false;
                } else {
                  console.log(`[Client] ✅ Keeping listing: vendorID="${listing.vendorID}", vendorName="${listing.vendorName}"`);
                  return true;
                }
              }
            )
          : (serverListings || []); // Show all if vendorID not set yet
        console.log(`[Client] Regenerated barter list: ${filtered.length} listings (filtered out ${(serverListings?.length || 0) - filtered.length} own/duplicate listings)`);
        if (filtered.length > 0) {
          console.log(`[Client] Barter listings to display:`, filtered.map((l: any) => `${l.vendorName} (serverId: ${l.serverId})`));
        }
        // Always update the barter list, even if empty (to reflect deletions)
        setBarterListings(filtered);
      }
    } catch (error) {
      console.error('Error loading barter listings:', error);
      // Don't show alert for polling errors, just log
    }
  };

  const handleDeleteListing = async (listingId: number) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get the listing to find vendorID
              const listingToDelete = myListings.find(l => l.id === listingId);
              
              // Delete from local database
              await deleteListingById(listingId);
              
              // Also delete from host if connected (using vendorID or serverId if available)
              if (listingToDelete && (connectionMode === 'client' && hostIP)) {
                try {
                  // Try to delete by vendorID (server will find and delete matching listings)
                  await deleteListingFromHost(listingToDelete.vendorID, hostIP, 3000);
                  console.log('[Client] ✅ Listing deleted from host');
                } catch (error) {
                  console.error('[Client] ❌ Failed to delete listing from host:', error);
                  // Continue anyway
                }
              } else if (listingToDelete && connectionMode === 'host') {
                try {
                  // Host deletes from its own server store
                  await deleteListingFromHost(listingToDelete.vendorID, '127.0.0.1', 3000);
                  console.log('[Host] ✅ Listing deleted from host store');
                } catch (error) {
                  console.error('[Host] ❌ Failed to delete listing from host store:', error);
                }
              }
              
              await loadData(); // Reload my listings
              // Refresh barter listings immediately to reflect deletion
              setTimeout(() => {
                loadBarterListings();
              }, 300);
              Alert.alert('Success', 'Listing deleted successfully');
            } catch (error) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing');
            }
          },
        },
      ]
    );
  };

  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will delete ALL listings, clear device ID, and reset connection mode. This cannot be undone. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear SQLite listings
              await deleteAllListings();
              console.log('[Clear] ✅ All listings deleted from SQLite');
              
              // Clear server store (if host)
              if (connectionMode === 'host') {
                const { clearAllListings } = await import('../services/localServer');
                clearAllListings();
                console.log('[Clear] ✅ Server store cleared');
              }
              
              // Clear AsyncStorage (device ID, connection mode, host IP, username)
              await AsyncStorage.multiRemove(['deviceVendorID', 'connectionMode', 'hostIP', 'userName']);
              console.log('[Clear] ✅ AsyncStorage cleared');
              
              // Clear React state
              setMyListings([]);
              setBarterListings([]);
              setVendorID('');
              setVendorName('');
              setConnectionMode(null);
              setHostIP('');
              
              Alert.alert('Success', 'All data cleared! Please restart the app.');
              // Navigate back to initial screen
              router.replace('/');
            } catch (error) {
              console.error('[Clear] Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear all data');
            }
          },
        },
      ]
    );
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll permissions to select images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setImageBase64(base64);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Image picker not available. Please rebuild the app with: npx expo prebuild && npx expo run:android');
    }
  };

  const handleSubmit = async () => {
    if (!vendorName.trim() || !vendorID.trim() || !productsInReturn.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Use current vendorID from state (which should already be updated with connection mode)
      const currentVendorID = vendorID || 'unknown';
      
      const newListing: Listing = {
        ressource: selectedResourceId || 0, // Use 0 as default if no resource selected
        vendorName: vendorName.trim(),
        vendorID: currentVendorID, // Use state vendorID, not form field
        productsInReturn: productsInReturn.trim(),
        description: description.trim() || undefined,
        image: imageBase64 || undefined,
      };

      console.log(`[${connectionMode}] Creating listing with vendorID: ${newListing.vendorID}, vendorName: ${newListing.vendorName}`);
      
      // Save to local database
      await addListing(newListing);
      console.log(`[${connectionMode}] Created listing with vendorID: ${newListing.vendorID}, vendorName: ${newListing.vendorName}`);
      
      // Sync with host if connected (both client and host should send to server)
      console.log(`[${connectionMode}] Checking sync conditions - connectionMode: ${connectionMode}, hostIP: ${hostIP}`);
      if (connectionMode === 'client' && hostIP) {
        console.log(`[Client] 📤 Attempting to send listing to host at ${hostIP}:3001`);
        console.log(`[Client] Listing to send:`, {
          vendorID: newListing.vendorID,
          vendorName: newListing.vendorName,
          description: newListing.description?.substring(0, 50),
          productsInReturn: newListing.productsInReturn
        });
        try {
          const result = await sendListingToHost(newListing, hostIP, 3001);
          console.log('[Client] ✅ Listing synced to host successfully! Response:', result);
          // Immediately refresh barter to see if it appears
          setTimeout(() => {
            loadBarterListings();
          }, 500);
        } catch (error: any) {
          console.error('[Client] ❌ FAILED to sync listing to host!');
          console.error('[Client] Error type:', error.constructor.name);
          console.error('[Client] Error message:', error.message || error);
          console.error('[Client] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          Alert.alert('Warning', `Listing saved locally but failed to sync to host: ${error.message || 'Unknown error'}`);
          // Continue anyway - listing is saved locally
        }
      } else if (connectionMode === 'host') {
        // Host adds directly to its own server store (so clients can see it)
        try {
          const serverId = addListingToStore(newListing);
          console.log(`[Host] Listing added directly to server store with serverId: ${serverId}`);
          console.log(`[Host] Server store now has ${getAllServerListings().length} listings`);
          // Immediately refresh barter list to show the update
          setTimeout(() => {
            loadBarterListings();
          }, 300);
        } catch (error) {
          console.error('[Host] Failed to add listing to server store:', error);
        }
      }
      
      // Reset form (but keep vendor name and ID)
      const storedName = await AsyncStorage.getItem('userName');
      setVendorName(storedName || '');
      // Keep vendorID as it's device-specific
      setDescription('');
      setProductsInReturn('');
      setImageBase64(null);

      // Reload my listings
      await loadData();
      
      // Refresh barter listings after a short delay to ensure server has processed
      setTimeout(() => {
        loadBarterListings();
      }, 500);
      
      // Close form
      setShowForm(false);
      
      Alert.alert('Success', 'Listing created successfully');
    } catch (error) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listings</Text>
        <TouchableOpacity onPress={clearAllData} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'myListings' && styles.tabActive]}
            onPress={() => setActiveTab('myListings')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="list" 
              size={20} 
              color={activeTab === 'myListings' ? '#4ade80' : '#999'} 
            />
            <Text style={[styles.tabText, activeTab === 'myListings' && styles.tabTextActive]}>
              My Listings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'barter' && styles.tabActive]}
            onPress={() => setActiveTab('barter')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="swap-horizontal" 
              size={20} 
              color={activeTab === 'barter' ? '#4ade80' : '#999'} 
            />
            <Text style={[styles.tabText, activeTab === 'barter' && styles.tabTextActive]}>
              Barter
            </Text>
          </TouchableOpacity>
        </View>

        {/* Listings Feed - Full Screen */}
        <View style={styles.feedContainer}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'myListings' ? 'My Listings' : 'Barter - Available Listings'}
          </Text>
          {loading && activeTab === 'myListings' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4ade80" />
            </View>
          ) : (activeTab === 'myListings' ? myListings : barterListings).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>
                {activeTab === 'myListings' 
                  ? 'No listings yet' 
                  : 'No listings available from other users'}
              </Text>
              {activeTab === 'myListings' && (
                <Text style={styles.emptySubtext}>Tap the button below to create one</Text>
              )}
            </View>
          ) : (
            <ScrollView style={styles.feedScroll} showsVerticalScrollIndicator={true}>
              {(activeTab === 'myListings' ? myListings : barterListings).map((listing, index) => {
                const serverListing = listing as ServerListing;
                // Use serverId for barter listings, id for my listings, or create unique key
                const listingKey = activeTab === 'barter' 
                  ? serverListing.serverId || `barter-${serverListing.vendorID}-${index}`
                  : listing.id || `my-${index}`;
                return (
                  <View key={listingKey} style={styles.listingCard}>
                    {listing.image && (
                      <Image source={{ uri: listing.image }} style={styles.listingImage} />
                    )}
                    <View style={styles.listingContent}>
                      <View style={styles.listingHeader}>
                        <View style={styles.listingHeaderLeft}>
                          <Text style={styles.listingVendor}>{listing.vendorName}</Text>
                          <Text style={styles.listingID}>ID: {listing.vendorID}</Text>
                        </View>
                        {activeTab === 'myListings' && listing.id && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteListing(listing.id!)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                      {listing.description && (
                        <Text style={styles.listingDescription}>{listing.description}</Text>
                      )}
                      <Text style={styles.listingReturn}>Wants: {listing.productsInReturn}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Add Button - Floating at Bottom */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color="#000" />
        </TouchableOpacity>

        {/* Form Modal Overlay */}
        <Modal
          visible={showForm}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowForm(false);
            setVendorName('');
            setVendorID('');
            setProductsInReturn('');
            setSelectedResourceId(null);
            setImageBase64(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Listing</Text>
                <TouchableOpacity 
                  onPress={async () => {
                    setShowForm(false);
                    // Reset form (but keep vendor name and ID)
                    const storedName = await AsyncStorage.getItem('userName');
                    setVendorName(storedName || '');
                    // Keep vendorID as it's device-specific
                    setDescription('');
                    setProductsInReturn('');
                    setImageBase64(null);
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.formScroll} 
                contentContainerStyle={styles.formScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <Text style={styles.label}>Vendor Name</Text>
                <TextInput
                  style={styles.input}
                  value={vendorName}
                  onChangeText={setVendorName}
                  placeholder="Enter vendor name"
                  placeholderTextColor="#666"
                />

                <Text style={styles.label}>Vendor ID</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={vendorID}
                  editable={false}
                  placeholder="Device ID (auto-filled)"
                  placeholderTextColor="#666"
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the item you're listing..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.label}>Products in Return</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={productsInReturn}
                  onChangeText={setProductsInReturn}
                  placeholder="What do you want in return?"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.label}>Image (Optional)</Text>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage} activeOpacity={0.7}>
                  {imageBase64 ? (
                    <View>
                      <Image source={{ uri: imageBase64 }} style={styles.imagePreview} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => setImageBase64(null)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#4ade80" />
                      <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
                      <Text style={styles.imagePlaceholderSubtext}>Optional</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Listing</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4ade80',
  },
  tabText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#4ade80',
    fontWeight: '600',
  },
  feedContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1C1C1E',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: '#0a0a0a',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  resourceScroll: {
    marginVertical: 8,
  },
  resourceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  resourceChipSelected: {
    backgroundColor: '#4ade80',
    borderColor: '#4ade80',
  },
  resourceChipText: {
    color: '#fff',
    fontSize: 14,
  },
  resourceChipTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  imageButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4ade80',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#4ade80',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  imagePlaceholderSubtext: {
    color: '#666',
    marginTop: 4,
    fontSize: 11,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: '#4ade80',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  feedScroll: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#666',
    marginTop: 16,
    fontSize: 16,
  },
  listingCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  listingImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  listingContent: {
    padding: 16,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listingHeaderLeft: {
    flex: 1,
  },
  listingVendor: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  listingID: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginLeft: 8,
  },
  listingResource: {
    color: '#4ade80',
    fontSize: 14,
    marginBottom: 4,
  },
  listingDescription: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  listingReturn: {
    color: '#ccc',
    fontSize: 14,
  },
  emptySubtext: {
    color: '#999',
    marginTop: 8,
    fontSize: 14,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    height: '85%',
    maxHeight: 600,
    backgroundColor: '#0f1724',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
});

