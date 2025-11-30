import {
    FontAwesome5,
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions, // Ajouté pour le chargement
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// --- IMPORT DU SERVICE CHATBOT ---
import { initDB } from "../database/db";
import { sendChatMessage } from "../services/chatService";

const { width } = Dimensions.get("window");

interface ResourceCardProps {
  title: string;
  subtitle: string;
  distance: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

// Type pour nos messages locaux
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

const Home: React.FC = () => {
  const router = useRouter();
  
  // --- 1. ÉTATS (STATE) ---
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Messages initiaux (Hardcodés pour l'ambiance, mais stockés dans le state)
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "⚠️ Weather alert: Acid rain approaching Sector 4.", sender: 'bot' },
    { id: '2', text: "Water source detected 2km North. Purify before consumption.", sender: 'bot' }
  ]);

  // Référence pour le scroll automatique vers le bas
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll en bas quand un message arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // --- 2. LOGIQUE D'ENVOI ---
  const handleSend = async () => {
    if (!inputText.trim()) return;

    // A. On ajoute le message de l'utilisateur
    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText(""); // On vide le champ
    setIsLoading(true); // On affiche le chargement

    try {
      // B. On appelle le vrai service (Gemini + DB)
      const response = await sendChatMessage(userMsg.text);

      // C. On ajoute la réponse du bot
      const botMsg: Message = {
        id: response.id,
        text: response.text,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      // En cas d'erreur
      const errorMsg: Message = { id: Date.now().toString(), text: "Erreur de connexion...", sender: 'bot' };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initDB();
        console.log("✅ Base de données initialisée et Tables créées !");
      } catch (e) {
        console.error("❌ Erreur création DB:", e);
      }
    };
    setupDatabase();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      {/* --- HEADER --- */}
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

      {/* --- CONTENT (FIXED LAYOUT) --- */}
      {/* On utilise KeyboardAvoidingView pour que le clavier ne cache pas le chat */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.mainContent}
      >
        {/* Titre */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Near you</Text>
          <Text style={styles.subTitle}>Resources detected in your sector</Text>
        </View>

        {/* --- HORIZONTAL CARDS --- */}
        <View style={styles.horizontalListContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            <ResourceCard
              title="St. Mary's"
              subtitle="Emergency"
              distance="4km"
              iconName="hospital-box"
              color="#ef4444"
            />
            <ResourceCard
              title="Sector 7 Food"
              subtitle="Rations"
              distance="4km"
              iconName="food-drumstick"
              color="#f59e0b"
            />
            <TouchableOpacity activeOpacity={0.8} style={styles.cardHorizontal}>
              <LinearGradient
                colors={["#1f2937", "#111827"]}
                style={styles.statsGradient}
              >
                <View style={styles.statsRow}>
                  <FontAwesome5 name="users" size={16} color="#4ade80" />
                  <Text style={styles.statsTitle}>Active</Text>
                </View>
                <Text style={styles.bigStatNumber}>67</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* --- CHATBOT SECTION --- */}
        <View style={styles.chatWrapper}>
          <View style={styles.chatContainer}>
            {/* Header Chat */}
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <View style={[styles.pulseDot, isLoading && styles.pulseActive]} />
                <Text style={styles.chatTitle}>
                    {isLoading ? "ANALYZING DATA..." : "SURVIVAL AI LINK"}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="robot-outline"
                size={20}
                color="#4ade80"
              />
            </View>

            {/* Messages Dynamiques */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatBody}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {messages.map((msg) => (
                <View 
                    key={msg.id} 
                    style={msg.sender === 'bot' ? styles.aiMessageRow : styles.userMessageRow}
                >
                  {/* Avatar seulement pour le bot */}
                  {msg.sender === 'bot' && (
                    <View style={styles.aiAvatar}>
                      <Text style={styles.aiAvatarText}>AI</Text>
                    </View>
                  )}

                  {/* Bulle de message */}
                  <View style={msg.sender === 'bot' ? styles.messageBubbleAi : styles.messageBubbleUser}>
                    <Text style={msg.sender === 'bot' ? styles.messageTextAi : styles.messageTextUser}>
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Indicateur de chargement dans le chat */}
              {isLoading && (
                  <View style={styles.aiMessageRow}>
                      <View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>...</Text></View>
                      <View style={[styles.messageBubbleAi, { width: 50, alignItems: 'center'}]}>
                          <ActivityIndicator size="small" color="#4ade80" />
                      </View>
                  </View>
              )}
            </ScrollView>

            {/* Input Zone */}
            <View style={styles.inputArea}>
              <TextInput
                style={styles.inputField}
                placeholder="Ask for guidance..."
                placeholderTextColor="#525252"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend} // Envoi avec la touche Entrée
              />
              <TouchableOpacity 
                style={[styles.sendButton, { opacity: inputText ? 1 : 0.5 }]} 
                onPress={handleSend}
                disabled={!inputText}
              >
                <Ionicons name="arrow-up" size={18} color="black" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* --- BARRE DE NAVIGATION --- */}
      <View style={styles.tabBar}>
        <TabItem icon="home" label="Home" isActive onPress={() => {}} />
        <TabItem icon="map" label="Map" onPress={() => router.push("/map")} />
        <TabItem icon="pricetags" label="Listing" onPress={() => router.push("/listings")} />
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
  <TouchableOpacity activeOpacity={0.8} style={styles.cardHorizontal}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={color} />
      </View>
      <View style={styles.distanceBadge}>
        <Text style={styles.distanceText}>{distance}</Text>
      </View>
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
  </TouchableOpacity>
);

const TabItem = ({
  icon,
  label,
  isActive,
  onPress,
}: {
  icon: any;
  label: string;
  isActive?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
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
    paddingVertical: 15,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 50,
    gap: 6,
  },
  statusText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleSection: {
    marginBottom: 15,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subTitle: {
    fontSize: 14,
    color: "#9ca3af",
  },

  // --- HORIZONTAL LIST ---
  horizontalListContainer: {
    height: 140,
  },
  horizontalScrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  cardHorizontal: {
    width: 140,
    height: "100%",
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#262626",
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    marginTop: 8,
  },
  cardTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#6b7280",
    fontSize: 12,
  },
  distanceBadge: {
    backgroundColor: "#262626",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  distanceText: {
    color: "#d1d5db",
    fontSize: 10,
    fontWeight: "bold",
  },
  statsGradient: {
    flex: 1,
    borderRadius: 16,
    margin: -12,
    padding: 12,
    justifyContent: "space-between",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statsTitle: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
  },
  bigStatNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4ade80",
  },

  // --- CHATBOT WRAPPER ---
  chatWrapper: {
    flex: 1,
    marginTop: 30,
    marginBottom: Platform.OS === "ios" ? 90 : 70,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    padding: 16,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
  },
  chatHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
  },
  pulseActive: {
      backgroundColor: "#f59e0b", // Orange quand ça charge
  },
  chatTitle: {
    color: "#4ade80",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  chatBody: {
    flex: 1,
  },
  
  // --- BOT MESSAGES ---
  aiMessageRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 12,
    paddingRight: 40, // Pour ne pas coller à droite
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#262626",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4ade80",
  },
  aiAvatarText: {
    color: "#4ade80",
    fontSize: 8,
    fontWeight: "bold",
  },
  messageBubbleAi: {
    backgroundColor: "#171717",
    padding: 10,
    borderRadius: 12,
    borderTopLeftRadius: 2,
  },
  messageTextAi: {
    color: "#d1d5db",
    fontSize: 13,
    lineHeight: 18,
  },

  // --- USER MESSAGES (NOUVEAU) ---
  userMessageRow: {
    flexDirection: "row",
    justifyContent: "flex-end", // Aligner à droite
    marginBottom: 12,
    paddingLeft: 40, // Pour ne pas coller à gauche
  },
  messageBubbleUser: {
    backgroundColor: "#4ade80", // Vert Survvie
    padding: 10,
    borderRadius: 12,
    borderTopRightRadius: 2,
  },
  messageTextUser: {
    color: "#050505", // Texte foncé sur fond vert
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  // --- INPUT ---
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#171717",
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
    paddingLeft: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#262626",
  },
  inputField: {
    flex: 1,
    color: "white",
    height: 40,
    fontSize: 13,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4ade80",
    justifyContent: "center",
    alignItems: "center",
  },

  // --- TAB BAR ---
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
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});

export default Home;