import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";

export default function Index() {
  const [name, setName] = useState("");
  const router = useRouter();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.content}>
          <Text style={styles.title}>Entrez votre nom</Text>

          <TextInput
            style={styles.input}
            placeholder="Votre nom"
            placeholderTextColor="#777"
            value={name}
            onChangeText={setName}
          />

          <TouchableOpacity
            style={styles.confirmButton}
            activeOpacity={0.8}
            onPress={() => router.push("/home")}
          >
            <Text style={styles.confirmButtonText}>Confirmer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 40,
    textAlign: "center",
  },
  input: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "#555",
    paddingVertical: 14,
    borderRadius: 30,
    paddingHorizontal: 15,
    color: "#fff",
    fontSize: 18,
    marginBottom: 25,
  },
  confirmButton: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#A84420",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
