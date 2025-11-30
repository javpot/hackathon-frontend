import { Stack } from "expo-router";
// import ShakeManager from "../components/ShakeManager";
import React, { useEffect, useState } from "react";
import { NativeModules, Platform } from "react-native";
import { AlertProvider } from "../contexts/AlertContext";


function NativeShakeManagerLoader() {
  const [Comp, setComp] = useState<any>(null);
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    const ped = NativeModules.ExponentPedometer || NativeModules.Pedometer || NativeModules.ExpoPedometer;
    if (!ped) return;
    let mounted = true;
    (async () => {
      try {
        const module = await import("../components/ShakeManager");
        if (mounted && module?.default) setComp(() => module.default);
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);
  if (!Comp) return null;
  return <Comp />;
}


export default function RootLayout() {
  return (
    <AlertProvider>
      {/* <ShakeManager /> */}
      <NativeShakeManagerLoader />

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0f1724" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="product"
          options={{ title: "Détail", headerShown: false }}
        />

        {/* ADD THIS to hide the header on your Hotspot screen */}
        <Stack.Screen name="emetteur2" options={{ headerShown: false }} />

        {/* Listings management screen */}
        <Stack.Screen name="my-listings" options={{ headerShown: false }} />

        {/* Connection mode screen */}
        <Stack.Screen name="connection-mode" options={{ headerShown: false }} />
      </Stack>
    </AlertProvider>
  );
}
