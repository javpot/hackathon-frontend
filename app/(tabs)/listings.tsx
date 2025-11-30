import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Dimensions,
    FlatList,
    Image,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAlerts } from '../../contexts/AlertContext';
import { checkHostAlive, pollListingsFromHost } from '../../services/localclient';

const { width } = Dimensions.get('window');

type ServerListing = {
  id?: number;
  vendorID?: string;
  vendorName?: string;
  description?: string;
  productsInReturn?: string;
  image?: string;
  clientId?: string;
  serverId?: string;
  latitude?: number;
  longitude?: number;
};

export default function Listings() {
  const router = useRouter();
  const { addAlert } = useAlerts();
  const [barterListings, setBarterListings] = useState<ServerListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'client' | null>(null);
  const [hostIP, setHostIP] = useState<string>('');
  const [vendorID, setVendorID] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadConnectionInfo = async () => {
      const mode = await AsyncStorage.getItem('connectionMode');
      const ip = await AsyncStorage.getItem('hostIP');
      const deviceId = await AsyncStorage.getItem('deviceVendorID');
      
      if (mode === 'host' || mode === 'client' || mode === 'offline') {
        setConnectionMode(mode);
      }
      if (ip) {
        setHostIP(ip);
      }
      if (deviceId) {
        const fullVendorID = mode === 'host' && !deviceId.startsWith('host-') 
          ? `host-${deviceId}` 
          : mode === 'client' && !deviceId.startsWith('client-')
          ? `client-${deviceId}`
          : deviceId;
        setVendorID(fullVendorID);
      }
    };
    loadConnectionInfo();
  }, []);

  useEffect(() => {
    if (!connectionMode || connectionMode === 'offline') {
      setBarterListings([]);
      return;
    }

    const pollInterval = setInterval(() => {
      loadBarterListings();
    }, 2000);

    loadBarterListings();

    return () => clearInterval(pollInterval);
  }, [connectionMode, vendorID]);

  const loadBarterListings = async () => {
    try {
      // Client mode only - fetch listings from host (uses hardcoded ngrok URL)
      if (connectionMode === 'client') {
        const serverListings = await pollListingsFromHost();
        console.log(`[Client] Received ${serverListings?.length || 0} listings from host`);
        
        // Filter out own listings
        const filtered = vendorID
          ? (serverListings || []).filter((listing: any) => 
              listing.vendorID !== vendorID && listing.clientId !== vendorID
            )
          : (serverListings || []);
        
        setBarterListings(filtered);
      } else {
        setBarterListings([]);
      }
    } catch (error) {
      console.error('[Client] Error loading barter listings:', error);
      setBarterListings([]);
    }
  };
        
        setBarterListings(filtered);
      } else if (connectionMode === 'client' && hostIP) {
        try {
          const isAlive = await checkHostAlive(hostIP, 3001, 2000);
          if (!isAlive) {
            setBarterListings([]);
            return;
          }
          
          const serverListings = await pollListingsFromHost(hostIP, 3001);
          setBarterListings(serverListings);
        } catch (error) {
          console.error('[Client] Error polling listings:', error);
          setBarterListings([]);
        }
      }
    } catch (error) {
      console.error('Error loading barter listings:', error);
    }
  };

  const filteredListings = barterListings.filter(listing => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      listing.vendorName?.toLowerCase().includes(query) ||
      listing.description?.toLowerCase().includes(query) ||
      listing.productsInReturn?.toLowerCase().includes(query)
    );
  });

  const renderItem = ({ item }: { item: ServerListing }) => (
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
          {/* Bubble Button - Add waypoint and trade card */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.bubbleButton]}
            onPress={async () => {
              try {
                if (item.latitude && item.longitude) {
                  const lat = Number(item.latitude);
                  const lon = Number(item.longitude);
                  
                  if (isNaN(lat) || isNaN(lon)) {
                    console.error('[Listings] Invalid coordinates:', { lat, lon });
                    Alert.alert('Error', 'Invalid location coordinates');
                    return;
                  }
                  
                  console.log('[Listings] Adding trade waypoint:', {
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
                  
                  console.log('[Listings] ✅ Waypoint added successfully');
                  // Navigate to map to show the waypoint
                  router.push('/map');
                  Alert.alert('Success', 'Trade location added to map');
                } else {
                  console.warn('[Listings] No location data for listing:', item);
                  Alert.alert('Error', 'This listing has no location data');
                }
              } catch (error) {
                console.error('[Listings] Error adding trade waypoint:', error);
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
        <Text style={styles.headerTitle}>Trade</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.myListingsButton}
            onPress={() => {
              console.log('[Listings Tab] My Listings button pressed - navigating to my-listings');
              // Navigate to the my-listings route (renamed to avoid conflict with tab route)
              router.push('/my-listings');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="list" size={18} color="#4ade80" />
            <Text style={styles.myListingsButtonText}>My Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={20} color="#4ade80" />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- SEARCH BAR --- */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6b7280" />
          <TextInput
            placeholder="Search supplies..."
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
            {connectionMode === 'offline' 
              ? 'Offline mode - no listings available'
              : searchQuery.trim()
              ? 'No listings match your search'
              : 'No listings available from other users'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.serverId || `listing-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    paddingBottom: 90,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myListingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4ade80',
    gap: 6,
  },
  myListingsButtonText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#171717',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
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
  // -- ITEM CARD MODIFIÉE --
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
  bubbleButton: {
    backgroundColor: '#262626',
    borderColor: '#4ade80',
  },
});
