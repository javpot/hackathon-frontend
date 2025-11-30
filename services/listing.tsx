// services/listings.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid'; // Importation de la fonction de génération d'UUID

// Clé de stockage pour tous les listings
const LISTINGS_STORAGE_KEY = '@troc_app:listings';

// Structure d'un listing de troc
export interface Listing {
  id: string; 
  userId: string;
  title: string;
  description: string;
  itemForTrade: string;
  createdAt: number; // Timestamp pour le tri
}

// --- Opération de Lecture (READ) ---
export async function getLocalListings(): Promise<Listing[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(LISTINGS_STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Erreur à la lecture des listings (AsyncStorage):", e);
    return [];
  }
}

// --- Opération de Création (CREATE) ---
/**
 * Ajoute un nouveau listing de troc dans AsyncStorage.
 */
export async function addLocalListing(
  userId: string, // ID de l'utilisateur connecté
  title: string,
  description: string,
  itemForTrade: string
): Promise<Listing> {
  const newListing: Listing = {
    id: uuidv4(), // Génération de l'UUID
    userId,
    title,
    description,
    itemForTrade,
    createdAt: Date.now(),
  };

  const listings = await getLocalListings();
  listings.push(newListing);

  try {
    const jsonValue = JSON.stringify(listings);
    await AsyncStorage.setItem(LISTINGS_STORAGE_KEY, jsonValue);
    return newListing;
  } catch (e) {
    console.error("Erreur à l'enregistrement du listing:", e);
    throw new Error("Échec de l'enregistrement du listing.");
  }
}

// --- Opération de Mise à jour (UPDATE / Modifier) ---
/**
 * Met à jour un listing existant en le remplaçant par un objet Listing modifié.
 * @param updatedListing L'objet Listing complet avec les nouvelles valeurs.
 */
export async function updateLocalListing(updatedListing: Listing): Promise<void> {
  const listings = await getLocalListings();
  
  const index = listings.findIndex(l => l.id === updatedListing.id);

  if (index !== -1) {
    listings[index] = updatedListing;
    
    try {
      await AsyncStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings));
    } catch (e) {
      console.error("Erreur à la mise à jour du listing:", e);
      throw new Error("Échec de la mise à jour du listing.");
    }
  } else {
    throw new Error("Listing non trouvé pour la mise à jour.");
  }
}

// --- Opération de Suppression (DELETE / Supprimer) ---
/**
 * Supprime un listing par son ID unique.
 * @param listingId L'ID unique (UUID) du listing à supprimer.
 */
export async function deleteLocalListing(listingId: string): Promise<void> {
  const listings = await getLocalListings();
  
  const filteredListings = listings.filter(l => l.id !== listingId);

  if (filteredListings.length === listings.length) {
    throw new Error("Listing non trouvé pour la suppression.");
  }

  try {
    await AsyncStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(filteredListings));
  } catch (e) {
    console.error("Erreur à la suppression du listing:", e);
    throw new Error("Échec de la suppression du listing.");
  }
}