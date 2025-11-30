import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    PermissionsAndroid,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
// Importations spécifiques pour le Bluetooth et les icônes
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BleManager } from "react-native-ble-plx";

// --- CONFIGURATION BLE ---
// Le Manager doit être une instance unique
const manager = new BleManager();
// Un UUID unique pour TON app.
// Gardons le service de fréquence cardiaque (le plus commun) pour l'exemple
const SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb";
const THEME_COLOR = "#A84420"; // Couleur du thème (Orange Brique)

// Interface pour nos 'Survivants' affichables
interface Survivor {
    id: string;
    name: string;
    rssi: number | null; // Indicateur de force du signal (proximité)
    lastDetected: number; // Timestamp
}

export default function Test() {
    // Liste des appareils détectés, stockés comme des objets Survivor
    const [survivors, setSurvivors] = useState<Survivor[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [bleState, setBleState] = useState("Unknown");

    // --- LOGIQUE DE GESTION DES PERMISSIONS ET DU BLUETOOTH ---

    const requestPermissions = useCallback(async () => {
        if (Platform.OS === "android") {
            try {
                // Nécessaire pour le scan BLE sur Android 6.0+
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                ]);

                if (
                    granted["android.permission.ACCESS_FINE_LOCATION"] ===
                        PermissionsAndroid.RESULTS.GRANTED &&
                    granted["android.permission.BLUETOOTH_SCAN"] ===
                        PermissionsAndroid.RESULTS.GRANTED &&
                    granted["android.permission.BLUETOOTH_CONNECT"] ===
                        PermissionsAndroid.RESULTS.GRANTED
                ) {
                    console.log("Permissions Bluetooth et Localisation accordées");
                    return true;
                } else {
                    console.log("Permissions non accordées");
                    return false;
                }
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true; // iOS n'a généralement pas besoin de cette vérification explicite
    }, []);

    const scanForSurvivors = useCallback(async () => {
        const hasPermissions = await requestPermissions();
        if (!hasPermissions) {
            return;
        }

        manager.stopDeviceScan(); // Arrêter tout scan précédent
        setIsScanning(true);
        setSurvivors([]); // Réinitialiser la liste au début d'un scan

        // Scan des appareils. Les services passés en premier paramètre (ici null) filtrent les résultats.
        // Si vous voulez ne voir que VOTRE app, utilisez [SERVICE_UUID]
        manager.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
            if (error) {
                console.log("Erreur de Scan BLE:", error);
                setIsScanning(false);
                return;
            }

            // Filtrer et traiter le device
            const deviceName = device?.name || `Inconnu (${device.id.substring(0, 8)})`;
            
            // On veut le nom (ou une partie de l'ID) ET un signal RSSI
            if (deviceName && device.rssi !== null) {
                setSurvivors(prev => {
                    const existingIndex = prev.findIndex(s => s.id === device.id);
                    const newSurvivor: Survivor = {
                        id: device.id,
                        name: deviceName,
                        rssi: device.rssi,
                        lastDetected: Date.now(),
                    };

                    if (existingIndex > -1) {
                        // Mettre à jour (RSSI est important pour la proximité)
                        const updated = [...prev];
                        updated[existingIndex] = newSurvivor;
                        // Trier par RSSI (plus proche = moins négatif, donc plus grand)
                        return updated.sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100));
                    } else {
                        // Ajouter un nouveau survivant
                        return [...prev, newSurvivor].sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100));
                    }
                });
            }
        });

        // Optionnel: Arrêter le scan après 10 secondes
        setTimeout(() => {
            manager.stopDeviceScan();
            setIsScanning(false);
            console.log("Scan arrêté.");
        }, 10000);
    }, [requestPermissions]);


    useEffect(() => {
        // Gérer le changement d'état du Bluetooth (activé/désactivé)
        const subscription = manager.onStateChange((state) => {
            setBleState(state);
            if (state === "PoweredOn") {
                scanForSurvivors();
            } else {
                manager.stopDeviceScan();
                setIsScanning(false);
                setSurvivors([]);
                console.log(`Le Bluetooth est dans l'état: ${state}`);
            }
        }, true);

        // Nettoyage au démontage du composant
        return () => {
            subscription.remove();
            manager.destroy(); // Important pour libérer les ressources BLE
        };
    }, [scanForSurvivors]);

    // --- COMPOSANT POUR UN ARTICLE (SURVIVANT) ---

    // Calcule la "force" du signal RSSI pour un affichage visuel
    const getRssiLevel = (rssi: number | null): { level: string, color: string } => {
        if (rssi === null) return { level: "Inconnu", color: "#888888" };
        if (rssi > -60) return { level: "Proche", color: "#4CAF50" }; // Vert
        if (rssi > -75) return { level: "Modéré", color: "#FFC107" }; // Jaune
        return { level: "Distant", color: "#F44336" }; // Rouge
    };

    const renderItem = ({ item }: { item: Survivor }) => {
        const { level, color } = getRssiLevel(item.rssi);

        // Convertit le RSSI en une valeur positive simple pour l'affichage
        const simpleRssi = item.rssi ? Math.min(100, Math.max(0, 100 + item.rssi)) : 0;
        
        return (
            <TouchableOpacity activeOpacity={0.7} style={styles.itemContainer}>
                {/* 1. Icône (Image Remplacée) */}
                <View style={[styles.imageWrapper, { backgroundColor: color }]}>
                    <MaterialCommunityIcons name="target" size={40} color="white" />
                </View>

                {/* 2. DÉTAILS DU SURVIVANT */}
                <View style={styles.detailsContainer}>
                    {/* Titre (Nom de l'appareil) */}
                    <Text style={styles.itemTitle} numberOfLines={2}>
                        {item.name}
                    </Text>

                    {/* Niveau de Proximité */}
                    <Text style={styles.itemCondition}>
                        Proximité: <Text style={{ color }}>{level}</Text>
                    </Text>

                    {/* RSSI (Force du Signal) */}
                    <Text style={styles.itemPrice}>RSSI: {item.rssi || "N/A"}</Text>

                    {/* Proximité Visuelle (Barre) */}
                    <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { 
                            width: `${simpleRssi}%`, 
                            backgroundColor: color 
                        }]} />
                    </View>

                    {/* Dernier contact */}
                    <Text style={styles.itemMeta}>
                        Dernier contact: {new Date(item.lastDetected).toLocaleTimeString()}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Message d'état
    const ListEmptyComponent = () => (
        <View style={styles.emptyContainer}>
            {bleState !== "PoweredOn" ? (
                <Text style={styles.emptyText}>
                    Veuillez activer votre Bluetooth (État: {bleState}).
                </Text>
            ) : isScanning ? (
                <Text style={styles.emptyText}>
                    Recherche en cours de survivants...
                </Text>
            ) : (
                <Text style={styles.emptyText}>
                    Aucun survivant détecté dans le périmètre.
                </Text>
            )}
            <TouchableOpacity 
                style={styles.scanButton} 
                onPress={scanForSurvivors}
                disabled={isScanning || bleState !== "PoweredOn"}
            >
                <Text style={styles.scanButtonText}>
                    {isScanning ? "Scanning..." : "Lancer le Scan"}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* --- HEADER --- */}
            <View style={styles.header}>
                <MaterialCommunityIcons name="broadcast" size={28} color="white" />
                <Text style={styles.headerTitle}>RADAR DE SURVIE</Text>
                {isScanning ? (
                    <ActivityIndicator size="small" color={THEME_COLOR} />
                ) : (
                    <MaterialCommunityIcons name="bluetooth-connect" size={28} color={bleState === "PoweredOn" ? "#4CAF50" : "#F44336"} />
                )}
            </View>

            {/* --- LISTE DES SURVIVANTS --- */}
            <FlatList
                data={survivors}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={ListEmptyComponent}
            />
        </SafeAreaView>
    );
}

// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000000", // Fond noir
    } as ViewStyle,

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#333",
    } as ViewStyle,
    headerTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "700",
    } as TextStyle,

    // Liste
    listContent: {
        paddingVertical: 10,
        flexGrow: 1, // Pour centrer le ListEmptyComponent
    } as ViewStyle,
    separator: {
        height: 16,
    } as ViewStyle,

    // Styles d'un Item (Survivant)
    itemContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
    } as ViewStyle,

    // Partie Icône (Gauche)
    imageWrapper: {
        width: 60, // Plus petit qu'une carte
        height: 60,
        borderRadius: 8,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    
    // Partie Texte (Droite)
    detailsContainer: {
        flex: 1,
        justifyContent: "flex-start",
    } as ViewStyle,
    itemTitle: {
        color: "#FFFFFF",
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 2,
        fontWeight: "bold", // Le nom de l'appareil est important
    } as TextStyle,
    itemCondition: {
        color: "#AAAAAA",
        fontSize: 13,
        marginBottom: 4,
    } as TextStyle,
    itemPrice: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 4,
    } as TextStyle,
    itemMeta: {
        color: "#888888",
        fontSize: 12,
        marginTop: 4,
    } as TextStyle,
    
    // Barre de progression
    progressBarBackground: {
        height: 6,
        backgroundColor: "#222",
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 2,
    } as ViewStyle,
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    } as ViewStyle,

    // Liste Vide
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    } as ViewStyle,
    emptyText: {
        color: "#888888",
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    } as TextStyle,
    scanButton: {
        backgroundColor: THEME_COLOR,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    } as ViewStyle,
    scanButtonText: {
        color: "white",
        fontWeight: "bold",
    } as TextStyle,
});