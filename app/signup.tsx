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
  ActivityIndicator, 
} from "react-native";
import { useRouter } from "expo-router";
import { register } from "../services/api"; 

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false); 

  // logique connectée au backend
  async function onSignup() {
    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true); 
    try {
      await register(name, email, password);

      Alert.alert(
        "Inscription",
        `Bienvenue ${name} !\nCompte créé avec succès.`
      );
      router.replace("/(tabs)/home");
    } catch (error: any) {
      const message = error.message || "Une erreur est survenue.";
      Alert.alert("Erreur", message);
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
            <Text style={styles.title}>Créer un compte</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Votre nom"
              placeholderTextColor="#999"
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>

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

            <Text style={[styles.label, { marginTop: 12 }]}>
              Confirmer le mot de passe
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor="#999"
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={onSignup}
              activeOpacity={0.85}
              disabled={loading} // Désactiver le bouton pendant le chargement
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
            </TouchableOpacity>
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
    justifyContent: "center",
    padding: 20,
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
  link: {
    color: "#9ca3af",
    marginTop: 12,
    textAlign: "center",
  },
});