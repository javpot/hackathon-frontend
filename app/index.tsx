import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Keyboard,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";

export default function Index() {
  const [name, setName] = useState("");
  const router = useRouter();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.content}>
          <Text style={styles.title}>Entrez votre nom</Text>

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
              }
              router.push("/home");
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
    backgroundColor: "#A84420",
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