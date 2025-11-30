import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AlertType } from '../contexts/AlertContext';

interface AlertMarkerProps {
    type: AlertType | string; // Allow string fallback for safety
}

export default function AlertMarker({ type }: AlertMarkerProps) {
    const color = getPinColor(type as string);
    const icon = getIconName(type as string);

    return (
        <View style={[styles.container, { backgroundColor: color }]}>
            <MaterialCommunityIcons name={icon} size={20} color="white" />
        </View>
    );
}

// Helper: Get Background Color
const getPinColor = (type: string) => {
    switch (type) {
        case "hospital": return "#f6a1a1ff"; // Pink
        case "food": return "#f59e0b";     // Amber/Orange
        case "water": return "#3b82f6";    // Blue
        case "shelter": return "#10b981";  // Emerald
        case "zombie": return "#b91c1c";   // Dark Red/Burgundy
        case "warning": return "#eab308";  // Yellow
        case "info": return "#0ea5e9";     // Sky Blue
        default: return "#8b5cf6";         // Purple
    }
};

// Helper: Get Icon Name
const getIconName = (type: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (type) {
        case "hospital": return "hospital-box";
        case "food": return "food-drumstick";
        case "water": return "water";
        case "shelter": return "home-group";
        case "zombie": return "skull-outline";
        case "warning": return "alert-outline";
        case "info": return "information-variant";
        default: return "map-marker-question";
    }
};

const styles = StyleSheet.create({
    container: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
});