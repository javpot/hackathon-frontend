import React, { useState } from "react";
import { 
  View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert 
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { updateObj, deleteObj } from "../../services/api"; 
import { COLORS } from "../../constants/theme";

export default function ObjDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [title, setTitle] = useState(params.title as string);
  const [loading, setLoading] = useState(false);

  const id = Number(params.id);
  const isCompleted = params.is_completed === "true" || params.is_completed === "1";

  async function handleSave() {
    if (!title.trim()) return;
    
    setLoading(true);
    try {
      await updateObj(id, { title: title });
      Alert.alert("Succès", "Modifié !");
      router.back(); 
    } catch (e) {
      Alert.alert("Erreur", "Impossible de sauvegarder");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    Alert.alert("Supprimer", "Vraiment ?", [
      { text: "Non", style: "cancel" },
      { text: "Oui", style: "destructive", onPress: async () => {
          await deleteObj(id);
          router.back();
      }}
    ]);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: "Détails", 
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.text,
      }} />

      <Text style={styles.label}>Titre de l'objet</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholderTextColor={COLORS.textSecondary}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sauvegarder</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={[styles.btnText, { color: COLORS.error }]}>Supprimer cet objet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  label: { color: COLORS.textSecondary, marginBottom: 10, fontSize: 14 },
  input: { 
    backgroundColor: COLORS.input, color: COLORS.text, 
    padding: 15, borderRadius: 10, fontSize: 18, marginBottom: 30 
  },
  saveButton: { 
    backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, 
    alignItems: "center", marginBottom: 15 
  },
  deleteButton: { 
    backgroundColor: "transparent", padding: 15, borderRadius: 10, 
    alignItems: "center", borderWidth: 1, borderColor: COLORS.error 
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});