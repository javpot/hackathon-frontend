import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0f1724",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen
        name="map"
        options={{
          title: "Carte",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="product"
        options={{
          title: "Détail du produit",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="listings"
        options={{
          title: "Listings",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
