import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { addListing, deleteListingById, getAllListings, getAllRessources, initDB, Listing, Resource } from '../database/db';

export default function ListingsScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [vendorName, setVendorName] = useState('');
  const [vendorID, setVendorID] = useState('');
  const [description, setDescription] = useState('');
  const [productsInReturn, setProductsInReturn] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Load username from AsyncStorage
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName) {
        setVendorName(storedName);
      }

      // Get device ID
      if (Device.isDevice) {
        // Try to get a unique device identifier
        // Note: On iOS, we can't get MAC address, but we can use other identifiers
        // On Android, we can try to get device ID
        let deviceId = '';
        
        if (Platform.OS === 'android') {
          // On Android, we can use Device.modelId or create a persistent ID
          // For simplicity, we'll use a combination of device info
          deviceId = Device.modelId || Device.modelName || 'unknown';
        } else {
          // On iOS, use model name or create a persistent ID
          deviceId = Device.modelName || Device.brand || 'unknown';
        }
        
        // Create a more unique ID by combining device info
        // In production, you might want to use expo-application to get a more stable ID
        const uniqueId = `${Device.brand || 'unknown'}-${Device.modelName || 'unknown'}-${Device.osVersion || 'unknown'}`.replace(/\s+/g, '-').toLowerCase();
        setVendorID(uniqueId);
      } else {
        // Running on simulator/emulator
        setVendorID('simulator-device');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await initDB();
      const allListings = await getAllListings();
      const allResources = await getAllRessources();
      setListings(allListings);
      setResources(allResources);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: number) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteListingById(listingId);
              await loadData(); // Reload listings
              Alert.alert('Success', 'Listing deleted successfully');
            } catch (error) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing');
            }
          },
        },
      ]
    );
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll permissions to select images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setImageBase64(base64);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Image picker not available. Please rebuild the app with: npx expo prebuild && npx expo run:android');
    }
  };

  const handleSubmit = async () => {
    if (!vendorName.trim() || !vendorID.trim() || !productsInReturn.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const newListing: Listing = {
        ressource: selectedResourceId || 0, // Use 0 as default if no resource selected
        vendorName: vendorName.trim(),
        vendorID: vendorID.trim(),
        productsInReturn: productsInReturn.trim(),
        description: description.trim() || undefined,
        image: imageBase64 || undefined,
      };

      await addListing(newListing);
      
      // Reset form (but keep vendor name and ID)
      const storedName = await AsyncStorage.getItem('userName');
      setVendorName(storedName || '');
      // Keep vendorID as it's device-specific
      setDescription('');
      setProductsInReturn('');
      setImageBase64(null);

      // Reload listings
      await loadData();
      
      // Close form
      setShowForm(false);
      
      Alert.alert('Success', 'Listing created successfully');
    } catch (error) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Listings Feed - Full Screen */}
        <View style={styles.feedContainer}>
          <Text style={styles.sectionTitle}>Listings</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4ade80" />
            </View>
          ) : listings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>No listings yet</Text>
              <Text style={styles.emptySubtext}>Tap the button below to create one</Text>
            </View>
          ) : (
            <ScrollView style={styles.feedScroll} showsVerticalScrollIndicator={true}>
              {listings.map((listing) => {
                return (
                  <View key={listing.id} style={styles.listingCard}>
                    {listing.image && (
                      <Image source={{ uri: listing.image }} style={styles.listingImage} />
                    )}
                    <View style={styles.listingContent}>
                      <View style={styles.listingHeader}>
                        <View style={styles.listingHeaderLeft}>
                          <Text style={styles.listingVendor}>{listing.vendorName}</Text>
                          <Text style={styles.listingID}>ID: {listing.vendorID}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => listing.id && handleDeleteListing(listing.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                      {listing.description && (
                        <Text style={styles.listingDescription}>{listing.description}</Text>
                      )}
                      <Text style={styles.listingReturn}>Wants: {listing.productsInReturn}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Add Button - Floating at Bottom */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color="#000" />
        </TouchableOpacity>

        {/* Form Modal Overlay */}
        <Modal
          visible={showForm}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowForm(false);
            setVendorName('');
            setVendorID('');
            setProductsInReturn('');
            setSelectedResourceId(null);
            setImageBase64(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Listing</Text>
                <TouchableOpacity 
                  onPress={async () => {
                    setShowForm(false);
                    // Reset form (but keep vendor name and ID)
                    const storedName = await AsyncStorage.getItem('userName');
                    setVendorName(storedName || '');
                    // Keep vendorID as it's device-specific
                    setDescription('');
                    setProductsInReturn('');
                    setImageBase64(null);
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.formScroll} 
                contentContainerStyle={styles.formScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <Text style={styles.label}>Vendor Name</Text>
                <TextInput
                  style={styles.input}
                  value={vendorName}
                  onChangeText={setVendorName}
                  placeholder="Enter vendor name"
                  placeholderTextColor="#666"
                />

                <Text style={styles.label}>Vendor ID</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={vendorID}
                  editable={false}
                  placeholder="Device ID (auto-filled)"
                  placeholderTextColor="#666"
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the item you're listing..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.label}>Products in Return</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={productsInReturn}
                  onChangeText={setProductsInReturn}
                  placeholder="What do you want in return?"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.label}>Image (Optional)</Text>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage} activeOpacity={0.7}>
                  {imageBase64 ? (
                    <View>
                      <Image source={{ uri: imageBase64 }} style={styles.imagePreview} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => setImageBase64(null)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#4ade80" />
                      <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
                      <Text style={styles.imagePlaceholderSubtext}>Optional</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Listing</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1724',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  feedContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1C1C1E',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: '#0a0a0a',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  resourceScroll: {
    marginVertical: 8,
  },
  resourceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  resourceChipSelected: {
    backgroundColor: '#4ade80',
    borderColor: '#4ade80',
  },
  resourceChipText: {
    color: '#fff',
    fontSize: 14,
  },
  resourceChipTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  imageButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4ade80',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#4ade80',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  imagePlaceholderSubtext: {
    color: '#666',
    marginTop: 4,
    fontSize: 11,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: '#4ade80',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  feedScroll: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#666',
    marginTop: 16,
    fontSize: 16,
  },
  listingCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  listingImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  listingContent: {
    padding: 16,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listingHeaderLeft: {
    flex: 1,
  },
  listingVendor: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  listingID: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginLeft: 8,
  },
  listingResource: {
    color: '#4ade80',
    fontSize: 14,
    marginBottom: 4,
  },
  listingDescription: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  listingReturn: {
    color: '#ccc',
    fontSize: 14,
  },
  emptySubtext: {
    color: '#999',
    marginTop: 8,
    fontSize: 14,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    height: '85%',
    maxHeight: 600,
    backgroundColor: '#0f1724',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
});

