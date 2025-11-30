import { createContext, useContext, useMemo, useState } from "react";

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

    const addAlert = (payload: Omit<MapAlert, "id" | "createdAt">) => {
        const id = Date.now().toString();
        const alert: MapAlert = { id, createdAt: Date.now(), ...payload };
        setAlerts((s) => [alert, ...s]);
    };

    const removeAlert = (id: string) => setAlerts((s) => s.filter((a) => a.id !== id));
    const clearAlerts = () => setAlerts([]);

    const value = useMemo(() => ({ alerts, addAlert, removeAlert, clearAlerts }), [alerts]);

    return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
};

export default AlertContext;
