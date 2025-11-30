// services/test_listings.ts

import { 
  addLocalListing, 
  getLocalListings, 
  updateLocalListing, 
  deleteLocalListing,
  Listing
} from './listings'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native'; // Utilisé pour afficher les résultats dans l'application

const TEST_USER_ID = "test_user_42";

// Fonction utilitaire pour vider AsyncStorage avant de commencer
async function clearAllListings() {
    try {
        // Supprime tous les éléments liés à notre clé de stockage.
        await AsyncStorage.removeItem('@troc_app:listings');
        console.log("--- Nettoyage d'AsyncStorage terminé. ---");
    } catch (e) {
        console.error("Erreur de nettoyage:", e);
    }
}

async function runTest() {
    await clearAllListings();

    let listings: Listing[];
    let listingIdToUpdate: string = "";
    
    // --- TEST 1 : CREATE (Ajouter) ---
    console.log("TEST 1: Création de listings...");
    const listing1 = await addLocalListing(
        TEST_USER_ID,
        "Perceuse Sans Fil",
        "Modèle récent, utilisée 3 fois.",
        "Recherche un casque audio de bonne qualité"
    );
    listingIdToUpdate = listing1.id;
    
    await addLocalListing(
        TEST_USER_ID,
        "Livre de Cuisine Végétale",
        "État neuf, 300 pages.",
        "Recherche une plante d'intérieur"
    );

    // --- TEST 2 : READ (Lecture) ---
    console.log("TEST 2: Lecture des listings...");
    listings = await getLocalListings();
    console.log(`Nombre de listings trouvés : ${listings.length}`);
    if (listings.length > 0) {
        console.log("Premier listing:", listings[0].title);
    }
    
    // --- TEST 3 : UPDATE (Modifier) ---
    console.log("TEST 3: Mise à jour du listing (ID: " + listingIdToUpdate + ")...");
    const listingToUpdate = listings.find(l => l.id === listingIdToUpdate);
    if (listingToUpdate) {
        const updatedListing: Listing = {
            ...listingToUpdate,
            title: listingToUpdate.title + " (MODIFIÉ)",
            itemForTrade: "Recherche MAINTENANT un moniteur PC",
        };
        await updateLocalListing(updatedListing);

        // Vérification
        const updatedListings = await getLocalListings();
        const checkUpdate = updatedListings.find(l => l.id === listingIdToUpdate);
        console.log("Nouveau titre:", checkUpdate?.title);
    } else {
        console.log("ERREUR: Listing non trouvé pour la mise à jour.");
    }
    
    // --- TEST 4 : DELETE (Supprimer) ---
    console.log("TEST 4: Suppression du listing (ID: " + listingIdToUpdate + ")...");
    await deleteLocalListing(listingIdToUpdate);

    // Vérification finale
    const finalListings = await getLocalListings();
    console.log(`Nombre final de listings après suppression : ${finalListings.length}`);
    
    // Message de succès/échec
    if (finalListings.length === 1) { // Il devrait en rester un (Livre)
        Alert.alert("Tests Réussis !", "La logique CRUD d'AsyncStorage fonctionne correctement.");
    } else {
        Alert.alert("Tests Échoués", "Vérifiez la console pour les erreurs.");
    }
}

// Exportez la fonction pour pouvoir l'appeler facilement
export default runTest;