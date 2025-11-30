import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

// Définition des couleurs
const THEME_COLOR = "#A84420"; // Orange brique
const SUCCESS_COLOR = "#2E7D32"; // Vert succès (similaire à l'image)

export default function Emetteur3() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        {/* --- EN-TÊTE (Bouton retour + Barre de progression) --- */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            activeOpacity={0.7}
            onPress={() => router.back()} // Retour en arrière
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={32}
              color="white"
            />
          </TouchableOpacity>

          <View style={styles.progressBarContainer}>
            {/* Remplissage total (100%) comme sur l'image */}
            <View style={styles.progressBarFill} />
          </View>
        </View>

        {/* --- CONTENU CENTRAL (Icône Succès + Texte) --- */}
        <View style={styles.mainContent}>
          {/* Icône Check verte */}
          <MaterialCommunityIcons
            name="check-circle"
            size={120}
            color={SUCCESS_COLOR}
            style={styles.icon}
          />

          <Text style={styles.statusText}>
            Vous etes connextion
          </Text>
        </View>

        {/* --- BOUTON DU BAS --- */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={() => router.push("/listing")}
          >
            <Text style={styles.actionButtonText}>Entrer dans la Zone de Troc</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // Fond noir
  } as ViewStyle,
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
  } as ViewStyle,

  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  } as ViewStyle,
  backButton: {
    marginRight: 15,
    marginLeft: -10,
  } as ViewStyle,
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#333333",
    borderRadius: 4,
    overflow: "hidden",
  } as ViewStyle,
  progressBarFill: {
    width: "100%", // Barre pleine
    height: "100%",
    backgroundColor: THEME_COLOR,
    borderRadius: 4,
  } as ViewStyle,

  // Main Content Styles
  mainContent: {
    flex: 1,
    justifyContent: "center", // Centre verticalement
    alignItems: "center",     // Centre horizontalement
    paddingBottom: 80,        // Remonte légèrement le contenu visuellement
  } as ViewStyle,
  icon: {
    marginBottom: 30,
    // Note: Pour obtenir l'effet "cercle plein vert avec check blanc" exactement comme l'image,
    // on utilise "check-circle" qui est rempli. 
    // Si tu voulais un fond blanc et check vert, il faudrait inverser les couleurs ou utiliser une View ronde.
  } as ViewStyle,
  statusText: {
    color: "#CCCCCC", // Gris clair / Blanc cassé
    fontSize: 18,
    fontWeight: "400",
    textAlign: "center",
  } as TextStyle,

  // Footer/Button Styles
  footer: {
    width: "100%",
    alignItems: "center",
  } as ViewStyle,
  actionButton: {
    width: "100%",
    backgroundColor: THEME_COLOR,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16, // Un peu plus petit pour faire tenir le texte long
    fontWeight: "700",
  } as TextStyle,
});