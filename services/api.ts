import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Ajouter le token automatiquement
api.interceptors.request.use(async (config: any) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- FONCTIONS ---

export const register = async (name: string, email: string, password: string) => {
  try {
    const response = await api.post<any>('/register', {
      name, email, password, password_confirmation: password 
    });
    if (response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
    }
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : new Error('Erreur réseau');
  }
};

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post<any>('/login', { email, password });
    if (response.data.token) {
       await AsyncStorage.setItem('userToken', response.data.token);
    }
    return response.data;
  } catch (error: any) {
    throw error.response ? error.response.data : new Error('Erreur réseau');
  }
};

export const logout = async () => {
  try {
    await api.post('/logout');
  } catch (error) {
    console.log("Erreur serveur lors du logout (ignorée)");
  } finally {
    await AsyncStorage.removeItem('userToken');
  }
};

export const getUser = async () => {
  const response = await api.get<any>('/user');
  return response.data;
};

//CRUD 
export const getObjs = async () => {
  const response = await api.get<any>('/objs');
  return response.data;
};

export const addObj = async (title: string) => {
  const response = await api.post<any>('/objs', { title });
  return response.data;
};

export const updateObj = async (id: number, data: { title?: string, is_completed?: boolean }) => {
  const response = await api.put<any>(`/objs/${id}`, data);
  return response.data;
};

export const deleteObj = async (id: number) => {
  await api.delete(`/objs/${id}`);
};

export default api;