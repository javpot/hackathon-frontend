import * as Location from 'expo-location'; // <--- Import this
import { Accelerometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { Alert, Platform, Vibration } from 'react-native';
import { useAlerts } from '../contexts/AlertContext';

// Threshold: Higher = Harder to trigger
const THRESHOLD = 3.0;

export default function ShakeManager() {
    const [data, setData] = useState({ x: 0, y: 0, z: 0 });
    const [lastShake, setLastShake] = useState(0);
    const { addAlert } = useAlerts();

    useEffect(() => {
        if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

        Accelerometer.setUpdateInterval(100);
        const subscription = Accelerometer.addListener(setData);

        return () => {
            subscription.remove();
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
            type: 'sos',
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