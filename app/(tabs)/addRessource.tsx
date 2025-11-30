import React from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import Resource from "../../components/Resources";

export default function AddRessource() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventaire</Text>
      </View>

      {/* COMPOSANT RESOURCE */}
      <Resource />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
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
});
