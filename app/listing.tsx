import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    FlatList,
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

// --- DONNÉES FICTIVES (MOCK DATA) BASÉES SUR TON IMAGE ---
const DATA = [
  {
    id: "1",
    title: "Pokémon TCG Chinese Sword & Shield CS4aC 141 SR Glaceon V Holo Alt Art Card",
    condition: "Pre-Owned",
    price: "C $55.20",
    buyingFormat: "or Best Offer",
    shipping: "Free shipping",
    location: "from China",
    sold: "91 sold",
    image: "https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/SWSH7/SWSH7_175_R_EN.png", // Image placeholder Glaceon
    isSponsored: true,
  },
  {
    id: "2",
    title: "PSA 9 MINT Glaceon V 077/069 SR SA Eevee Heroes Alt Art Japanese",
    condition: "New (Other)",
    price: "C $167.72",
    buyingFormat: "or Best Offer",
    shipping: "+C $23.45 shipping",
    location: "from United States",
    sold: "",
    image: "https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/SWSH7/SWSH7_174_R_EN.png", // Autre image placeholder
    isSponsored: true,
  },
  {
    id: "3",
    title: "Pokemon TCG S-Chinese Glaceon V 141/132 CS4bC SR Holo Alt Art NM",
    condition: "Pre-Owned",
    price: "C $85.00",
    buyingFormat: "",
    shipping: "Free shipping",
    location: "from China",
    sold: "12 sold",
    image: "https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/SWSH7/SWSH7_040_R_EN.png",
    isSponsored: false,
  },
];

// Couleur du thème précédent (Orange Brique) pour la cohérence
const THEME_COLOR = "#A84420";

export default function Listing() {
  const router = useRouter();

  // --- COMPOSANT POUR UN ARTICLE (ITEM) ---
  const renderItem = ({ item }: { item: typeof DATA[0] }) => (
    <TouchableOpacity activeOpacity={0.7} style={styles.itemContainer}>
      {/* 1. IMAGE AVEC ICÔNE CŒUR */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: item.image }}
          style={styles.itemImage}
          resizeMode="cover" // ou "contain" selon la préférence
        />
        {/* Bouton Cœur (Favori) en superposition */}
        <View style={styles.heartContainer}>
          <MaterialCommunityIcons name="heart-outline" size={20} color="white" />
        </View>
      </View>

      {/* 2. DÉTAILS DE L'ARTICLE */}
      <View style={styles.detailsContainer}>
        {/* Titre sur plusieurs lignes */}
        <Text style={styles.itemTitle} numberOfLines={3}>
          {item.title}
        </Text>

        {/* État de l'objet */}
        <Text style={styles.itemCondition}>{item.condition}</Text>

        {/* Prix (Gros et gras) */}
        <Text style={styles.itemPrice}>{item.price}</Text>

        {/* Achat immédiat ou offre */}
        {item.buyingFormat ? (
          <Text style={styles.itemMeta}>{item.buyingFormat}</Text>
        ) : null}

        {/* Livraison */}
        <Text style={styles.itemMeta}>{item.shipping}</Text>

        {/* Provenance */}
        <Text style={styles.itemMeta}>{item.location}</Text>

        {/* Nombre de ventes */}
        {item.sold ? (
          <Text style={styles.itemMeta}>{item.sold}</Text>
        ) : null}

        {/* Tag Sponsored (Optionnel) */}
        {item.isSponsored && (
          <Text style={styles.sponsoredText}>Sponsored</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
           <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zone de Troc</Text>
        {/* Icône de filtre ou recherche pour équilibrer le header */}
        <MaterialCommunityIcons name="magnify" size={28} color="white" />
      </View>

      {/* --- LISTE DES ARTICLES --- */}
      <FlatList
        data={DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // Fond noir comme sur l'image
  } as ViewStyle,

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333", // Séparateur discret sous le header
  } as ViewStyle,
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  } as TextStyle,
  backButton: {
    marginLeft: -8,
  } as ViewStyle,

  // Liste
  listContent: {
    paddingVertical: 10,
  } as ViewStyle,
  separator: {
    height: 16, // Espace entre les items
  } as ViewStyle,

  // Styles d'un Item
  itemContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 5,
  } as ViewStyle,

  // Partie Image (Gauche)
  imageWrapper: {
    position: "relative",
    marginRight: 12,
  } as ViewStyle,
  itemImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: "#202020", // Fond gris foncé si l'image charge mal
  } as ImageStyle,
  heartContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)", // Cercle noir semi-transparent
    borderRadius: 20,
    padding: 6,
  } as ViewStyle,

  // Partie Texte (Droite)
  detailsContainer: {
    flex: 1,
    justifyContent: "flex-start",
  } as ViewStyle,
  itemTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
    fontWeight: "400",
  } as TextStyle,
  itemCondition: {
    color: "#AAAAAA", // Gris clair
    fontSize: 13,
    marginBottom: 4,
  } as TextStyle,
  itemPrice: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  } as TextStyle,
  itemMeta: {
    color: "#888888", // Gris plus foncé pour les détails secondaires
    fontSize: 13,
    marginTop: 1,
  } as TextStyle,
  sponsoredText: {
    color: "#666666",
    fontSize: 12,
    marginTop: 8,
  } as TextStyle,
});