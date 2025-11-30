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
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
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
  const { alerts, addAlert } = useAlerts();
  const [manualModalVisible, setManualModalVisible] = useState(false);

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
      >
        {alerts.map((a: MapAlert, index: number) =>
          a.coords ? (
            <Marker
              key={a.id || index}
              coordinate={a.coords}
              title={a.message || a.type}
            >
              <AlertMarker type={a.type} />
            </Marker>
          ) : null
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
    right: 20,
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
});
