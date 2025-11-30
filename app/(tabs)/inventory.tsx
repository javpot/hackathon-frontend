import React, { useState } from "react";
import { FlatList, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import InventoryItem from "../../components/InventoryItem";

export default function Inventory() {
  // Exemple de données initiales
  const [inventory, setInventory] = useState([
    {
      id: "1",
      name: "Bouteille d'eau 1L",
      description: "Eau potable, emballage plastique",
      quantity: "10",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/4/45/Bouteille_eau.jpg",
    },
    {
      id: "2",
      name: "MRE Ration Pack",
      description: "Pack repas militaire (12 unités)",
      quantity: "5",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/6/62/MRE_contents.jpg",
    },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Inventaire</Text>
      </View>

      {/* LISTE DES RESSOURCES */}
      <FlatList
        data={inventory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InventoryItem item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingBottom: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
});
