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
      <Stack.Screen
        name="emetteur1"
        options={{
          title: "Émetteur",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="emetteur2"
        options={{
          title: "Émetteur 2",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="product"
        options={{
          title: "Détail du produit",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
