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

export default function Index() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

            <TouchableOpacity
              style={styles.button}
              onPress={onLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Se connecter</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/signup")}>
              <Text style={styles.forgot}>Pas de compte ? s'inscrire</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hotspotButton}
              onPress={openHotspotSettings}
            >
              <Text style={styles.hotspotButtonText}>Ouvrir les paramètres Hotspot</Text>
            </TouchableOpacity>
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
  forgot: {
    color: "#9ca3af",
    marginTop: 12,
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
});
