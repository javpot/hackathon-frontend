import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons"; 

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, 
        tabBarStyle: {
          backgroundColor: "#0b1220", 
          borderTopColor: "#1f2937", 
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#3b82f6", 
        tabBarInactiveTintColor: "#9ca3af", 
      }}
    >
      <Tabs.Screen
        name="home" 
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="objs" 
        options={{
          title: "Objets",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} /> 
          ),
        }}
      />
      <Tabs.Screen
        name="settings" 
        options={{
          title: "Paramètres",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}