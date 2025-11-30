import {
    FontAwesome5,
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

// Définition des types pour les props
interface ResourceCardProps {
    title: string;
    subtitle: string;
    distance: string;
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
    color: string;
}

const Home: React.FC = () => {
    return (
        <SafeAreaView style={styles.container}>
            {/* Barre de statut noire pour fondre avec le design */}
            <StatusBar barStyle="light-content" backgroundColor="#050505" />

            {/* --- HEADER (Badge de Survie) --- */}
            <View style={styles.headerContainer}>
                <LinearGradient
                    colors={["#15803d", "#4ade80"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.statusBadge}
                >
                    <MaterialCommunityIcons name="heart-pulse" size={20} color="white" />
                    <Text style={styles.statusText}>SURVIVABILITY INDEX: HIGH</Text>
                </LinearGradient>
            </View>

            {/* --- SCROLLABLE CONTENT --- */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Titre de la section */}
                <View style={styles.titleSection}>
                    <Text style={styles.mainTitle}>Near you</Text>
                    <Text style={styles.subTitle}>Resources detected in your sector</Text>
                </View>

                {/* Liste des cartes */}
                <View style={styles.cardContainer}>
                    {/* Carte Hôpital */}
                    <ResourceCard
                        title="St. Mary's Hospital"
                        subtitle="Emergency Care & Meds"
                        distance="4km"
                        iconName="hospital-box"
                        color="#ef4444" // Rouge
                    />

                    {/* Carte Banque Alimentaire */}
                    <ResourceCard
                        title="Sector 7 Food Bank"
                        subtitle="Rations, Water & Supplies"
                        distance="4km"
                        iconName="food-drumstick"
                        color="#f59e0b" // Orange
                    />

                    {/* Carte Joueurs Actifs (Style Spécial) */}
                    <LinearGradient
                        colors={["#1f2937", "#111827"]}
                        style={styles.statsCard}
                    >
                        <View style={styles.statsContent}>
                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: "rgba(74, 222, 128, 0.15)" },
                                ]}
                            >
                                <FontAwesome5 name="users" size={20} color="#4ade80" />
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Active Players</Text>
                                <Text style={styles.cardSubtitle}>In a 10km radius</Text>
                            </View>
                        </View>
                        <Text style={styles.bigStatNumber}>67</Text>
                    </LinearGradient>
                </View>
            </ScrollView>

            {/* --- BOTTOM NAVIGATION BAR --- */}
            <View style={styles.tabBar}>
                <TabItem icon="home" label="Home" isActive />
                <TabItem icon="map" label="Map" />
                <TabItem icon="pricetags" label="Listing" />
            </View>
        </SafeAreaView>
    );
};

// --- SOUS-COMPOSANTS ---

const ResourceCard: React.FC<ResourceCardProps> = ({
    title,
    subtitle,
    distance,
    iconName,
    color,
}) => (
    <TouchableOpacity activeOpacity={0.8} style={styles.card}>
        <View style={styles.cardRow}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                <MaterialCommunityIcons name={iconName} size={24} color={color} />
            </View>
            <View style={styles.textGroup}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
        </View>
        <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{distance}</Text>
        </View>
    </TouchableOpacity>
);

const TabItem = ({
    icon,
    label,
    isActive,
}: {
    icon: any;
    label: string;
    isActive?: boolean;
}) => (
    <TouchableOpacity style={styles.tabItem}>
        <Ionicons
            name={isActive ? icon : `${icon}-outline`}
            size={24}
            color={isActive ? "#4ade80" : "#6b7280"}
        />
        <Text
            style={[styles.tabLabel, { color: isActive ? "#4ade80" : "#6b7280" }]}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

// --- STYLES ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#050505",
    },
    headerContainer: {
        alignItems: "center",
        paddingVertical: 20,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 50,
        gap: 8,
        shadowColor: "#4ade80",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    statusText: {
        color: "#ffffff",
        fontWeight: "800",
        fontSize: 13,
        letterSpacing: 1.2,
        textTransform: "uppercase",
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 130, // Espace extra en bas pour ne pas cacher la dernière carte sous la barre
    },
    titleSection: {
        marginBottom: 24,
        marginTop: 10,
    },
    mainTitle: {
        fontSize: 34,
        fontWeight: "bold",
        color: "#ffffff",
    },
    subTitle: {
        fontSize: 15,
        color: "#9ca3af",
        marginTop: 4,
    },
    cardContainer: {
        gap: 16,
    },
    // Style Carte Ressource
    card: {
        backgroundColor: "#171717",
        borderRadius: 20,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#262626",
    },
    cardRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    textGroup: {
        justifyContent: "center",
    },
    cardTitle: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
    cardSubtitle: {
        color: "#6b7280",
        fontSize: 13,
        marginTop: 2,
    },
    distanceBadge: {
        backgroundColor: "#262626",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    distanceText: {
        color: "#d1d5db",
        fontSize: 12,
        fontWeight: "600",
    },
    // Style Carte Stats
    statsCard: {
        borderRadius: 20,
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "rgba(74, 222, 128, 0.3)",
    },
    statsContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    bigStatNumber: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#4ade80",
        textShadowColor: "rgba(74, 222, 128, 0.5)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },

    // --- BOTTOM BAR (CORRIGÉ) ---
    tabBar: {
        position: "absolute",
        bottom: 0,
        width: width,
        backgroundColor: "rgba(23, 23, 23, 0.95)", // Semi-transparent
        flexDirection: "row",
        justifyContent: "space-around",

        // Correction ici : On ajoute du padding en haut et en bas
        paddingTop: 15,
        // Sur iOS (iPhone X et +), on met 35px pour éviter la barre noire du bas. Sur Android, 20px suffit.
        paddingBottom: Platform.OS === "ios" ? 35 : 20,

        borderTopWidth: 1,
        borderTopColor: "#262626",
    },
    tabItem: {
        alignItems: "center",
        gap: 4,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: "500",
    },
});

export default Home;
