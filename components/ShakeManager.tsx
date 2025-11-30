import * as Location from 'expo-location'; // <--- Import this
import { Accelerometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { NativeModules, Platform, Vibration } from 'react-native';
import { useAlerts } from '../contexts/AlertContext';

// Threshold: Higher = Harder to trigger
const THRESHOLD = 3.0;

export default function ShakeManager() {
    const [data, setData] = useState({ x: 0, y: 0, z: 0 });
    const [lastShake, setLastShake] = useState(0);
    const { addAlert } = useAlerts();

    useEffect(() => {
        if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

        let subscription: any = null;

        // Delay initialization to ensure React Native bridge is ready
        // This fixes RCTEventEmitter errors in Release builds with new architecture
        const initTimer = setTimeout(() => {
            try {
                // Check if native pedometer/sensors module is registered to avoid crash
                const ped = NativeModules.ExponentPedometer || NativeModules.Pedometer || NativeModules.ExpoPedometer;
                if (!ped) {
                    console.warn('Pedometer module not registered, skipping accelerometer');
                    return;
                }
                Accelerometer.setUpdateInterval(100);
                subscription = Accelerometer.addListener(setData);
            } catch (error) {
                console.log('Accelerometer not available:', error);
            }
        }, 500); // Wait 500ms for bridge to initialize

        return () => {
            clearTimeout(initTimer);
            if (subscription) {
                try {
                    subscription.remove();
                } catch (error) {
                    console.log('Error removing accelerometer listener:', error);
                }
            }
        };
    }, []);

    // Define a helper to get location safely
    const getLocationAndSendAlert = async () => {
        let coords = { latitude: 0, longitude: 0 };

        try {
            // 1. Check if we have permission (fast check)
            const { status } = await Location.getForegroundPermissionsAsync();

            if (status === 'granted') {
                // 2. Get real location
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced
                });
                coords = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                };
            }
        } catch (error) {
            console.log("Could not get location:", error);
        }

        // 3. Send Alert with REAL coords
        addAlert({
            type: 'warning',
            message: 'SOS Signal (Shake Detected)',
            coords: coords
        });
    };

    useEffect(() => {
        const { x, y, z } = data;
        const totalForce = Math.sqrt(x * x + y * y + z * z);

        if (totalForce > THRESHOLD) {
            const now = Date.now();
            if (now - lastShake > 3000) {
                setLastShake(now);

                console.log("SHAKE DETECTED! Sending SOS alert.");
                Vibration.vibrate(500);
                // Alert.alert("SOS SENT", "Broadcasting your location...");

                // Call the function to get location and send
                getLocationAndSendAlert();
            }
        }
    }, [data, lastShake]);

    return null;
}