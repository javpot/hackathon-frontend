import { Stack } from "expo-router";
import React from "react";
import ShakeManager from "../components/ShakeManager";
import { AlertProvider } from "../contexts/AlertContext";

export default function RootLayout() {
  return (
    <AlertProvider>
      <ShakeManager />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0f1724" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="map" options={{ title: "Carte", headerShown: false }} />
        <Stack.Screen name="product" options={{ title: "Détail", headerShown: false }} />

        {/* ADD THIS to hide the header on your Hotspot screen */}
        <Stack.Screen name="emetteur2" options={{ headerShown: false }} />
      </Stack>
    </AlertProvider>
  );
}