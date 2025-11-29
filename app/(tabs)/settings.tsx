import React, { useEffect, useState } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator 
} from "react-native";
import { useRouter } from "expo-router";
import { getUser, logout } from "../../services/api"; 

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const data = await getUser();
      setUser(data);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    await logout();
    router.replace("/"); 
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mon Profil</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Nom</Text>
            <Text style={styles.value}>{user?.name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1724", padding: 20 },
  header: { marginTop: 40, marginBottom: 30 },
  title: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  section: { marginBottom: 30 },
  sectionTitle: { color: "#9ca3af", fontSize: 13, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
  card: { backgroundColor: "#0b1220", borderRadius: 14, padding: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  label: { color: "#d1d5db", fontSize: 16 },
  value: { color: "#fff", fontSize: 16, fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#1f2937", marginVertical: 4 },
  logoutButton: { backgroundColor: "#ef4444", padding: 15, borderRadius: 10, alignItems: "center" }, 
  logoutText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});