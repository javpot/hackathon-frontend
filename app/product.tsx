import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
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

// Récupération de la largeur pour le dimensionnement de l'image
const { width } = Dimensions.get("window");

export default function Product() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        {/* Bouton Retour Circulaire */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Item</Text>

        {/* Vue vide pour équilibrer le header (pour que le titre soit parfaitement centré) */}
        <View style={{ width: 40 }} />
      </View>

      {/* --- CONTENU PRINCIPAL --- */}
      <View style={styles.content}>
        {/* Image du produit */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: "https://i.imgur.com/3V7q9wV.png" }} // Lien placeholder d'une bouteille bleue
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>

        {/* Informations Produit */}
        <View style={styles.infoContainer}>
          <Text style={styles.productTitle}>Gatorade bleu</Text>

          <Text style={styles.vendorText}>
            Vendor: <Text style={styles.vendorName}>Kenny rigaud</Text>
          </Text>

          <Text style={styles.idText}>ID: iw3123jfekf144</Text>
        </View>
      </View>

      {/* --- BARRE DE NAVIGATION (BOTTOM TAB) --- */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // Fond noir complet
  } as ViewStyle,

  // --- Header Styles ---
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  } as ViewStyle,
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1C1C1E", // Gris foncé pour le bouton
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
  } as TextStyle,

  // --- Content Styles ---
  content: {
    flex: 1,
    paddingHorizontal: 20,
  } as ViewStyle,
  imageContainer: {
    width: "100%",
    aspectRatio: 1, // Carré
    backgroundColor: "white", // Fond blanc derrière la bouteille comme sur l'image
    borderRadius: 4, // Légèrement arrondi si nécessaire, sinon 0
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  } as ViewStyle,
  productImage: {
    width: "80%",
    height: "100%",
  } as ImageStyle,
  infoContainer: {
    marginTop: 10,
  } as ViewStyle,
  productTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  } as TextStyle,
  vendorText: {
    color: "#AAAAAA", // Gris clair
    fontSize: 16,
    marginBottom: 4,
  } as TextStyle,
  vendorName: {
    color: "#DDDDDD",
    fontWeight: "500",
  } as TextStyle,
  idText: {
    color: "#555555", // Gris très foncé
    fontSize: 14,
  } as TextStyle,

  // --- Bottom Bar Styles ---
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#1C1C1E", // Couleur gris foncé typique des TabBars iOS
    paddingVertical: 15,
    paddingBottom: 25, // Un peu plus d'espace en bas (pour simuler la zone Home Indicator)
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  } as ViewStyle,
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  tabText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  } as TextStyle,
});
