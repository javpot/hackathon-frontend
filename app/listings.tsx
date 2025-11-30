import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

// --- DONNÉES DE TROC ---
const LISTINGS = [
  {
    id: "1",
    title: "Geiger Counter ",
    lookingFor: "Antibiotics, 9mm Ammo",
    image:
      "https://m.media-amazon.com/images/I/61S-lXn3DlL._AC_UF1000,1000_QL80_.jpg",
  },
  {
    id: "2",
    title: "MRE Ration Pack (Box of 12)",
    lookingFor: "Clean Water (10L), Warm Blanket",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/6/62/MRE_contents.jpg",
  },
  {
    id: "3",
    title: "Tactical Filter Mask 3M",
    lookingFor: "Solar Charger, Batteries (AA)",
    image: "https://m.media-amazon.com/images/I/71pH+B0p+BL.jpg",
  },
  {
    id: "4",
    title: "Water Purification Tablets",
    lookingFor: "Bandages, Painkillers",
    image: "https://m.media-amazon.com/images/I/71R1ySg-NlL._AC_SL1500_.jpg",
  },
  {
    id: "5",
    title: "Solar Power Bank 20000mAh",
    lookingFor: "Winter Boots (Size 10), Knife",
    image: "https://m.media-amazon.com/images/I/71E+q3+7HcL._AC_SS450_.jpg",
  },
];

export default function ListingScreen() {
  const router = useRouter();

  const renderItem = ({ item }: { item: (typeof LISTINGS)[0] }) => (
    <TouchableOpacity activeOpacity={0.9} style={styles.itemContainer}>
      {/* Image à gauche */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: item.image }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      </View>

      {/* Détails à droite */}
      <View style={styles.detailsContainer}>
        {/* Titre et Info Troc */}
        <View style={styles.infoTop}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.tradeContainer}>
            <Text style={styles.tradeLabel}>Looking for:</Text>
            <Text style={styles.tradeItems} numberOfLines={2}>
              {item.lookingFor}
            </Text>
          </View>
        </View>

        {/* Boutons d'Action (En bas à droite) */}
        <View style={styles.actionRow}>
          {/* Bouton Message */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color="#4ade80"
            />
          </TouchableOpacity>

          {/* Bouton Appel */}
          <TouchableOpacity style={[styles.actionButton, styles.callButton]}>
            <Ionicons name="call-outline" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trade</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={20} color="#4ade80" />
        </TouchableOpacity>
      </View>

      {/* --- SEARCH BAR --- */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6b7280" />
          <TextInput
            placeholder="Search supplies..."
            placeholderTextColor="#6b7280"
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* --- LISTE --- */}
      <FlatList
        data={LISTINGS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* --- BARRE DE NAVIGATION --- */}
      <View style={styles.tabBar}>
        <TabItem icon="home" label="Home" onPress={() => router.push("/")} />
        <TabItem icon="map" label="Map" onPress={() => router.push("/map")} />
        <TabItem
          icon="pricetags"
          label="Listing"
          isActive={true}
          onPress={() => {}}
        />
      </View>
    </SafeAreaView>
  );
}

// --- SOUS-COMPOSANT TAB ITEM ---
const TabItem = ({
  icon,
  label,
  isActive,
  onPress,
}: {
  icon: any;
  label: string;
  isActive?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    <Ionicons
      name={isActive ? icon : `${icon}-outline`}
      size={24}
      color={isActive ? "#4ade80" : "#6b7280"}
    />
    <Text
      style={[styles.tabLabel, { color: isActive ? "#4ade80" : "#6b7280" }]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },
  filterButton: {
    padding: 8,
    backgroundColor: "#171717",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "white",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // -- ITEM CARD MODIFIÉE --
  itemContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#171717",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#262626",
    height: 130, // J'ai augmenté la hauteur (avant 120) pour donner de l'air
  },
  imageWrapper: {
    width: 110,
    height: "100%",
    backgroundColor: "#202020",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  detailsContainer: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  infoTop: {
    // Conteneur pour le texte du haut
  },
  itemTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  tradeContainer: {
    marginTop: 2,
  },
  tradeLabel: {
    color: "#9ca3af",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  tradeItems: {
    color: "#4ade80",
    fontSize: 13,
    fontWeight: "500",
  },

  // -- BOUTONS D'ACTION --
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10, // Ajout de marge pour bien séparer du texte au-dessus
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#262626",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  callButton: {
    backgroundColor: "#4ade80",
    borderColor: "#4ade80",
  },

  // Navbar
  tabBar: {
    position: "absolute",
    bottom: 0,
    width: width,
    backgroundColor: "rgba(23, 23, 23, 0.95)",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 15,
    paddingBottom: Platform.OS === "ios" ? 35 : 20,
    borderTopWidth: 1,
    borderTopColor: "#262626",
  },
  tabItem: {
    alignItems: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});
