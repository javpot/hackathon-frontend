import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { AlertType, MapAlert, useAlerts } from "../../contexts/AlertContext";
import { sendChatMessage } from "../../services/chatService";
import { checkHostAlive, sendKeepAlive } from "../../services/localclient";
import { calculateDistance, formatDistance } from "../../utils/distance";

const { width } = Dimensions.get("window");

interface ResourceCardProps {
  title: string;
  subtitle: string;
  distance: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

// Type pour nos messages locaux
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

const Home: React.FC = () => {
  const router = useRouter();
  const { alerts } = useAlerts();
  
  // --- 1. ÉTATS (STATE) ---
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'client' | null>(null);
  const [hostIP] = useState<string>(''); // Not used anymore - using hardcoded ngrok URL
  const [activeUserCount, setActiveUserCount] = useState<number>(0);
  const [vendorID, setVendorID] = useState<string>('');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [survivabilityStatus, setSurvivabilityStatus] = useState<'safe' | 'cautious' | 'dangerous'>('safe');
  
  // Messages initiaux (Hardcodés pour l'ambiance, mais stockés dans le state)
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "⚠️ Weather alert: Acid rain approaching Sector 4.", sender: 'bot' },
    { id: '2', text: "Water source detected 2km North. Purify before consumption.", sender: 'bot' }
  ]);

  // Référence pour le scroll automatique vers le bas
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll en bas quand un message arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // --- 2. LOGIQUE D'ENVOI ---
  const handleSend = async () => {
    if (!inputText.trim()) return;

    // A. On ajoute le message de l'utilisateur
    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText(""); // On vide le champ
    setIsLoading(true); // On affiche le chargement

    try {
      // B. On appelle le vrai service (Gemini + DB)
      const response = await sendChatMessage(userMsg.text);

      // C. On ajoute la réponse du bot
      const botMsg: Message = {
        id: response.id,
        text: response.text,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      // En cas d'erreur
      const errorMsg: Message = { id: Date.now().toString(), text: "Erreur de connexion...", sender: 'bot' };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Database initialization removed - no longer needed for trade listings

    // Load connection mode - default to client mode
    // Note: hostIP is no longer used - we use hardcoded ngrok URL from constants
    const loadConnectionMode = async () => {
      let mode = await AsyncStorage.getItem('connectionMode');
      let deviceId = await AsyncStorage.getItem('deviceVendorID');
      
      // Default to client mode if not set
      if (!mode) {
        mode = 'client';
        await AsyncStorage.setItem('connectionMode', 'client');
      }
      
      setConnectionMode(mode as 'client');
      
      // Generate device ID if not exists
      if (!deviceId) {
        deviceId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('deviceVendorID', deviceId);
      }
      
      // Ensure client prefix
      const fullVendorID = deviceId.startsWith('client-') ? deviceId : `client-${deviceId}`;
      setVendorID(fullVendorID);
    };
    loadConnectionMode();

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
  }, []);

  // Update survivability status based on nearby waypoints
  useEffect(() => {
    const updateSurvivability = () => {
      if (!userLocation) {
        setSurvivabilityStatus('safe');
        return;
      }

      const userLat = userLocation.coords.latitude;
      const userLon = userLocation.coords.longitude;
      const radiusKm = 2; // 2km radius

      // Check for danger waypoints within 2km
      const hasDangerNearby = alerts.some((alert) => {
        if (alert.type !== 'danger' || !alert.coords) return false;
        const distance = calculateDistance(
          userLat,
          userLon,
          alert.coords.latitude,
          alert.coords.longitude
        );
        return distance <= radiusKm;
      });

      // Check for warning waypoints within 2km
      const hasWarningNearby = alerts.some((alert) => {
        if (alert.type !== 'warning' || !alert.coords) return false;
        const distance = calculateDistance(
          userLat,
          userLon,
          alert.coords.latitude,
          alert.coords.longitude
        );
        return distance <= radiusKm;
      });

      // Set status: dangerous > cautious > safe
      if (hasDangerNearby) {
        setSurvivabilityStatus('dangerous');
      } else if (hasWarningNearby) {
        setSurvivabilityStatus('cautious');
      } else {
        setSurvivabilityStatus('safe');
      }
    };

    updateSurvivability();
  }, [alerts, userLocation]);

  // Keep-alive and active user count tracking (client mode only)
  useEffect(() => {
    if (connectionMode !== 'client' || !vendorID) {
      return;
    }

    // Client: Send keep-alive packets periodically and update active user count
    // Uses hardcoded ngrok URL from constants
    const sendKeepAlivePacket = async () => {
      try {
        const count = await sendKeepAlive(vendorID);
        setActiveUserCount(count);
        console.log(`[Client] 💓 Keep-alive sent, active users: ${count}`);
      } catch (error) {
        console.error('[Client] Failed to send keep-alive:', error);
        // If keep-alive fails, host might be down - set count to 0
        setActiveUserCount(0);
      }
    };

    // Send immediately, then every 10 seconds
    sendKeepAlivePacket();
    const keepAliveInterval = setInterval(sendKeepAlivePacket, 10000);

    return () => {
      clearInterval(keepAliveInterval);
    };
  }, [connectionMode, vendorID]);

  // Health check for client mode (optional - just logs, doesn't navigate)
  useEffect(() => {
    if (connectionMode !== 'client') {
      return;
    }

    console.log('[Home] 🏥 Starting health check for client mode');
    const healthCheckInterval = setInterval(async () => {
      try {
        const isAlive = await checkHostAlive();
        if (!isAlive) {
          console.log('[Home] ⚠️ Host is not responding');
          setActiveUserCount(0);
        }
      } catch (error) {
        console.error('[Home] Error during health check:', error);
        setActiveUserCount(0);
      }
    }, 15000); // Check every 15 seconds

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [connectionMode]);

  const handleLogout = async () => {
    try {
      // If client, remove all listings from host before disconnecting
      if (connectionMode === 'client' && vendorID) {
        console.log('[Home] 🧹 Cleaning up: Removing all client listings from host');
        try {
          const { deleteListingFromHost } = await import('../../services/localclient');
          await deleteListingFromHost(vendorID);
          console.log('[Home] ✅ Client listings removed from host');
        } catch (error) {
          console.error('[Home] Error removing listings from host:', error);
          // Continue anyway - cleanup is best effort
        }
      }
      
      // Clear connection info
      await AsyncStorage.multiRemove(['connectionMode', 'hostIP']);
      console.log('[Home] ✅ Connection info cleared');
      
      // Navigate back to login
      router.replace('/');
    } catch (error) {
      console.error('[Home] Error during logout:', error);
      // Still navigate even if there's an error
      await AsyncStorage.multiRemove(['connectionMode', 'hostIP']);
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? -90 : 0}
      >
        {/* --- HEADER --- */}
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={
              survivabilityStatus === 'dangerous'
                ? ["#dc2626", "#ef4444"]
                : survivabilityStatus === 'cautious'
                ? ["#f59e0b", "#fbbf24"]
                : ["#15803d", "#4ade80"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statusBadge}
          >
            <MaterialCommunityIcons
              name="heart-pulse"
              size={20}
              color="white"
            />
            <Text style={styles.statusText}>
              SURVIVABILITY INDEX: {survivabilityStatus.toUpperCase()}
            </Text>
          </LinearGradient>

        </View>

        {/* --- CONTENT (FIXED LAYOUT) --- */}
        <View style={styles.mainContent}>
          {/* Titre */}
          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>Près de vous</Text>
            <Text style={styles.subTitle}>
              Ressources détectées dans votre secteur
            </Text>
          </View>

          {/* --- HORIZONTAL CARDS --- */}
          <View style={styles.horizontalListContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {/* Stats Card - Active Users (First Position) */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.cardHorizontal}
              >
                <LinearGradient
                  colors={["#1f2937", "#111827"]}
                  style={styles.statsGradient}
                >
                  <View style={styles.statsRow}>
                    <FontAwesome5 name="users" size={16} color="#4ade80" />
                    <Text style={styles.statsTitle}>Actifs users</Text>
                  </View>
                  <Text style={styles.bigStatNumber}>{activeUserCount}</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Dynamic waypoint cards - show closest of each type */}
              {(() => {
                const getClosestWaypointCard = (type: AlertType) => {
                  if (!userLocation) return null;

                  const closest = findClosestWaypoint(
                    alerts,
                    type,
                    userLocation.coords.latitude,
                    userLocation.coords.longitude
                  );

                  if (!closest || !closest.coords) return null;

                  const distance = formatDistance(
                    calculateDistance(
                      userLocation.coords.latitude,
                      userLocation.coords.longitude,
                      closest.coords.latitude,
                      closest.coords.longitude
                    )
                  );

                  const config = getTypeConfig(type);
                  // Capitalize first letter of type if no custom message
                  const typeCapitalized = closest.type.charAt(0).toUpperCase() + closest.type.slice(1);
                  // Use custom message if available, otherwise use capitalized type
                  const title = closest.message && closest.message !== closest.type 
                    ? closest.message 
                    : typeCapitalized;
                  const subtitle = closest.message && closest.message !== closest.type 
                    ? closest.message 
                    : config.defaultSubtitle;

                  return (
                    <ResourceCard
                      key={`${type}-${closest.id}`}
                      title={title}
                      subtitle={subtitle}
                      distance={distance}
                      iconName={config.iconName}
                      color={config.color}
                    />
                  );
                };

                const hospitalCard = getClosestWaypointCard('hospital');
                const foodCard = getClosestWaypointCard('food');
                const waterCard = getClosestWaypointCard('water');
                const shelterCard = getClosestWaypointCard('shelter');
                const tradeCard = getClosestWaypointCard('info'); // Trade waypoints use 'info' type
                
                const hasWaypointCards = hospitalCard || foodCard || waterCard || shelterCard || tradeCard;

                return (
                  <>
                    {hospitalCard}
                    {foodCard}
                    {waterCard}
                    {shelterCard}
                    {tradeCard}
                    
                    {/* Add Plus Card if no waypoint cards */}
                    {!hasWaypointCards && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.cardHorizontal}
                        onPress={() => router.push('/map')}
                      >
                        <View style={styles.addCardContent}>
                          <View style={styles.addCardIconContainer}>
                            <Ionicons name="add" size={24} color="#4ade80" />
                          </View>
                          <View style={styles.cardContent}>
                            <Text style={styles.cardTitle} numberOfLines={2}>Ajouter un point</Text>
                            <Text style={styles.cardSubtitle} numberOfLines={2}>Appuyez pour ouvrir la carte</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                    
                    {/* Sync Card */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.cardHorizontal}
                    >
                      <View style={styles.syncCardContent}>
                        <View style={styles.syncCardIconContainer}>
                          <Ionicons name="sync-outline" size={20} color="#3b82f6" />
                        </View>
                        <View style={styles.cardContent}>
                          <Text style={styles.cardTitle} numberOfLines={1}>Synchroniser</Text>
                          <Text style={styles.cardSubtitle} numberOfLines={2}>Bientôt disponible</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </ScrollView>
          </View>

          {/* --- CHATBOT SECTION --- */}
          <View style={styles.chatWrapper}>
            <View style={styles.chatContainer}>
              {/* Header Chat */}
              <View style={styles.chatHeader}>
                <View style={styles.chatHeaderLeft}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.chatTitle}>SURVIVAL AI LINK</Text>
                </View>
                <MaterialCommunityIcons
                  name="robot-outline"
                  size={20}
                  color="#4ade80"
                />
              </View>

              {/* Messages */}
              <ScrollView
                style={styles.chatBody}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.aiMessageRow}>
                  <View style={styles.aiAvatar}>
                    <Text style={styles.aiAvatarText}>AI</Text>
                  </View>
                  <View style={styles.messageBubbleAi}>
                    <Text style={styles.messageTextAi}>
                      ⚠️ Weather alert: Acid rain approaching Sector 4.
                    </Text>
                  </View>
                </View>

                <View style={styles.aiMessageRow}>
                  <View style={styles.aiAvatar}>
                    <Text style={styles.aiAvatarText}>AI</Text>
                  </View>
                  <View style={styles.messageBubbleAi}>
                    <Text style={styles.messageTextAi}>
                      Water source detected 2km North. Purify before
                      consumption.
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Input Zone */}
              <View style={styles.inputArea}>
                <TextInput
                  style={styles.inputField}
                  placeholder="Ask for guidance..."
                  placeholderTextColor="#525252"
                />
                <TouchableOpacity style={styles.sendButton}>
                  <Ionicons name="arrow-up" size={18} color="black" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {/* Spacer for TabBar */}
          <View style={{ height: 90 }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- HELPER FUNCTIONS ---

/**
 * Find the closest waypoint of a specific type to the user's location
 */
const findClosestWaypoint = (
  waypoints: MapAlert[],
  type: AlertType,
  userLat: number | null,
  userLon: number | null
): MapAlert | null => {
  if (!userLat || !userLon) return null;

  const waypointsOfType = waypoints.filter(
    (wp) => wp.type === type && wp.coords
  );

  if (waypointsOfType.length === 0) return null;

  let closest: MapAlert | null = null;
  let minDistance = Infinity;

  waypointsOfType.forEach((wp) => {
    if (!wp.coords) return;
    const distance = calculateDistance(
      userLat,
      userLon,
      wp.coords.latitude,
      wp.coords.longitude
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = wp;
    }
  });

  return closest;
};

/**
 * Get card configuration for a waypoint type
 */
const getTypeConfig = (type: AlertType): {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  defaultSubtitle: string;
} => {
  const configs: Record<AlertType, {
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
    color: string;
    defaultSubtitle: string;
  }> = {
    hospital: { iconName: 'hospital-box', color: '#ef4444', defaultSubtitle: 'Emergency' },
    food: { iconName: 'food-drumstick', color: '#f59e0b', defaultSubtitle: 'Rations' },
    water: { iconName: 'water', color: '#3b82f6', defaultSubtitle: 'Water Source' },
    shelter: { iconName: 'home-variant', color: '#10b981', defaultSubtitle: 'Shelter' },
    danger: { iconName: 'alert-circle', color: '#dc2626', defaultSubtitle: 'Danger Zone' },
    warning: { iconName: 'alert', color: '#f59e0b', defaultSubtitle: 'Warning' },
    info: { iconName: 'handshake', color: '#4ade80', defaultSubtitle: 'Trade Location' },
    other: { iconName: 'map-marker', color: '#6b7280', defaultSubtitle: 'Location' },
  };
  return configs[type] || configs.other;
};

// --- SOUS-COMPOSANTS ---

const ResourceCard: React.FC<ResourceCardProps> = ({
  title,
  subtitle,
  distance,
  iconName,
  color,
}) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.cardHorizontal}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={color} />
      </View>
      <View style={styles.distanceBadge}>
        <Text style={styles.distanceText}>{distance}</Text>
      </View>
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
  </TouchableOpacity>
);

const TabItem = ({
  icon,
  label,
  isActive,
  onPress,
}: {
  icon: any;
  label: string;
  isActive?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    <Ionicons
      name={isActive ? icon : `${icon}-outline`}
      size={24}
      color={isActive ? "#4ade80" : "#6b7280"}
    />
    <Text
      style={[styles.tabLabel, { color: isActive ? "#4ade80" : "#6b7280" }]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// --- STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 50,
    gap: 6,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  statusText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  connectionBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  logoutButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  offlineBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.9)',
    borderRadius: 50,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
    flexShrink: 0,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9ca3af',
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineLogoutButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  addCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addCardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncCardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostBadge: {
    backgroundColor: '#4ade80',
  },
  clientBadge: {
    backgroundColor: '#3b82f6',
  },
  connectionBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleSection: {
    marginBottom: 15,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subTitle: {
    fontSize: 14,
    color: "#9ca3af",
  },

  // --- HORIZONTAL LIST ---
  horizontalListContainer: {
    height: 160,
  },
  horizontalScrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  cardHorizontal: {
    width: 190,
    height: "100%",
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#262626",
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    marginTop: 8,
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#6b7280",
    fontSize: 12,
    flexWrap: 'wrap',
  },
  distanceBadge: {
    backgroundColor: "#262626",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  distanceText: {
    color: "#d1d5db",
    fontSize: 10,
    fontWeight: "bold",
  },
  statsGradient: {
    flex: 1,
    borderRadius: 16,
    margin: -12,
    padding: 12,
    justifyContent: "space-between",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statsTitle: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
  },
  bigStatNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4ade80",
  },

  // --- CHATBOT WRAPPER ---
  chatWrapper: {
    flex: 1,
    marginTop: 30, // J'ai ajouté de l'espace ici (30px)
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    padding: 16,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  chatHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
  },
  pulseActive: {
      backgroundColor: "#f59e0b", // Orange quand ça charge
  },
  chatTitle: {
    color: "#4ade80",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  chatBody: {
    flex: 1,
  },
  
  // --- BOT MESSAGES ---
  aiMessageRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 12,
    paddingRight: 40, // Pour ne pas coller à droite
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#262626",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4ade80",
  },
  aiAvatarText: {
    color: "#4ade80",
    fontSize: 8,
    fontWeight: "bold",
  },
  messageBubbleAi: {
    backgroundColor: "#171717",
    padding: 10,
    borderRadius: 12,
    borderTopLeftRadius: 2,
  },
  messageTextAi: {
    color: "#d1d5db",
    fontSize: 13,
    lineHeight: 18,
  },

  // --- USER MESSAGES (NOUVEAU) ---
  userMessageRow: {
    flexDirection: "row",
    justifyContent: "flex-end", // Aligner à droite
    marginBottom: 12,
    paddingLeft: 40, // Pour ne pas coller à gauche
  },
  messageBubbleUser: {
    backgroundColor: "#4ade80", // Vert Survvie
    padding: 10,
    borderRadius: 12,
    borderTopRightRadius: 2,
  },
  messageTextUser: {
    color: "#050505", // Texte foncé sur fond vert
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  // --- INPUT ---
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#171717",
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
    paddingLeft: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#262626",
  },
  inputField: {
    flex: 1,
    color: "white",
    height: 40,
    fontSize: 13,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4ade80",
    justifyContent: "center",
    alignItems: "center",
  },

  // --- TAB BAR ---
  tabBar: {
    position: "absolute",
    bottom: 0,
    width: width,
    backgroundColor: "rgba(23, 23, 23, 0.95)",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 15,
    paddingBottom: Platform.OS === "ios" ? 35 : 20,
    borderTopWidth: 1,
    borderTopColor: "#262626",
  },
  tabItem: {
    alignItems: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});

export default Home;