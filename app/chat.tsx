import { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { sendChatMessage } from '../services/chatService'; // Le fichier créé à l'étape 2

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;

    try {
      // Appel propre au backend via ton service
      const botReply = await sendChatMessage(input);
      
      // botReply contient { text: "...", sender: "bot", ... }
      setResponse(botReply.text); 
      setInput('');
    } catch (e) {
      setResponse("Erreur de connexion...");
    }
  };

  return (
    <View style={{ padding: 50 }}>
      <TextInput 
        value={input} 
        onChangeText={setInput} 
        placeholder="Écris un message..." 
        style={{ borderBottomWidth: 1, marginBottom: 20, padding: 10 }}
      />
      <Button title="Envoyer" onPress={handleSend} />
      
      {response ? <Text style={{ marginTop: 20, fontSize: 18 }}>🤖 : {response}</Text> : null}
    </View>
  );
}