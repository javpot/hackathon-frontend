import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function Resource() {
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      alert("Permission caméra requise !");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!name || !description || !quantity || !image) {
      alert("Veuillez remplir tous les champs et prendre une photo !");
      return;
    }

    const newResource = { name, description, quantity, image };
    console.log("Nouvelle ressource :", newResource);
    alert("Ressource ajoutée !");

    // Reset form
    setName("");
    setDescription("");
    setQuantity("");
    setImage(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.formContainer}>
      {/* PHOTO */}
      <TouchableOpacity onPress={takePhoto} style={styles.photoContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.photo} />
        ) : (
          <Ionicons name="camera" size={50} color="#6b7280" />
        )}
      </TouchableOpacity>

      {/* FORMULAIRE */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nom de la ressource</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Bouteille d'eau"
          placeholderTextColor="#6b7280"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Ex: Eau potable 1L"
          placeholderTextColor="#6b7280"
          multiline
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Quantité</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 10"
          placeholderTextColor="#6b7280"
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
        />
      </View>

      {/* BOUTON AJOUTER */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Ajouter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  photoContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#171717",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 20,
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#171717",
    color: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#262626",
  },
  submitButton: {
    backgroundColor: "#4ade80",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  submitText: {
    color: "#050505",
    fontWeight: "bold",
    fontSize: 16,
  },
});
