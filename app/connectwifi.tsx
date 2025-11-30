import { useRouter } from "expo-router";
import React from "react";
import {
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const HOTSPOTS = [
  { id: "1", name: "Skynet_local1" },
  { id: "2", name: "Skynet_local2" },
  { id: "3", name: "Skynet_local3" },
  { id: "4", name: "Skynet_local4" },
  { id: "5", name: "Skynet_local5" },
  { id: "6", name: "Skynet_local6" },
];

export default function ConnectWifiScreen() {
  const router = useRouter();

  const renderItem = ({ item }: { item: typeof HOTSPOTS[0] }) => (
    <View style={styles.hotspotContainer}>
      <Text style={styles.hotspotText}>{item.name}</Text>
      <View style={styles.separator} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.content}>
        <Text style={styles.headerText}>
          Connecte-toi au réseau Wifi du survivant
        </Text>

        <FlatList
          data={HOTSPOTS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/emetteur2")} // Remplace par la page suivante
        >
          <Text style={styles.actionButtonText}>Je suis connecté</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
    marginTop: 20,
    textAlign: "left",
  },
  hotspotContainer: {
    paddingVertical: 15,
  },
  hotspotText: {
    color: "#dbdbdbff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "left",
  },
  separator: {
    height: 1,
    backgroundColor: "#4ade80",
    marginTop: 10,
    marginBottom:10
  },
  actionButton: {
    width: "100%",
    backgroundColor: "#2bff00ff",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  actionButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "600",
  },
});
