import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY;

export interface BotResponse {
  id: string;
  text: string;
  sender: 'bot';
  timestamp: string;
}

export const sendChatMessage = async (userMessage: string): Promise<BotResponse> => {
  // CORRECTION : On utilise un modèle PRÉSENT dans ta liste
  const MODEL_NAME = "gemini-2.0-flash"; 
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

  try {
    if (!API_KEY) {
      throw new Error("Clé API manquante. Vérifie ton fichier .env");
    }

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              { text: `Tu es un assistant mobile utile. Réponds de façon courte. Question: ${userMessage}` }
            ]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    // Extraction de la réponse
    const aiText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) throw new Error("Réponse vide de l'IA");

    return {
      id: Date.now().toString(),
      text: aiText,
      sender: 'bot',
      timestamp: new Date().toISOString(),
    };

  } catch (error: any) {
    // Affiche l'erreur exacte dans le terminal si ça plante encore
    console.error("--- ERREUR GEMINI ---");
    if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Message:", JSON.stringify(error.response.data, null, 2));
    } else {
        console.error("Erreur:", error.message);
    }
    
    return {
      id: Date.now().toString(),
      text: `Erreur (${error.response?.status || 'Connexion'}).`,
      sender: 'bot',
      timestamp: new Date().toISOString(),
    };
  }
};