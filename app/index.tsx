import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function Index() {
  const [name, setName] = useState("");
  const router = useRouter();

  // Load cached nickname on mount
  useEffect(() => {
    const loadCachedNickname = async () => {
      try {
        const cachedName = await AsyncStorage.getItem('userName');
        if (cachedName) {
          setName(cachedName);
        }
      } catch (error) {
        console.error('Error loading cached nickname:', error);
      }
    };
    loadCachedNickname();
  }, []);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <LinearGradient
              colors={["#4ade80", "#22c55e", "#16a34a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.titleGradient}
            >
              <Text style={styles.appTitle}>Survia</Text>
            </LinearGradient>
          </View>
          <Text style={styles.subtitle}>Pick your survivor nickname</Text>

          <TextInput
            style={styles.input}
            placeholder="Votre nom"
            placeholderTextColor="#777"
            value={name}
            onChangeText={setName}
          />

          <TouchableOpacity
            style={styles.confirmButton}
            activeOpacity={0.8}
            onPress={async () => {
              if (name.trim()) {
                await AsyncStorage.setItem('userName', name.trim());
                router.push("/connection-mode");
              } else {
                Alert.alert('Error', 'Please enter your name');
              }
            }}
          >
            <Text style={styles.confirmButtonText}>Confirmer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  titleContainer: {
    marginBottom: 12,
    alignItems: "center",
  },
  titleGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appTitle: {
    color: "#000000",
    fontSize: 42,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 2,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 40,
    textAlign: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 40,
    textAlign: "center",
  },
  input: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "#555",
    paddingVertical: 14,
    borderRadius: 30,
    paddingHorizontal: 15,
    color: "#fff",
    fontSize: 18,
    marginBottom: 25,
  },
  confirmButton: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#4ade80",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  serverButton: {
    marginTop: 12,
    backgroundColor: "#10b981",
  },
  clientButton: {
    marginTop: 12,
    backgroundColor: "#3b82f6",
  },
  clientStatusContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#071025",
    borderRadius: 8,
  },
  serverStatusContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#071025",
    borderRadius: 8,
  },
  serverStatusTitle: {
    color: "#d1d5db",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  serverStatusText: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 8,
  },
  serverStatusSuccess: {
    color: "#10b981",
  },
  serverStatusError: {
    color: "#ef4444",
  },
  logsContainer: {
    marginTop: 8,
  },
  logsTitle: {
    color: "#d1d5db",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  logsContent: {
    maxHeight: 150,
    backgroundColor: "#0a0f1a",
    borderRadius: 6,
    padding: 8,
  },
  logText: {
    color: "#6b7280",
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 2,
  },
  errorLogText: {
    color: "#ef4444",
    fontWeight: "600",
  },
});