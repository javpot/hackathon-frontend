import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addWaypoint, clearAllWaypoints, deleteWaypointById, getAllWaypoints, initDB } from "../database/db";

export type AlertType = "hospital" | "food" | "water" | "shelter" | "danger" | "warning" | "info" | "other";

export type MapAlert = {
    id: string;
    coords?: { latitude: number; longitude: number };
    type: AlertType;
    createdAt: number;
    message?: string;
};

type AlertContextValue = {
    alerts: MapAlert[];
    addAlert: (payload: Omit<MapAlert, "id" | "createdAt">) => void;
    removeAlert: (id: string) => void;
    clearAlerts: () => void;
};

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export const useAlerts = () => {
    const ctx = useContext(AlertContext);
    if (!ctx) throw new Error("useAlerts must be used within an AlertProvider");
    return ctx;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [alerts, setAlerts] = useState<MapAlert[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load waypoints from database on mount
    useEffect(() => {
        const loadWaypoints = async () => {
            try {
                // Initialize database if needed
                const deviceVendorID = await AsyncStorage.getItem('deviceVendorID');
                if (deviceVendorID) {
                    await initDB(deviceVendorID);
                } else {
                    await initDB();
                }

                // Load waypoints from database
                const savedWaypoints = await getAllWaypoints();
                const mapAlerts: MapAlert[] = savedWaypoints.map(wp => ({
                    id: wp.id,
                    coords: wp.latitude && wp.longitude ? { latitude: wp.latitude, longitude: wp.longitude } : undefined,
                    type: wp.type as AlertType,
                    createdAt: wp.createdAt,
                    message: wp.message,
                }));
                setAlerts(mapAlerts);
                console.log(`[Waypoints] Loaded ${mapAlerts.length} waypoints from database`);
            } catch (error) {
                console.error('[Waypoints] Error loading waypoints:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadWaypoints();
    }, []);

    const addAlert = async (payload: Omit<MapAlert, "id" | "createdAt">) => {
        const id = Date.now().toString();
        const alert: MapAlert = { id, createdAt: Date.now(), ...payload };
        setAlerts((s) => [alert, ...s]);
        
        // Persist to database
        try {
            await addWaypoint({
                id: alert.id,
                latitude: alert.coords?.latitude,
                longitude: alert.coords?.longitude,
                type: alert.type,
                createdAt: alert.createdAt,
                message: alert.message,
            });
            console.log(`[Waypoints] Saved waypoint ${id} to database`);
        } catch (error) {
            console.error('[Waypoints] Error saving waypoint:', error);
        }
    };

    const removeAlert = async (id: string) => {
        setAlerts((s) => s.filter((a) => a.id !== id));
        
        // Remove from database
        try {
            await deleteWaypointById(id);
            console.log(`[Waypoints] Deleted waypoint ${id} from database`);
        } catch (error) {
            console.error('[Waypoints] Error deleting waypoint:', error);
        }
    };

    const clearAlerts = async () => {
        setAlerts([]);
        
        // Clear database
        try {
            await clearAllWaypoints();
            console.log('[Waypoints] Cleared all waypoints from database');
        } catch (error) {
            console.error('[Waypoints] Error clearing waypoints:', error);
        }
    };

    const value = useMemo(() => ({ alerts, addAlert, removeAlert, clearAlerts }), [alerts]);

    return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
};

export default AlertContext;
