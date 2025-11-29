// services/host_server.ts (Adapté pour react-native-tcp-socket)

import NetSocket from 'react-native-tcp-socket';
// ... imports de Listing, NetworkMessage ...

const HOST_PORT = 8080; 
let connectedSockets: Map<string, NetSocket.Socket> = new Map();

export async function startPhoneHostServer(hostIp: string): Promise<void> {
    const server = NetSocket.createServer((socket) => {
        // Un client (téléphone) s'est connecté !
        const clientId = socket.address().address + ":" + socket.address().port;
        connectedSockets.set(clientId, socket);
        console.log(`Client connecté : ${clientId}.`);

        // Gérer les données reçues du client
        socket.on('data', (data) => {
            try {
                const message = JSON.parse(data.toString());
                handleHostMessage(clientId, message); // Logique de relais
            } catch (e) {
                console.error("Erreur de décodage du message socket:", e);
            }
        });

        // Gérer la déconnexion
        socket.on('close', () => {
            connectedSockets.delete(clientId);
            console.log(`Client déconnecté : ${clientId}.`);
        });

        socket.on('error', (error) => {
            console.error(`Erreur socket pour ${clientId}:`, error);
        });
        
        // Envoyer la liste initiale des listings
        broadcastListings();
    });

    server.listen(HOST_PORT, hostIp, () => {
        console.log(`Serveur démarré par le téléphone sur tcp://${hostIp}:${HOST_PORT}`);
    });

    server.on('error', (error) => {
        console.error("Erreur serveur :", error);
        throw new Error("Impossible de lier le port pour le serveur.");
    });
}