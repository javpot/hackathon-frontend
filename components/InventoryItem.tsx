import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

type InventoryItemProps = {
  item: {
    id: string;
    name: string;
    description: string;
    quantity: string;
    image: string;
  };
};

export default function InventoryItem({ item }: InventoryItemProps) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.desc} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.quantity}>Quantité: {item.quantity}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#171717",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 16,
    overflow: "hidden",
    height: 130,
  },
  image: {
    width: 110,
    height: "100%",
    backgroundColor: "#202020",
  },
  details: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  name: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  desc: {
    color: "#9ca3af",
    fontSize: 13,
  },
  quantity: {
    color: "#4ade80",
    fontWeight: "600",
    fontSize: 14,
  },
});
