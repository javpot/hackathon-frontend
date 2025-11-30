// import cors from 'cors';
// import express, { Request, Response } from 'express';

// const app = express();
// const PORT = 3000; // Ou le port que tu utilises dans ton .env frontend

// app.use(express.json());
// app.use(cors()); 

// // --- Types ---
// // Ce que le front envoie
// interface ChatRequest {
//   message: string;
// }

// // Ce que le back répond (Structure standardisée)S
// interface ChatResponse {
//   id: string;
//   text: string;
//   sender: 'bot';
//   timestamp: string;
// }

// // --- LOGIQUE MÉTIER (Le cerveau du bot) ---
// const generateBotResponse = (userMessage: string): string => {
//   const msg = userMessage.toLowerCase();

//   // Logique conditionnelle simple (à remplacer par une DB ou IA plus tard)
//   if (msg.includes('bonjour') || msg.includes('salut')) return "Bonjour ! Comment puis-je t'aider sur l'application ?";
//   if (msg.includes('token')) return "Ton token est bien géré par l'intercepteur Axios !";
//   if (msg.includes('bug')) return "Désolé d'entendre ça. Peux-tu décrire le problème ?";
//   if (msg.includes('au revoir')) return "À bientôt !";
  
//   return "Je ne suis pas sûr de comprendre. Peux-tu reformuler ?";
// };

// // --- ROUTES ---

// // Endpoint POST /chat
// // Note: Ton api.ts envoie le header Authorization, on pourrait le vérifier ici si nécessaire.
// app.post('/chat', (req: Request<{}, {}, ChatRequest>, res: Response) => {
//   const { message } = req.body;

//   console.log("Message reçu :", message);
//   // console.log("Token reçu :", req.headers.authorization); // Pour debug le token envoyé par ton api.ts

//   const botReply = generateBotResponse(message || "");

//   const response: ChatResponse = {
//     id: Date.now().toString(), // ID unique pour tes listes React (FlatList)
//     text: botReply,
//     sender: 'bot',
//     timestamp: new Date().toISOString()
//   };

//   res.json(response);
// });

// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Backend running on port ${PORT}`);
// });