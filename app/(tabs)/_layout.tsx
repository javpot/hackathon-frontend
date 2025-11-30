import { Tabs } from "expo-router";
import React from "react";
import CustomTabBar from "../../components/CustomTabBar"; // Ajuste le chemin selon ton dossier

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false, // On cache le header par défaut
        tabBarStyle: {
          backgroundColor: "transparent", // Important pour ton design overlay
          position: "absolute",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ headerShown: false }} />
      <Tabs.Screen name="map" options={{ headerShown: false }} />
      <Tabs.Screen name="inventory" options={{ headerShown: false }} />
    </Tabs>
  );
}
