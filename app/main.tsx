import React from "react";
import { View, Text, StyleSheet, StatusBar } from "react-native";

export default function Main() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.text}>Hello World</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1724",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
