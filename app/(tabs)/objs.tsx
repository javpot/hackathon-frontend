import React, { useState, useCallback } from "react"; 
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router"; 
import { getObjs, addObj, updateObj, deleteObj } from "../../services/api";
import { COLORS } from "../../constants/theme";

export default function ObjsScreen() {
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      const data = await getObjs();
      setList(data);
    } catch (e) { console.log(e); } 
    finally { setLoading(false); }
  }

  async function handleAdd() {
    if (!newItem.trim()) return;
    try {
      const obj = await addObj(newItem);
      setList([obj, ...list]);
      setNewItem("");
    } catch (e) { Alert.alert("Erreur", "Impossible d'ajouter"); }
  }


async function handleToggle(id: number, currentStatus: boolean) {
    const updated = list.map(item => item.id === id ? { ...item, is_completed: !currentStatus } : item);
    setList(updated); 
    updateObj(id, { is_completed: !currentStatus }).catch(() => {
        Alert.alert("Erreur réseau", "Annulation...");
        loadData(); 
    });
  }
  // Navigation vers le détail
  function goToDetail(item: any) {
    router.push({
      pathname: "/obj/[id]", 
      params: { 
        id: item.id, 
        title: item.title, 
        is_completed: item.is_completed 
      }
    });
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => goToDetail(item)} // <-- Le clic sur la carte
      activeOpacity={0.7}
    >
      <TouchableOpacity onPress={() => handleToggle(item.id, item.is_completed)} style={styles.row}>
        <Ionicons 
          name={item.is_completed ? "radio-button-on" : "radio-button-off"} 
          size={24} 
          color={item.is_completed ? COLORS.success : COLORS.textSecondary} 
        />
        <Text style={[styles.text, item.is_completed && styles.completedText]}>
          {item.title}
        </Text>
      </TouchableOpacity>
      
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes Objets</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nouvel objet..."
          placeholderTextColor={COLORS.textSecondary}
          value={newItem}
          onChangeText={setNewItem}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color={COLORS.primary} /> : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.emptyText}>Rien ici.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 60 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  inputContainer: { flexDirection: "row", marginBottom: 20 },
  input: { flex: 1, backgroundColor: COLORS.input, color: COLORS.text, padding: 15, borderRadius: 10, marginRight: 10, fontSize: 16 },
  addButton: { backgroundColor: COLORS.primary, width: 50, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: COLORS.card, padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", flex: 1 },
  text: { color: COLORS.text, fontSize: 16, marginLeft: 10 },
  completedText: { color: COLORS.textSecondary, textDecorationLine: "line-through" },
  emptyText: { color: COLORS.textSecondary, textAlign: "center", marginTop: 20 },
});