import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Linking, // <-- Importation de Linking pour ouvrir les réglages
} from "react-native";
import { useRouter } from "expo-router";
// Assurez-vous que le chemin d'accès au service API est correct
import { login, getUser, logout } from "../services/api"; 

// --- Fonctions d'Ouverture des Réglages Hotspot ---
const openHotspotSettingsIOS = () => {
   Linking.openURL("prefs:root=INTERNET_TETHERING").catch(() => {
    Linking.openSettings();
  });
  
  // L'action cruciale est ici :
  Alert.alert(
    "1. Ouvrez Réglages, 2. Partage de connexion",
    "Pour créer le réseau local, vous devez activer manuellement le 'Partage de connexion' (Hotspot) dans l'application Réglages.",
    [{ text: "J'ai compris" }]
  );
};

const openHotspotSettingsAndroid = () => {
  // Sur Android, on tente d'ouvrir directement l'écran des réglages de tethering.
  // L'action spécifique peut varier, mais celle-ci est la plus courante.
  Linking.sendIntent('android.settings.TETHER_SETTINGS').catch(() => {
    // Fallback: Ouvre les réglages généraux si l'intent échoue
    Linking.openSettings();
  });
};

// ----------------------------------------------------

export default function Index() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

  // Nouvelle fonction pour gérer l'ouverture du Hotspot
  const handleOpenHotspot = () => {
    if (Platform.OS === 'ios') {
      openHotspotSettingsIOS();
    } else if (Platform.OS === 'android') {
      openHotspotSettingsAndroid();
    } else {
      Alert.alert("Information", "Cette fonctionnalité n'est pas supportée sur cette plateforme.");
    }
  };

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
  footer: {
    marginTop: 22,
    alignItems: "center",
  },
  footerText: {
    color: "#9ca3af",
    fontSize: 13,
  },
});