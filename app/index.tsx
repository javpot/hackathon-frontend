import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { login } from "../services/api";
import { serverIsRunning, startServer } from "../services/localServer";

export default function Index() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<"idle" | "starting" | "running" | "error">("idle");
  const [serverLogs, setServerLogs] = useState<string[]>([]);

  const openHotspotSettings = async () => {
    if (Platform.OS === "ios") {

      const urls = [
        "App-Prefs:root=INTERNET_TETHERING",
        "App-Prefs:root=MOBILE_DATA_SETTINGS_ID&path=INTERNET_TETHERING",
        "prefs:root=INTERNET_TETHERING",
      ];
      
      for (const url of urls) {
        try {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            return;
          }
        } catch (err) {
          console.log(`Failed to open ${url}:`, err);
        }
      }
      

      Linking.openSettings();
    } else {

      Alert.alert(
        "Paramètres Hotspot",
        "Veuillez naviguer vers : Réseaux et Internet > Point d'accès et partage de connexion",
        [
          {
            text: "Annuler",
            style: "cancel"
          },
          {
            text: "Ouvrir les paramètres",
            onPress: () => Linking.openSettings()
          }
        ]
      );
    }
  };

  async function onLogin() {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez entrer votre email et mot de passe.");
      return;
    }

    setLoading(true);

    try {
      await login(email, password);

      console.log("Login succès, redirection...");
      router.replace("/(tabs)/home");
    } catch (error: any) {
      console.log("Erreur login:", error);
      Alert.alert("Accès refusé", "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  async function onStartServer() {
    if (serverIsRunning()) {
      addLog("Server is already running!");
      setServerStatus("running");
      return;
    }

    setServerStatus("starting");
    addLog("Starting server...");

    try {
      await startServer();
      setServerStatus("running");
      addLog("✅ Server started successfully!");
      addLog(`Server listening on 0.0.0.0:3000`);
    } catch (error: any) {
      setServerStatus("error");
      addLog(`❌ Error: ${error.message || String(error)}`);
      console.error("Server start error:", error);
    }
  }

  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    setServerLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.title}>Hackathon ETS</Text>
          </View>

          <View style={styles.card}>
            {/* ... Champs Email et Mot de passe ... */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="votre.email@exemple.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Mot de passe</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#999"
              secureTextEntry
              style={styles.input}
            />

            {/* Bouton pour se connecter */}
            <TouchableOpacity
              style={styles.button}
              onPress={onLogin}
              activeOpacity={0.85}
              disabled={loading} // Désactive le bouton pendant le chargement
            >
              <Text style={styles.buttonText}>
                {loading ? "Connexion..." : "Se connecter"}
              </Text>
            </TouchableOpacity>

            {/* Nouveau Bouton pour le Hotspot */}
            <TouchableOpacity
              style={[styles.button, styles.hotspotButton]} 
              onPress={handleOpenHotspot}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Ouvrir les réglages Hotspot</Text>
            </TouchableOpacity>
            
            {/* ... Lien d'inscription ... */}
            <TouchableOpacity onPress={() => router.push("/signup")}>
              <Text style={styles.forgot}>Pas de compte ? s'inscrire</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hotspotButton}
              onPress={openHotspotSettings}
            >
              <Text style={styles.hotspotButtonText}>Ouvrir les paramètres Hotspot</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.serverButton]}
              onPress={onStartServer}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>
                {serverStatus === "starting" ? "Starting Server..." : 
                 serverStatus === "running" ? "✅ Server Running" : 
                 "Test Server"}
              </Text>
            </TouchableOpacity>

            {serverStatus !== "idle" && (
              <View style={styles.serverStatusContainer}>
                <Text style={styles.serverStatusTitle}>Server Status:</Text>
                <Text style={[
                  styles.serverStatusText,
                  serverStatus === "running" && styles.serverStatusSuccess,
                  serverStatus === "error" && styles.serverStatusError
                ]}>
                  {serverStatus === "starting" ? "🔄 Starting..." :
                   serverStatus === "running" ? "✅ Running on port 3000" :
                   "❌ Error"}
                </Text>
                
                {serverLogs.length > 0 && (
                  <View style={styles.logsContainer}>
                    <Text style={styles.logsTitle}>Logs:</Text>
                    <View style={styles.logsContent}>
                      {serverLogs.map((log, index) => (
                        <Text key={index} style={styles.logText}>{log}</Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Team YVL</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1724",
  },
  inner: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: "#0b1220",
    borderRadius: 14,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    color: "#d1d5db",
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#071025",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 15,
  },
  button: {
    marginTop: 18,
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  // Style spécifique pour le bouton Hotspot pour le différencier légèrement
  hotspotButton: {
    marginTop: 10, // Réduire la marge après le bouton de connexion
    backgroundColor: "#f97316", // Couleur orange pour le différencier
  },
  forgot: {
    color: "#9ca3af",
    marginTop: 18, // Augmenter la marge du lien
    textAlign: "center",
  },
  hotspotButton: {
    marginTop: 12,
    backgroundColor: "#1f2937",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  hotspotButtonText: {
    color: "#9ca3af",
    fontWeight: "500",
    fontSize: 14,
  },
  footer: {
    marginTop: 22,
    alignItems: "center",
  },
  footerText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  serverButton: {
    marginTop: 12,
    backgroundColor: "#10b981",
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
});