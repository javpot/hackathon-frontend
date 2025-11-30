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
import AlertModal from "../components/AlertModal";
import { MapAlert, useAlerts } from "../contexts/AlertContext";

const { width } = Dimensions.get("window");

const getPinColor = (type: string) => {
    switch (type) {
        case "hospital": return "#ef4444"; // Red
        case "food": return "#f59e0b";     // Orange
        case "water": return "#3b82f6";    // Blue
        case "shelter": return "#4ade80";  // Green
        default: return "#8b5cf6";         // Purple
    }
};

export default function MapScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
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

                // Balanced accuracy is faster and uses less battery
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
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: 'white', textDecorationLine: 'underline' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Default to Paris if no location, otherwise center on user
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
                {/* Render Alert Markers from Context */}
                {alerts.map((a: MapAlert, index: number) =>
                    a.coords ? (
                        <Marker
                            key={a.id || index}
                            coordinate={a.coords}
                            title={a.message || a.type}
                            pinColor={getPinColor(a.type)}
                        />
                    ) : null
                )}
            </MapView>

            {/* Floating Action Button (FAB) to Add Alert Manually */}
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
                    // Use real location if available, otherwise 0,0
                    const coords = location
                        ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
                        : { latitude: 0, longitude: 0 };

                    addAlert({ type, coords, message: type });
                    setManualModalVisible(false);
                }}
            />

            {/* Bottom Navigation Bar */}
            <View style={styles.tabBar}>
                <TabItem
                    icon="home"
                    label="Home"
                    onPress={() => router.push("/home")}
                />
                <TabItem
                    icon="map"
                    label="Map"
                    isActive={true}
                    onPress={() => { }}
                />
                <TabItem icon="pricetags" label="Listing" onPress={() => router.push("/product")} />
            </View>
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
        <Text style={[styles.tabLabel, { color: isActive ? "#4ade80" : "#6b7280" }]}>
            {label}
        </Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#050505" },
    map: { ...StyleSheet.absoluteFillObject },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#050505" },
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