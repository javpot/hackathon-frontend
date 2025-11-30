import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY;

export interface BotResponse {
  id: string;
  text: string;
  sender: 'bot';
  timestamp: string;
}

export const sendChatMessage = async (userMessage: string): Promise<BotResponse> => {
  const MODEL_NAME = "gemini-2.0-flash"; 
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

  try {
    if (!API_KEY) throw new Error("Clé API manquante.");

    // --- LE PROMPT DE SURVIE ---
    const systemInstruction = `
      CONTEXTE: Nous sommes en 2097. Le gouvernement a annoncé l'effondrement total (catastrophes naturelles, pandémies, invasions de zombies) dans moins de 24h.
      TON RÔLE: Tu es "SurvivorAI", l'assistant de survie ultime. Ta mission est de sauver la vie de l'utilisateur.
      RÈGLES DE RÉPONSE :
      1. Sois DIRECT, PRATIQUE et CONCIS (urgence vitale).
      2. Donne des conseils concrets (comment faire un abri, trouver de l'eau, se défendre contre un zombie, premiers secours).
      3. Sois un partenaire de survie efficace.
      4. Si l'utilisateur panique, rassure-le avec des actions logiques à entreprendre.
      

      QUESTION DE L'UTILISATEUR: ${userMessage}
    `;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              { text: systemInstruction }
            ]
          }
        ]
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const aiText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) throw new Error("Réponse vide de l'IA");

    return {
      id: Date.now().toString(),
      text: aiText,
      sender: 'bot',
      timestamp: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error("Erreur Gemini:", error.message);
    return {
      id: Date.now().toString(),
      text: "CONNEXION PERDUE. Je ne peux pas accéder aux données de survie. Restez vigilant.",
      sender: 'bot',
      timestamp: new Date().toISOString(),
    };
  }
};