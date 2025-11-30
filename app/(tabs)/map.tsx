import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import AlertMarker from "../../components/AlertMarker";
import AlertModal from "../../components/AlertModal";
import { MapAlert, useAlerts } from "../../contexts/AlertContext";

const { width } = Dimensions.get("window");

export default function MapScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const { alerts, addAlert, removeAlert } = useAlerts();
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<MapAlert | null>(null);

  // Debug: Log alerts when they change and center map on new waypoints
  useEffect(() => {
    console.log(`[Map] Alerts updated: ${alerts.length} waypoints`);
    alerts.forEach((a, i) => {
      console.log(`[Map] Waypoint ${i}:`, {
        id: a.id,
        type: a.type,
        hasCoords: !!a.coords,
        lat: a.coords?.latitude,
        lon: a.coords?.longitude,
        message: a.message
      });
    });
    
    // If we have waypoints and location, ensure at least one waypoint is visible
    if (alerts.length > 0 && mapRef.current) {
      const validWaypoints = alerts.filter(a => 
        a && a.coords && 
        typeof a.coords.latitude === 'number' && 
        typeof a.coords.longitude === 'number'
      );
      
      if (validWaypoints.length > 0) {
        const firstWaypoint = validWaypoints[0];
        try {
          mapRef.current.animateToRegion({
            latitude: firstWaypoint.coords!.latitude,
            longitude: firstWaypoint.coords!.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        } catch (error) {
          console.error('Error centering on waypoint:', error);
        }
      }
    }
  }, [alerts.length]); // Only trigger when count changes

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          setLoading(false);
          return;
        }

        // Use lower accuracy for faster loading
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        setLocation(loc);
        
        // Animate to user location when available
        if (mapRef.current && loc) {
          mapRef.current.animateToRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 500);
        }
      } catch (err: any) {
        setErrorMsg(err.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.loadingText}>Loading map…</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: "white", textDecorationLine: "underline" }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Use default region immediately for faster initial render, then update when location is ready
  const defaultRegion = {
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const initialRegion = location
    ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : defaultRegion;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        region={location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : undefined}
        showsUserLocation={true}
        showsMyLocationButton={false}
        userInterfaceStyle="dark"
        loadingEnabled={true}
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        onMapReady={() => {
          // Center on user location when map is ready
          if (mapRef.current && location) {
            try {
              mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 500);
            } catch (error) {
              console.error('Error animating to region:', error);
            }
          }
        }}
        onError={(error) => {
          console.error('Map error:', error);
        }}
      >
        {/* CartoDB tiles for offline support */}
        <UrlTile
          urlTemplate="https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          tileSize={256}
        />
        
        {/* Render markers */}
        {alerts
          .filter(a => {
            if (!a || !a.coords) {
              return false;
            }
            const lat = a.coords.latitude;
            const lon = a.coords.longitude;
            const isValid = 
              typeof lat === 'number' && 
              typeof lon === 'number' &&
              !isNaN(lat) &&
              !isNaN(lon) &&
              lat >= -90 && lat <= 90 &&
              lon >= -180 && lon <= 180;
            if (!isValid) {
              console.log(`[Map] Invalid waypoint ${a?.id}:`, { lat, lon, a });
            }
            return isValid;
          })
          .map((a: MapAlert) => {
            const coord = a.coords!;
            console.log(`[Map] ✅ Rendering waypoint ${a.id} at (${coord.latitude}, ${coord.longitude})`);
            return (
              <Marker
                key={`marker-${a.id}`}
                coordinate={{
                  latitude: coord.latitude,
                  longitude: coord.longitude,
                }}
                title={a.message || a.type || 'Waypoint'}
                description={a.message || a.type || 'Waypoint'}
                anchor={{ x: 0.5, y: 0.5 }}
                onPress={(e) => {
                  try {
                    e.stopPropagation();
                    if (a && a.id) {
                      console.log(`[Map] Marker pressed: ${a.id}`);
                      setSelectedAlert(a);
                    }
                  } catch (error) {
                    console.error('Error selecting alert:', error);
                  }
                }}
                tracksViewChanges={true}
              >
                <AlertMarker type={a.type || 'other'} />
              </Marker>
            );
          })}
      </MapView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setManualModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AlertModal
        visible={manualModalVisible}
        onRequestClose={() => setManualModalVisible(false)}
        onSelect={(type) => {
          const coords = location
            ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }
            : { latitude: 0, longitude: 0 };
          addAlert({ type, coords, message: type });
          setManualModalVisible(false);
        }}
      />

      {/* Delete confirmation modal */}
      {selectedAlert && selectedAlert.coords && (
        <View style={styles.deleteModal}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Waypoint?</Text>
            <Text style={styles.deleteModalText}>
              {selectedAlert.message || selectedAlert.type || 'Waypoint'}
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                onPress={() => setSelectedAlert(null)}
              >
                <Text style={styles.deleteModalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalButtonDelete]}
                onPress={() => {
                  try {
                    if (selectedAlert && selectedAlert.id) {
                      removeAlert(selectedAlert.id);
                      setSelectedAlert(null);
                    } else {
                      console.warn('Cannot delete waypoint: missing ID');
                      setSelectedAlert(null);
                    }
                  } catch (error) {
                    console.error('Error deleting waypoint:', error);
                    setSelectedAlert(null);
                  }
                }}
              >
                <Text style={styles.deleteModalButtonDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const TabItem = ({ icon, label, isActive, onPress }: any) => (
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505", paddingBottom: 90 },
  map: { width: width, height: "100%" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
  },
  loadingText: { marginTop: 12, color: "#4ade80" },
  errorText: { color: "#ff4444", paddingHorizontal: 24, textAlign: "center" },
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
  tabItem: { alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 10, fontWeight: "500" },
  fab: {
    position: "absolute",
    left: 20,
    bottom: Platform.OS === "ios" ? 120 : 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    zIndex: 100,
  },
  deleteModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  deleteModalContent: {
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 24,
    width: width * 0.8,
    borderWidth: 1,
    borderColor: "#262626",
  },
  deleteModalTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  deleteModalText: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  deleteModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  deleteModalButtonCancel: {
    backgroundColor: "#262626",
    borderWidth: 1,
    borderColor: "#333333",
  },
  deleteModalButtonDelete: {
    backgroundColor: "#dc2626",
  },
  deleteModalButtonCancelText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  deleteModalButtonDeleteText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
