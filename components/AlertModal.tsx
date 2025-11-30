import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AlertType } from "../contexts/AlertContext";

const CATEGORY_LABELS: Record<AlertType, string> = {
    hospital: "Hospital",
    food: "Food",
    water: "Water",
    shelter: "Shelter",
    danger: "Danger",
    warning: "Warning",
    info: "Info",
    other: "Other",
};

export default function AlertModal({ visible, onRequestClose, onSelect }: {
    visible: boolean;
    onRequestClose: () => void;
    onSelect: (type: AlertType) => void;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <Text style={styles.title}>Create alert</Text>
                    <Text style={styles.subtitle}>Choose what you want to report</Text>
                    <View style={styles.options}>
                        {(Object.keys(CATEGORY_LABELS) as AlertType[]).map((t) => (
                            <TouchableOpacity key={t} style={styles.option} onPress={() => onSelect(t)}>
                                <Text style={styles.optionText}>{CATEGORY_LABELS[t]}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={styles.cancel} onPress={onRequestClose}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    dialog: {
        width: "90%",
        backgroundColor: "#111",
        borderRadius: 12,
        padding: 20,
    },
    title: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6 },
    subtitle: { color: "#888", marginBottom: 14 },
    options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    option: { backgroundColor: "#222", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, margin: 4 },
    optionText: { color: "#fff", fontWeight: "600" },
    cancel: { marginTop: 10, alignSelf: "center" },
    cancelText: { color: "#ccc" },
});
