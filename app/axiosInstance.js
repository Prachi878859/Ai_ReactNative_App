// // app/axiosInstance.ts
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from "axios";

// const api = axios.create({
//   baseURL: "https://adminbackend.sparklerstech.com/api",
//   headers: {
//     "Content-Type": "application/json",
//   },
//   timeout: 30000,
// });

// // Request interceptor to add token
// api.interceptors.request.use(
//   async (config) => {
//     try {
//       const token = await AsyncStorage.getItem('userToken');
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//     } catch (error) {
//       console.error("Error getting token:", error);
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Response interceptor for handling token expiration
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     if (error.response?.status === 401) {
//       // Token expired or invalid
//       await AsyncStorage.removeItem('userToken');
//       await AsyncStorage.removeItem('userData');
//       // You can navigate to login screen here if needed
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;

// axiosInstance.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const axiosInstance = axios.create({
  // baseURL: 'https://adminbackend.sparklerstech.com/api',
  baseURL: 'http://192.168.1.9:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor - token add करा
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const userToken = await AsyncStorage.getItem('userToken');

      const token = adminToken || userToken;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Debug log
      console.log('📡 Request:', config.method?.toUpperCase(), config.url);
      console.log('🔑 Token:', token ? 'Yes' : 'No');

      return config;
    } catch (error) {
      console.log('Token fetch error:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor - error handle करा
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.log('❌ Response error:', error);
    if (error.response) {
      console.log('❌ Status:', error.response.status);
      console.log('❌ Data:', error.response.data);
    }
    return Promise.reject(error);
  }
);

const pythonApi = axios.create({
  baseURL: 'http://192.168.1.8:8000/api',
});

export const pythonGet = (endpoint, params = {}) =>
  pythonApi.get(endpoint, { params });

export const pythonPost = (endpoint, data) =>
  pythonApi.post(endpoint, data);

export const pythonPut = (endpoint, data) =>
  pythonApi.put(endpoint, data);

export const pythonDelete = (endpoint) =>
  pythonApi.delete(endpoint);

export default axiosInstance;
export { pythonApi };

