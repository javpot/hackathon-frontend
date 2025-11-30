// Simplified map screen - list view of waypoints (Expo Go compatible)
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import AlertMarker from "../../components/AlertMarker";
import AlertModal from "../../components/AlertModal";
import { MapAlert, useAlerts } from "../../contexts/AlertContext";
import { formatDistance } from "../../utils/distance";

export default function MapScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { alerts, addAlert, removeAlert } = useAlerts();
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<MapAlert | null>(null);

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

  const handleAddWaypoint = (type: string) => {
    const coords = location
      ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
      : { latitude: 0, longitude: 0 };
    addAlert({ type: type as any, coords, message: type });
    setManualModalVisible(false);
  };

  const handleDeleteWaypoint = () => {
    if (selectedAlert) {
      removeAlert(selectedAlert.id);
      setSelectedAlert(null);
    }
  };

  const getDistance = (alert: MapAlert): string => {
    if (!location || !alert.coords) return "Distance inconnue";
    const distance = require("../../utils/distance").calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      alert.coords.latitude,
      alert.coords.longitude
    );
    return formatDistance(distance);
  };

  const renderWaypoint = ({ item }: { item: MapAlert }) => (
    <TouchableOpacity
      style={styles.waypointItem}
      onPress={() => setSelectedAlert(item)}
    >
      <View style={styles.waypointIcon}>
        <AlertMarker type={item.type || 'other'} />
      </View>
      <View style={styles.waypointInfo}>
        <Text style={styles.waypointType}>{item.type || 'Waypoint'}</Text>
        {item.message && (
          <Text style={styles.waypointMessage}>{item.message}</Text>
        )}
        {item.coords && (
          <Text style={styles.waypointCoords}>
            {item.coords.latitude.toFixed(4)}, {item.coords.longitude.toFixed(4)}
          </Text>
        )}
        {location && item.coords && (
          <Text style={styles.waypointDistance}>{getDistance(item)}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.loadingText}>Chargement de la localisation...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={renderWaypoint}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>Aucun point d'intérêt</Text>
            <Text style={styles.emptySubtext}>
              Appuyez sur le bouton + pour ajouter un point
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setManualModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AlertModal
        visible={manualModalVisible}
        onRequestClose={() => setManualModalVisible(false)}
        onSelect={handleAddWaypoint}
      />

      {selectedAlert && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedAlert.type || 'Waypoint'}
            </Text>
            {selectedAlert.message && (
              <Text style={styles.modalMessage}>{selectedAlert.message}</Text>
            )}
            {selectedAlert.coords && (
              <Text style={styles.modalCoords}>
                {selectedAlert.coords.latitude.toFixed(4)}, {selectedAlert.coords.longitude.toFixed(4)}
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSelectedAlert(null)}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteWaypoint}
              >
                <Text style={styles.modalButtonText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1724",
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    textAlign: "center",
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    padding: 20,
  },
  listContent: {
    padding: 16,
  },
  waypointItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  waypointIcon: {
    marginRight: 12,
  },
  waypointInfo: {
    flex: 1,
  },
  waypointType: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  waypointMessage: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 4,
  },
  waypointCoords: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  waypointDistance: {
    color: "#4ade80",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    left: 20,
    bottom: Platform.OS === "ios" ? 120 : 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4ade80",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "capitalize",
  },
  modalMessage: {
    color: "#94a3b8",
    fontSize: 16,
    marginBottom: 8,
  },
  modalCoords: {
    color: "#64748b",
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#334155",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
