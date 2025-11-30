import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Keyboard,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function Index() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
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
            onChangeText={(t) => { setName(t); if (t.trim()) setNameError(null); }}
          />
          {nameError && <Text style={styles.errorText}>{nameError}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Numéro de téléphone"
            placeholderTextColor="#777"
            value={phone}
            onChangeText={(p) => { setPhone(p); const phoneClean = p.replace(/\s|-/g, ''); const phoneRegex = /^\+?\d{6,15}$/; if (phoneRegex.test(phoneClean)) setPhoneError(null); }}
            keyboardType="phone-pad"
          />
          {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

          <TouchableOpacity
            style={[styles.confirmButton, (!name || !phone) && styles.buttonDisabled]}
            activeOpacity={0.8}
            onPress={async () => {
              // Validation
              let ok = true;
              if (!name.trim()) {
                setNameError("Le nom est requis");
                ok = false;
              } else {
                setNameError(null);
              }
              // Simple phone check: digits length between 6 and 15, optional +
              const phoneClean = phone.replace(/\s|-/g, '');
              const phoneRegex = /^\+?\d{6,15}$/;
              if (!phoneClean || !phoneRegex.test(phoneClean)) {
                setPhoneError("Entrez un numéro de téléphone valide");
                ok = false;
              } else {
                setPhoneError(null);
              }
              if (!ok) return;

              try {
                await AsyncStorage.setItem('profile', JSON.stringify({ name: name.trim(), phone: phoneClean }));
              } catch (err) {
                console.warn('Failed to save profile', err);
              }
              router.push('/home');
            }}
            disabled={!name || !phone}
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
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#ff6b6b',
    marginTop: 4,
    marginBottom: 8,
    fontSize: 13,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
