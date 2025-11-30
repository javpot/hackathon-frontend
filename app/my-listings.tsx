import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
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
import { useAlerts } from '../contexts/AlertContext';
import { addListing, deleteAllListings, deleteListingById, getAllListings, getAllRessources, initDB, Listing, Resource } from '../database/db';
import { checkHostAlive, deleteListingFromHost, sendListingToHost } from '../services/localclient';

const { width } = Dimensions.get('window');

export default function ListingsScreen() {
  const router = useRouter();
  const { addAlert } = useAlerts();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'client' | null>(null);
  const [hostIP, setHostIP] = useState<string>('');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  // Form state
  const [vendorName, setVendorName] = useState('');
  const [vendorID, setVendorID] = useState('');
  const [description, setDescription] = useState('');
  const [productsInReturn, setProductsInReturn] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      // Get user location
      const getLocation = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setUserLocation(location);
          }
        } catch (error) {
          console.error('Error getting location:', error);
        }
      };
      getLocation();
      // Load data immediately
      loadData();
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

  // Sync listings to server when connection mode is set
  useEffect(() => {
    if (!connectionMode) {
      return;
    }

    const initialize = async () => {
      // Client mode only - sync existing listings to host (uses hardcoded ngrok URL)
      if (connectionMode === 'client') {
        // If client, sync existing listings to host
        try {
          const isAlive = await checkHostAlive();
          if (isAlive) {
            await syncClientListingsToHost();
          } else {
            console.log('[Client] ⚠️ Host is not alive during initialization');
          }
        } catch (error) {
          console.error('[Client] Error during initial sync:', error);
        }
      }
    };
    
    initialize();

    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
      // If client disconnects, remove all their listings from host
      if (connectionMode === 'client' && vendorID) {
        deleteListingFromHost(vendorID).catch(error => {
          console.error('[Client] Error cleaning up listings on disconnect:', error);
        });
      }
    };
  }, [connectionMode, vendorID]);

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
          const result = await sendListingToHost(listingToSync);
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
      // Load data in parallel for better performance
      const [allListings, allResources] = await Promise.all([
        getAllListings(),
        getAllRessources()
      ]);
      
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

  // Removed loadBarterListings - barter tab removed
  const _removed_loadBarterListings = async () => {
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
      } else if (connectionMode === 'client') {
        // Client polls host for listings - this regenerates the barter list every time
        // Uses hardcoded ngrok URL
        let serverListings;
        try {
          serverListings = await pollListingsFromHost();
        } catch (error) {
          console.log('[Client] ⚠️ Failed to poll host - server is down, cleaning up and forcing navigation');
          // Remove client listings from host before disconnecting
          if (vendorID) {
            try {
              await deleteListingFromHost(vendorID);
              console.log('[Client] ✅ Cleaned up listings before disconnect');
            } catch (cleanupError) {
              console.error('[Client] Error cleaning up listings:', cleanupError);
            }
          }
          // Clear connection info
          await AsyncStorage.multiRemove(['connectionMode', 'hostIP']);
          // Clear barter listings
          setBarterListings([]);
          // Clear barter listings and continue (don't navigate)
          setBarterListings([]);
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
              
              // Optimistically update UI - remove from state immediately
              setMyListings(prev => prev.filter(l => l.id !== listingId));
              
              // Delete from local database
              await deleteListingById(listingId);
              
              // Also delete from host if connected (using vendorID or serverId if available)
              if (listingToDelete && (connectionMode === 'client' && hostIP)) {
                try {
                  // Try to delete by vendorID (server will find and delete matching listings)
                  await deleteListingFromHost(listingToDelete.vendorID);
                  console.log('[Client] ✅ Listing deleted from host');
                } catch (error) {
                  console.error('[Client] ❌ Failed to delete listing from host:', error);
                  // Continue anyway
                }
              } else if (listingToDelete && connectionMode === 'host') {
                try {
                  // Host deletes from its own server store
                  await deleteListingFromHost(listingToDelete.vendorID);
                  console.log('[Host] ✅ Listing deleted from host store');
                } catch (error) {
                  console.error('[Host] ❌ Failed to delete listing from host store:', error);
                }
              }
              
              // Reload in background to ensure sync, but UI already updated
              loadData().catch(error => {
                console.error('Error reloading after delete:', error);
                // If reload fails, revert the optimistic update
                if (listingToDelete) {
                  setMyListings(prev => {
                    if (!prev.find(l => l.id === listingId)) {
                      return [...prev, listingToDelete];
                    }
                    return prev;
                  });
                }
              });
            } catch (error) {
              console.error('Error deleting listing:', error);
              // Revert optimistic update on error
              const listingToDelete = myListings.find(l => l.id === listingId);
              if (listingToDelete) {
                setMyListings(prev => {
                  if (!prev.find(l => l.id === listingId)) {
                    return [...prev, listingToDelete];
                  }
                  return prev;
                });
              }
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
              
              
              // Clear AsyncStorage (device ID, connection mode, host IP, username)
              await AsyncStorage.multiRemove(['deviceVendorID', 'connectionMode', 'hostIP', 'userName']);
              console.log('[Clear] ✅ AsyncStorage cleared');
              
              // Clear React state
              setMyListings([]);
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
      
      // Get user coordinates
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (userLocation) {
        latitude = userLocation.coords.latitude;
        longitude = userLocation.coords.longitude;
      }

      const newListing: Listing = {
        ressource: selectedResourceId || 0, // Use 0 as default if no resource selected
        vendorName: vendorName.trim(),
        vendorID: currentVendorID, // Use state vendorID, not form field
        productsInReturn: productsInReturn.trim(),
        description: description.trim() || undefined,
        image: imageBase64 || undefined,
        latitude,
        longitude,
      };

      console.log(`[${connectionMode}] Creating listing with vendorID: ${newListing.vendorID}, vendorName: ${newListing.vendorName}`);
      
      // Save to local database
      await addListing(newListing);
      console.log(`[${connectionMode}] Created listing with vendorID: ${newListing.vendorID}, vendorName: ${newListing.vendorName}`);
      
      // Sync with host if connected (uses hardcoded ngrok URL)
      console.log(`[${connectionMode}] Checking sync conditions - connectionMode: ${connectionMode}`);
      if (connectionMode === 'client') {
        console.log(`[Client] 📤 Attempting to send listing to host via ngrok`);
        console.log(`[Client] Listing to send:`, {
          vendorID: newListing.vendorID,
          vendorName: newListing.vendorName,
          description: newListing.description?.substring(0, 50),
          productsInReturn: newListing.productsInReturn
        });
        try {
          const result = await sendListingToHost(newListing);
          console.log('[Client] ✅ Listing synced to host successfully! Response:', result);
        } catch (error: any) {
          console.error('[Client] ❌ FAILED to sync listing to host!');
          console.error('[Client] Error type:', error.constructor.name);
          console.error('[Client] Error message:', error.message || error);
          console.error('[Client] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          Alert.alert('Warning', `Listing saved locally but failed to sync to host: ${error.message || 'Unknown error'}`);
          // Continue anyway - listing is saved locally
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

  const filteredListings = myListings.filter(listing => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      listing.vendorName?.toLowerCase().includes(query) ||
      listing.description?.toLowerCase().includes(query) ||
      listing.productsInReturn?.toLowerCase().includes(query)
    );
  });

  const renderItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.itemContainer}
    >
      {/* Image à gauche */}
      <View style={styles.imageWrapper}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={32} color="#666" />
          </View>
        )}
      </View>

      {/* Détails à droite */}
      <View style={styles.detailsContainer}>
        {/* Titre et Info Troc */}
        <View style={styles.infoTop}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.vendorName || 'Unknown Vendor'}
          </Text>

          {item.description && (
            <Text style={styles.itemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.tradeContainer}>
            <Text style={styles.tradeLabel}>Looking for:</Text>
            <Text style={styles.tradeItems} numberOfLines={2}>
              {item.productsInReturn || 'Not specified'}
            </Text>
          </View>
        </View>

        {/* Boutons d'Action (En bas à droite) */}
        <View style={styles.actionRow}>
          {/* Delete Button */}
          {item.id && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={() => handleDeleteListing(item.id!)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
          
          {/* Bubble Button - Add waypoint and trade card */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.bubbleButton]}
            onPress={async () => {
              try {
                if (item.latitude && item.longitude) {
                  const lat = Number(item.latitude);
                  const lon = Number(item.longitude);
                  
                  if (isNaN(lat) || isNaN(lon)) {
                    console.error('[My Listings] Invalid coordinates:', { lat, lon });
                    Alert.alert('Error', 'Invalid location coordinates');
                    return;
                  }
                  
                  console.log('[My Listings] Adding trade waypoint:', {
                    lat,
                    lon,
                    vendorName: item.vendorName
                  });
                  
                  // Add waypoint to map
                  addAlert({
                    type: 'info',
                    coords: {
                      latitude: lat,
                      longitude: lon,
                    },
                    message: `${item.vendorName}${item.description ? ' - ' + item.description : ''}`,
                  });
                  
                  console.log('[My Listings] ✅ Waypoint added successfully');
                  // Navigate to map to show the waypoint
                  router.push('/map');
                  Alert.alert('Success', 'Trade location added to map');
                } else {
                  Alert.alert('Error', 'This listing has no location data');
                }
              } catch (error) {
                console.error('[My Listings] Error adding trade waypoint:', error);
                Alert.alert('Error', 'Failed to add trade location to map');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={18} color="#4ade80" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity onPress={clearAllData} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* --- SEARCH BAR --- */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6b7280" />
          <TextInput
            placeholder="Search your listings..."
            placeholderTextColor="#6b7280"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* --- LISTE --- */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      ) : filteredListings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetags-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>
            {searchQuery.trim()
              ? 'No listings match your search'
              : 'No listings yet'}
          </Text>
          {!searchQuery.trim() && (
            <Text style={styles.emptySubtext}>Tap the button below to create one</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id?.toString() || `listing-${item.vendorID}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Button - Floating at Bottom */}
      <View style={styles.addButtonContainer} pointerEvents="box-none">
        <TouchableOpacity 
          style={styles.addButton}
          onPress={async () => {
            console.log('[My Listings] Add button pressed');
            // Open form immediately
            setShowForm(true);
            
            // Pre-fill form with default values (non-blocking)
            AsyncStorage.getItem('userName').then(storedName => {
              setVendorName(storedName || '');
            }).catch(error => {
              console.error('Error loading username:', error);
            });
            
            // Reset form fields
            setDescription('');
            setProductsInReturn('');
            setSelectedResourceId(null);
            setImageBase64(null);
            
            // Get fresh location in background (non-blocking)
            Location.requestForegroundPermissionsAsync()
              .then(({ status }) => {
                if (status === 'granted') {
                  return Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                  });
                }
                return null;
              })
              .then(location => {
                if (location) {
                  setUserLocation(location);
                }
              })
              .catch(error => {
                console.error('Error getting location:', error);
              });
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color="#000" />
        </TouchableOpacity>
      </View>

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
                    setSelectedResourceId(null);
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
                  placeholder="Enter your name"
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
                  placeholder="What are you offering? (e.g., Water bottles, Medical supplies)"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.label}>Products in Return</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={productsInReturn}
                  onChangeText={setProductsInReturn}
                  placeholder="What do you need? (e.g., Food, Batteries, Tools)"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    paddingBottom: 90,
    overflow: 'visible',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  // -- ITEM CARD STYLE (matching listings tab) --
  itemContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#171717',
    borderRadius: 16,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: '#262626',
    minHeight: 130,
  },
  imageWrapper: {
    width: 110,
    height: '100%',
    backgroundColor: '#202020',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  detailsContainer: {
    flex: 1,
    padding: 12,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  infoTop: {
    // Conteneur pour le texte du haut
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemDescription: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  tradeContainer: {
    marginTop: 2,
  },
  tradeLabel: {
    color: '#9ca3af',
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  tradeItems: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '500',
  },
  // -- BOUTONS D'ACTION --
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    paddingRight: 4,
    marginBottom: 0,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  deleteActionButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bubbleButton: {
    backgroundColor: '#262626',
    borderColor: '#4ade80',
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
  addButtonContainer: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    zIndex: 1000,
  },
  addButton: {
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

