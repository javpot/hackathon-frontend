import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Configure la barre de statut pour qu'elle soit blanche sur fond noir */}
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        {/* Titre */}
        <Text style={styles.title}>Veuillez choisir un choix</Text>

        {/* Groupe Boutons */}
        <View style={styles.buttonGroup}>
          {/* Bouton Émetteur (Plein) */}
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.8}
            onPress={() => router.push("/emetteur2")}
          >
            <Text style={styles.primaryButtonText}>Émetteur</Text>
          </TouchableOpacity>

          {/* Ligne de séparation */}
          <View style={styles.separator} />

          {/* Bouton Récepteur (Contour) */}
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Récepteur</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // Fond noir complet
  },
  content: {
    flex: 1,
    justifyContent: "center", // Centre verticalement
    alignItems: "center", // Centre horizontalement
    paddingHorizontal: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 40,
    textAlign: "center",
  },
  buttonGroup: {
    width: "100%",
    maxWidth: 320, // Limite la largeur sur les grands écrans (tablettes)
    alignItems: "center",
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#A84420", // Couleur orange brique
    paddingVertical: 16,
    borderRadius: 30, // Coins très arrondis
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  separator: {
    width: "100%",
    height: 1,
    backgroundColor: "#555555", // Gris foncé pour la ligne
    marginVertical: 25, // Espace en haut et en bas de la ligne
  },
  secondaryButton: {
    width: "100%",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#555555", // Bordure grise
    paddingVertical: 14, // Légèrement moins haut pour compenser la bordure
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#A84420", // Texte orange brique
    fontSize: 18,
    fontWeight: "600",
  },
});
