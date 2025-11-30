import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Définir les icônes selon le nom de la route
        let iconName: any = "help-circle";
        let label = "Unknown";

        if (route.name === "home") {
          iconName = "home";
          label = "Home";
        } else if (route.name === "map") {
          iconName = "map";
          label = "Map";
        } else if (route.name === "listings") {
          iconName = "pricetags";
          label = "Listing";
        }

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabItem}
          >
            <Ionicons
              name={isFocused ? iconName : `${iconName}-outline`}
              size={24}
              color={isFocused ? "#4ade80" : "#6b7280"}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? "#4ade80" : "#6b7280" },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    width: width,
    backgroundColor: "rgba(23, 23, 23, 0.95)",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 15,
    paddingBottom: Platform.OS === "ios" ? 35 : 20,
    borderTopWidth: 1,
    borderTopColor: "#262626",
  },
  tabItem: {
    alignItems: "center",
    gap: 4,
    flex: 1, // Pour que la zone cliquable soit plus large
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});
