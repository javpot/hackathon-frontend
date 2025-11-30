import React from "react";
import {
  ImageStyle,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
// Utilisation de MaterialCommunityIcons pour l'icône de hotspot et de retour
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// Définition de la couleur principale (orange brique/style rouge)
const THEME_COLOR = "#A84420";

export default function Emetteur2() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        {/* --- EN-TÊTE (Bouton retour + Barre de progression) --- */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.7}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={32}
              color="white"
            />
          </TouchableOpacity>

          <View style={styles.progressBarContainer}>
            {/* Remplissage à environ 30% comme sur l'image */}
            <View style={styles.progressBarFill} />
          </View>
        </View>

        {/* --- CONTENU CENTRAL (Icône + Textes) --- */}
        <View style={styles.mainContent}>
          {/* L'icône Hotspot demandée, en gros et en couleur */}
          <MaterialCommunityIcons
            name="broadcast" // "broadcast" ou "wifi" ressemble à l'image
            size={150}
            color={THEME_COLOR}
            style={styles.icon}
          />

          <Text style={styles.title}>
            Active ton hotspot pour établir ton réseau local.
          </Text>

          <Text style={styles.subtitle}>C’est ton signal.</Text>

          <Text style={styles.description}>
            Les survivants à proximité pourront détecter ton réseau et te
            rejoindre pour échanger des ressources hors-ligne.
          </Text>
        </View>

        {/* --- BOUTON DU BAS --- */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={() => router.push("/product")}
          >
            <Text style={styles.actionButtonText}>J'ai activé mon hotspot</Text>
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
    justifyContent: "space-between", // Écarte le haut, le milieu et le bas
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
    // Ajustement négatif pour aligner visuellement la flèche
    marginLeft: -10,
  } as ViewStyle,
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#333333", // Gris foncé
    borderRadius: 4,
    overflow: "hidden",
  } as ViewStyle,
  progressBarFill: {
    width: "30%", // Progression approximative de l'image
    height: "100%",
    backgroundColor: THEME_COLOR,
    borderRadius: 4,
  } as ViewStyle,

  // Main Content Styles
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40, // Un peu d'espace avant le bouton du bas
  } as ViewStyle,
  icon: {
    marginBottom: 40,
    // L'icône est colorée via la prop 'color' dans le JSX
  } as ImageStyle,
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 30,
  } as TextStyle,
  subtitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  } as TextStyle,
  description: {
    color: "#CCCCCC", // Blanc légèrement grisé pour la description
    fontSize: 17,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
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
    fontSize: 18,
    fontWeight: "700",
  } as TextStyle,
});
