import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons"; // Import des icônes
import { useRouter } from "expo-router"; // Import pour la navigation

const { width } = Dimensions.get("window");

export default function MapScreen() {
  const router = useRouter(); // Hook de navigation
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

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
          accuracy: Location.Accuracy.Highest,
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
        ref={(r: MapView | null) => {
          mapRef.current = r;
        }}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        // Optionnel : style sombre pour la map si tu veux matcher le thème
        userInterfaceStyle="dark"
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Vous êtes ici"
            description={`Lat: ${location.coords.latitude.toFixed(
              6
            )}, Lon: ${location.coords.longitude.toFixed(6)}`}
            pinColor="#4ade80" // Pin vert
          />
        )}
      </MapView>

      {/* --- BARRE DE NAVIGATION (Similaire à Home) --- */}
      <View style={styles.tabBar}>
        <TabItem
          icon="home"
          label="Home"
          onPress={() => router.push("/home")} // Retour vers l'accueil
        />
        <TabItem
          icon="map"
          label="Map"
          isActive={true} // Active l'onglet Map
          onPress={() => {}}
        />
        <TabItem
          icon="pricetags"
          label="Listing"
          onPress={() => router.push("/listings")}
        />
      </View>
    </View>
  );
}

// --- SOUS-COMPOSANT TAB ITEM ---
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
  },
  loadingText: {
    marginTop: 12,
    color: "#4ade80",
  },
  errorText: {
    color: "#ff4444",
    paddingHorizontal: 24,
    textAlign: "center",
  },

  // --- STYLES DE LA TOOLBAR ---
  tabBar: {
    position: "absolute",
    bottom: 0,
    width: width,
    backgroundColor: "rgba(23, 23, 23, 0.95)", // Fond sombre semi-transparent
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
