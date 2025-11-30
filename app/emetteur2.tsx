import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

// Récupération de la largeur de l'écran pour le responsive
const { width } = Dimensions.get("window");

// --- Interface pour les props du composant PulseCircle ---
interface PulseCircleProps {
  delay: number;
}

// --- Composant pour un cercle animé individuel ---
const PulseCircle: React.FC<PulseCircleProps> = ({ delay }) => {
  // On type explicitement la valeur animée
  const animValue = useRef<Animated.Value>(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animValue, {
        toValue: 1,
        duration: 2500,
        easing: Easing.out(Easing.ease),
        delay: delay,
        useNativeDriver: true,
      })
    );

    animation.start();

    // Cleanup (bonnes pratiques)
    return () => animation.stop();
  }, [animValue, delay]);

  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.3, 0],
  });

  return (
    <Animated.View
      style={[
        styles.pulseCircleBase,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

// --- Composant Principal ---
export default function ServerStartScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        {/* --- EN-TÊTE --- */}
        <View style={styles.header}>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarFill} />
          </View>
        </View>

        {/* --- ZONE D'ANIMATION CENTRALE --- */}
        <View style={styles.animationContainer}>
          <PulseCircle delay={0} />
          <PulseCircle delay={600} />
          <PulseCircle delay={1200} />

          {/* Point central fixe */}
          <View style={styles.centerDot} />
        </View>

        {/* --- BAS DE PAGE --- */}
        <View style={styles.bottomContainer}>
          <Text style={styles.statusText}>Demarrage serveur ...</Text>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            onPress={() => router.push("/emetteur1")}
          >
            <Text style={styles.actionButtonText}>J'ai activé mon hotspot</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  } as ViewStyle,
  content: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  } as ViewStyle,
  backButton: {
    padding: 10,
    marginRight: 15,
  } as ViewStyle,
  backIcon: {
    color: "white",
    fontSize: 24,
    fontWeight: "300", // Correspond à '300' | '400' etc.
  },
  progressBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: "#333333",
    borderRadius: 6,
    overflow: "hidden",
  } as ViewStyle,
  progressBarFill: {
    width: "35%",
    height: "100%",
    backgroundColor: "#A84420",
    borderRadius: 6,
  } as ViewStyle,
  animationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  pulseCircleBase: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: (width * 0.6) / 2,
    backgroundColor: "#ff4d4d",
  } as ViewStyle, // Note: Animated.View accepte ViewStyle
  centerDot: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ff0000",
    zIndex: 10,
  } as ViewStyle,
  bottomContainer: {
    alignItems: "center",
    marginBottom: 10,
  } as ViewStyle,
  statusText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 30,
  },
  actionButton: {
    width: "100%",
    backgroundColor: "#A84420",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
