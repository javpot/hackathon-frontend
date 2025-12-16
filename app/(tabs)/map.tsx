import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  View,
} from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import AlertMarker, { getIconName, getPinColor } from "../../components/AlertMarker";
import AlertModal from "../../components/AlertModal";
import { MapAlert, useAlerts } from "../../contexts/AlertContext";

const { width } = Dimensions.get("window");

export default function MapScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New state to track where the user clicked on the map
  const [selectedPoint, setSelectedPoint] = useState<{ latitude: number; longitude: number } | null>(null);

  const mapRef = useRef<MapView | null>(null);
  const { alerts, addAlert } = useAlerts();
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [zones, setZones] = useState<Array<{ id: string; coords: { latitude: number; longitude: number }; radius: number; type: 'safe' | 'danger'; label?: string }>>([]);

  // Helper: distance in meters between two lat/lon points
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // meters
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const addCurrentLocationSafeZone = () => {
    if (!location) return;

    const newZone = {
      id: `safe-${Date.now()}`,
      coords: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      radius: 50, // 50 meter radius
      type: 'safe' as const,
      label: 'Home Base',
    };

    setZones((prevZones) => [...prevZones, newZone]);
  };

  // Generate sample zones near user location
  const generateNearbyZones = (lat: number, lon: number, alerts: MapAlert[], zoneCount = 6) => {
    const metersToLatDeg = (meters: number) => meters / 111120;
    const metersToLonDeg = (meters: number, latitude: number) => meters / (111320 * Math.cos(latitude * Math.PI / 180));

    const baseCenterDistance = 120;
    const distanceIncrement = 80;

    return Array.from({ length: zoneCount }).map((_, i) => {
      const ringIndex = Math.floor(i / 6);
      const indexInRing = i % 6;
      const centerDistance = baseCenterDistance + (distanceIncrement * ringIndex);
      const angleDeg = (360 / Math.min(zoneCount, 6)) * indexInRing;
      const angleRad = (angleDeg * Math.PI) / 180;
      const dxMeters = Math.cos(angleRad) * centerDistance;
      const dyMeters = Math.sin(angleRad) * centerDistance;
      const coords = {
        latitude: lat + metersToLatDeg(dyMeters),
        longitude: lon + metersToLonDeg(dxMeters, lat),
      };
      const radius = 35 + (i * 6);

      // Check for zombie/danger alerts to classify zone
      const isDanger = alerts.some(a =>
        a.coords &&
        ['zombie', 'warning', 'danger'].includes(a.type) &&
        getDistanceMeters(a.coords.latitude, a.coords.longitude, coords.latitude, coords.longitude) <= 80
      );

      return {
        id: Date.now().toString() + '-' + i,
        coords,
        radius,
        // CHANGED: Label is now 'Zombie Zone'
        label: isDanger ? 'Zombie Zone' : 'Safe Area',
        type: isDanger ? 'danger' : 'safe' as 'danger' | 'safe'
      };
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          setLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc);
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

  const initialRegion = location
    ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
    : {
      latitude: 48.8566,
      longitude: 2.3522,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        userInterfaceStyle="dark"
        // Update selected point on map press
        onPress={(e) => setSelectedPoint(e.nativeEvent.coordinate)}
      >
        {/* Draw Zones */}
        {zones.map((z) => (
          <Circle
            key={z.id}
            center={z.coords}
            radius={z.radius}
            strokeWidth={2}
            strokeColor={z.type === 'danger' ? 'rgba(220, 38, 38, 0.9)' : 'rgba(16,185,129,0.9)'}
            fillColor={z.type === 'danger' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(16,185,129,0.12)'}
          />
        ))}

        {/* Draw Active Alerts */}
        {alerts.map((a: MapAlert, index: number) =>
          a.coords ? (
            <Marker
              key={a.id || index}
              coordinate={a.coords}
              title={a.message || a.type}
              tracksViewChanges={false}
            >
              <AlertMarker type={a.type} />
            </Marker>
          ) : null
        )}

        {/* Draw "Ghost Marker" for selection */}
        {selectedPoint && (
          <Marker coordinate={selectedPoint} opacity={0.9}>
            <View style={styles.ghostMarker}>
              <Ionicons name="add-circle-outline" size={20} color="#000" />
            </View>
          </Marker>
        )}
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
          // Use selected point if available, otherwise fallback to GPS
          const coords = selectedPoint || (location
            ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }
            : { latitude: 0, longitude: 0 });

          // CHANGED: Intercept 'danger' and convert to 'zombie' to force the theme
          const finalType = type === 'danger' ? 'zombie' : type;

          addAlert({ type: finalType, coords, message: finalType });

          // Clear selection and close
          setSelectedPoint(null);
          setManualModalVisible(false);
        }}
      />

      {/* Quick scan/building zones controls */}
      <View style={styles.zoneControls} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.zoneButton}
          onPress={() => {
            if (!location) return;
            const generated = generateNearbyZones(location.coords.latitude, location.coords.longitude, alerts);
            setZones(generated);
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Scan Buildings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.zoneButton, styles.safeZoneButton]}
          onPress={addCurrentLocationSafeZone}
        >
          <MaterialCommunityIcons name="shield-check" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700' }}>I'm Safe!</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend</Text>
        <View style={styles.legendRow}>
          <MaterialCommunityIcons name={getIconName('hospital')} size={16} color={getPinColor('hospital')} />
          <Text style={styles.legendText}> Hospital</Text>
        </View>
        <View style={styles.legendRow}>
          <MaterialCommunityIcons name={getIconName('food')} size={16} color={getPinColor('food')} />
          <Text style={styles.legendText}> Food</Text>
        </View>
        <View style={styles.legendRow}>
          <MaterialCommunityIcons name={getIconName('water')} size={16} color={getPinColor('water')} />
          <Text style={styles.legendText}> Water</Text>
        </View>
        <View style={styles.legendRow}>
          <MaterialCommunityIcons name={getIconName('shelter')} size={16} color={getPinColor('shelter')} />
          <Text style={styles.legendText}> Shelter</Text>
        </View>
        <View style={styles.legendRow}>
          <MaterialCommunityIcons name={getIconName('zombie')} size={16} color={getPinColor('zombie')} />
          <Text style={styles.legendText}> Zombie</Text>
        </View>
        <View style={styles.legendRow}>
          <MaterialCommunityIcons name={getIconName('warning')} size={16} color={getPinColor('warning')} />
          <Text style={styles.legendText}> Warning</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendColorBox, { backgroundColor: 'rgba(16,185,129,0.9)' }]} />
          <Text style={styles.legendText}> Safe Zone</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendColorBox, { backgroundColor: 'rgba(220, 38, 38, 0.9)' }]} />
          <Text style={styles.legendText}> Zombie Zone</Text>
        </View>
      </View>
    </View>
  );
}

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
  fab: {
    position: "absolute",
    left: 20, // LEFT POSITION
    bottom: Platform.OS === "ios" ? 110 : 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#A84420",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    zIndex: 100,
  },
  ghostMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
    borderStyle: 'dashed',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  zoneControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 14,
    zIndex: 200,
    gap: 8, // Adds space between the two buttons
  },
  zoneButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    flexDirection: 'row', // Align icon and text
    alignItems: 'center',
    gap: 6,
  },
  // New specific style for the safe button
  safeZoneButton: {
    backgroundColor: 'rgba(16,185,129,0.9)', // Emerald Green
    borderColor: 'rgba(16,185,129,1)',
  },
  legend: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 14,
    backgroundColor: 'rgba(23,23,23,0.9)',
    padding: 8,
    borderRadius: 10,
    zIndex: 200,
    minWidth: 120,
  },
  legendTitle: { color: '#ddd', fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 },
  legendText: { color: '#eee', fontSize: 12, marginLeft: 6 },
  legendColorBox: { width: 12, height: 12, borderRadius: 3, marginRight: 8 }
});