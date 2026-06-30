// import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as Linking from 'expo-linking';
// import { Stack, router } from "expo-router";
// import * as WebBrowser from 'expo-web-browser';
// import React, { useEffect, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   Image,
//   KeyboardAvoidingView,
//   Platform,
//   SafeAreaView,
//   ScrollView,
//   StatusBar,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import Svg, { G, Path } from 'react-native-svg';
// import api from './axiosInstance';

// // Important: Complete WebBrowser session after auth
// WebBrowser.maybeCompleteAuthSession();

// export default function LoginScreen() {
//   const [loading, setLoading] = useState(false);
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);

//   // Handle deep link callback
//   useEffect(() => {
//     const handleDeepLink = async (event: { url: string }) => {
//       console.log("DEEP LINK RECEIVED:", event.url);
      
//       if (event.url.includes('success=true')) {
//         // For Google login, we need to extract user data from the callback URL
//         // You might need to parse the URL to get user info
//         router.replace('/dashboard');
//       } else if (event.url.includes('error=true')) {
//         Alert.alert('Login Failed', 'Please try again');
//         setLoading(false);
//       }
//     };

//     // Check initial URL (if app was opened from callback)
//     const checkInitialUrl = async () => {
//       const initialUrl = await Linking.getInitialURL();
//       if (initialUrl) {
//         console.log("INITIAL URL:", initialUrl);
//         if (initialUrl.includes('success=true')) {
//           router.replace('/dashboard');
//         }
//       }
//     };

//     checkInitialUrl();

//     // Add listener for deep links
//     const subscription = Linking.addEventListener('url', handleDeepLink);

//     return () => {
//       subscription.remove();
//     };
//   }, []);

  

//   const handleEmailLogin = async () => {
//     if (!email || !password) {
//       Alert.alert('Error', 'Please enter both email and password');
//       return;
//     }

//     setLoading(true);
//     try {
//       // Using the correct endpoint: /user/login
//       const response = await api.post('/user/login', {
//         email: email,
//         password: password,
//       });

//       console.log("Login response:", response.data);

//       if (response.data.success || response.data.token) {
//         // Store token in AsyncStorage
//         if (response.data.token) {
//           await AsyncStorage.setItem('userToken', response.data.token);
//         }
        
//         // Store user data if available from response
//         // Store user data if available from response
// let userData = null;

// if (response.data.user) {
//   userData = response.data.user;

//   await AsyncStorage.setItem(
//     'userData',
//     JSON.stringify(response.data.user)
//   );

// } else if (
//   response.data.data &&
//   response.data.data.user
// ) {
//   userData = response.data.data.user;

//   await AsyncStorage.setItem(
//     'userData',
//     JSON.stringify(response.data.data.user)
//   );

// } else {
//   userData = {
//     id:
//       response.data.userId ||
//       response.data.id ||
//       'temp_id',

//     name: email.split('@')[0],
//     email: email,
//     phone: '',
//   };

//   await AsyncStorage.setItem(
//     'userData',
//     JSON.stringify(userData)
//   );
// }

// // ADD THIS
// if (userData?.id) {
//   await AsyncStorage.setItem(
//     'userId',
//     userData.id.toString()
//   );
// }

        
//         // Navigate to UserDashboard
//         router.replace('/dashboard');
//       } else {
//         Alert.alert('Login Failed', response.data.message || 'Invalid credentials');
//       }
//     } catch (error: any) {
//       console.error("Login error:", error);
      
//       // Handle different error scenarios
//       if (error.response) {
//         // Server responded with error status
//         const errorMessage = error.response.data?.message || 
//                            error.response.data?.error || 
//                            'Login failed. Please check your credentials.';
//         Alert.alert('Login Failed', errorMessage);
//       } else if (error.request) {
//         // Request was made but no response
//         Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection.');
//       } else {
//         // Something else happened
//         Alert.alert('Error', error.message || 'Something went wrong');
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGoogleLogin = async () => {
//     setLoading(true);

//     try {
//       // Get Google auth URL from backend
//       const response = await api.get('/google');
      
//       if (response.data.url) {
//         console.log("Opening auth URL:", response.data.url);

//         // Open browser for Google login with redirect URI
//         const result = await WebBrowser.openAuthSessionAsync(
//           response.data.url,
//           'http://localhost:8081' // Your app's URL scheme for deep linking
//         );

//         console.log("WebBrowser result:", result);

//         if (result.type === 'success') {
//           const responseUrl = result.url;
//           console.log("Response URL:", responseUrl);
          
//           // Parse the URL to check for success/error and extract user data
//           if (responseUrl && responseUrl.includes('success=true')) {
//             // Try to extract user data from URL params
//             const params = new URLSearchParams(responseUrl.split('?')[1]);
//             const userDataParam = params.get('userData');
            
//             if (userDataParam) {
//               try {
//                 const userData = JSON.parse(decodeURIComponent(userDataParam));
//                 await AsyncStorage.setItem('userData', JSON.stringify(userData));
//               } catch (e) {
//                 console.error("Error parsing user data:", e);
//               }
//             }
            
//             router.replace('/dashboard');
//           } else if (responseUrl && responseUrl.includes('error=true')) {
//             Alert.alert('Login Failed', 'Google authentication failed');
//           }
//         } else if (result.type === 'cancel') {
//           Alert.alert('Login Cancelled', 'You cancelled the login process');
//         }
//       }
//     } catch (error: any) {
//       console.error("Google login error:", error);
//       Alert.alert('Login Failed', error?.response?.data?.message || error?.message || 'Something went wrong');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const GoogleIcon = () => (
//     <Svg width="20" height="20" viewBox="0 0 24 24">
//       <G>
//         <Path 
//           d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" 
//           fill="#4285F4" 
//         />
//         <Path 
//           d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" 
//           fill="#34A853" 
//         />
//         <Path 
//           d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" 
//           fill="#FBBC05" 
//         />
//         <Path 
//           d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" 
//           fill="#EA4335" 
//         />
//       </G>
//     </Svg>
//   );

//   return (
//     <>
//       <Stack.Screen options={{ headerShown: false }} />
      
//       <SafeAreaView style={styles.container}>
//         <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
//         <KeyboardAvoidingView
//           style={styles.keyboardView}
//           behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         >
//           <ScrollView 
//             contentContainerStyle={styles.scrollContainer}
//             showsVerticalScrollIndicator={false}
//           >
//             <View style={styles.centerContainer}>
//               <Image 
//                 source={require('../assets/images/android-icon-foreground.png')}
//                 style={styles.logo}
//                 resizeMode="contain"
//               />
              
//               <Text style={styles.title}>Welcome Back!</Text>
//               <Text style={styles.subtitle}>Sign in to continue</Text>
              
//               {/* Email Input */}
//               <View style={styles.inputContainer}>
//                 <Text style={styles.inputLabel}>Email</Text>
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Enter your email"
//                   placeholderTextColor="#999"
//                   value={email}
//                   onChangeText={setEmail}
//                   keyboardType="email-address"
//                   autoCapitalize="none"
//                   autoCorrect={false}
//                   editable={!loading}
//                 />
//               </View>

//               {/* Password Input */}
//               <View style={styles.inputContainer}>
//                 <Text style={styles.inputLabel}>Password</Text>
//                 <View style={styles.passwordContainer}>
//                   <TextInput
//                     style={[styles.input, styles.passwordInput]}
//                     placeholder="Enter your password"
//                     placeholderTextColor="#999"
//                     value={password}
//                     onChangeText={setPassword}
//                     secureTextEntry={!showPassword}
//                     autoCapitalize="none"
//                     editable={!loading}
//                   />
//                   <TouchableOpacity
//                     style={styles.eyeButton}
//                     onPress={() => setShowPassword(!showPassword)}
//                   >
//                     <Text style={styles.eyeText}>
//                       {showPassword ? '👁️' : '👁️‍🗨️'}
//                     </Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>

//               {/* Login Button */}
//               <TouchableOpacity 
//                 style={styles.loginBtn} 
//                 onPress={handleEmailLogin}
//                 disabled={loading}
//               >
//                 {loading ? (
//                   <ActivityIndicator color="#fff" />
//                 ) : (
//                   <Text style={styles.loginText}>Login</Text>
//                 )}
//               </TouchableOpacity>

//               {/* Divider */}
//               <View style={styles.divider}>
//                 <View style={styles.dividerLine} />
//                 <Text style={styles.dividerText}>OR</Text>
//                 <View style={styles.dividerLine} />
//               </View>

//               {/* Google Button */}
//               <TouchableOpacity 
//                 style={styles.googleBtn} 
//                 onPress={handleGoogleLogin}
//                 disabled={loading}
//               >
//                 {loading ? (
//                   <ActivityIndicator color="#666" />
//                 ) : (
//                   <>
//                     <GoogleIcon />
//                     <Text style={styles.googleText}>Continue with Google</Text>
//                   </>
//                 )}
//               </TouchableOpacity>

//               {/* Sign Up Link */}
//               <View style={styles.signUpContainer}>
//                 <Text style={styles.signUpText}>Don't have an account? </Text>
//                 <TouchableOpacity onPress={() => router.push('/Registeruser')}>
//                   <Text style={styles.signUpLink}>Sign Up</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </ScrollView>
//         </KeyboardAvoidingView>
//       </SafeAreaView>
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   keyboardView: {
//     flex: 1,
//   },
//   scrollContainer: {
//     flexGrow: 1,
//     justifyContent: 'center',
//   },
//   centerContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 24,
//     paddingVertical: 40,
//   },
//   logo: {
//     width: 200,
//     height: 150,
//     marginBottom: 20,
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: 'bold',
//     color: '#000',
//     textAlign: 'center',
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#666',
//     textAlign: 'center',
//     marginBottom: 32,
//   },
//   inputContainer: {
//     width: '100%',
//     marginBottom: 20,
//   },
//   inputLabel: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#333',
//     marginBottom: 8,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     fontSize: 16,
//     color: '#000',
//     backgroundColor: '#fafafa',
//   },
//   passwordContainer: {
//     position: 'relative',
//     width: '100%',
//   },
//   passwordInput: {
//     paddingRight: 50,
//   },
//   eyeButton: {
//     position: 'absolute',
//     right: 16,
//     top: '50%',
//     transform: [{ translateY: -12 }],
//   },
//   eyeText: {
//     fontSize: 20,
//   },
//   loginBtn: {
//     backgroundColor: '#000',
//     paddingVertical: 14,
//     borderRadius: 12,
//     width: '100%',
//     alignItems: 'center',
//     marginTop: 10,
//   },
//   loginText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   divider: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: 24,
//     width: '100%',
//   },
//   dividerLine: {
//     flex: 1,
//     height: 1,
//     backgroundColor: '#e0e0e0',
//   },
//   dividerText: {
//     marginHorizontal: 16,
//     color: '#999',
//     fontSize: 14,
//   },
//   googleBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 12,
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//     paddingVertical: 14,
//     paddingHorizontal: 24,
//     borderRadius: 12,
//     backgroundColor: '#fff',
//     width: '100%',
//   },
//   googleText: {
//     color: '#666',
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   signUpContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 24,
//   },
//   signUpText: {
//     fontSize: 14,
//     color: '#666',
//   },
//   signUpLink: {
//     fontSize: 14,
//     color: '#000',
//     fontWeight: '600',
//   },
// });



//////////////////////////////////////////using firebase notification/////////////
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps } from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import * as Linking from 'expo-linking';
import { Stack, router } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import api from './axiosInstance';
console.log('Firebase Apps:', getApps().length);



// Important: Complete WebBrowser session after auth
WebBrowser.maybeCompleteAuthSession();


export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

   const getFCMToken = async () => {
    try {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);

      // Optional
      await AsyncStorage.setItem('fcmToken', token);
    } catch (error) {
      console.log('FCM Token Error:', error);
    }
  };

  // Handle deep link callback
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      console.log("DEEP LINK RECEIVED:", event.url);
      
      if (event.url.includes('success=true')) {
        // For Google login, we need to extract user data from the callback URL
        // You might need to parse the URL to get user info
        router.replace('/dashboard');
      } else if (event.url.includes('error=true')) {
        Alert.alert('Login Failed', 'Please try again');
        setLoading(false);
      }
    };

    // Check initial URL (if app was opened from callback)
    const checkInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log("INITIAL URL:", initialUrl);
        if (initialUrl.includes('success=true')) {
          router.replace('/dashboard');
        }
      }
    };

    checkInitialUrl();

    // Add listener for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  // FCM Token useEffect
useEffect(() => {
  getFCMToken();
}, []);

  

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // Using the correct endpoint: /user/login
      const response = await api.post('/user/login', {
        email: email,
        password: password,
      });

      console.log("Login response:", response.data);

      if (response.data.success || response.data.token) {
        // Store token in AsyncStorage
        if (response.data.token) {
          await AsyncStorage.setItem('userToken', response.data.token);
        }
        
        // Store user data if available from response
        // Store user data if available from response
let userData = null;

if (response.data.user) {
  userData = response.data.user;

  await AsyncStorage.setItem(
    'userData',
    JSON.stringify(response.data.user)
  );

} else if (
  response.data.data &&
  response.data.data.user
) {
  userData = response.data.data.user;

  await AsyncStorage.setItem(
    'userData',
    JSON.stringify(response.data.data.user)
  );

} else {
  userData = {
    id:
      response.data.userId ||
      response.data.id ||
      'temp_id',

    name: email.split('@')[0],
    email: email,
    phone: '',
  };

  await AsyncStorage.setItem(
    'userData',
    JSON.stringify(userData)
  );
}

// ADD THIS
if (userData?.id) {
  await AsyncStorage.setItem(
    'userId',
    userData.id.toString()
  );
}
  const fcmToken = await AsyncStorage.getItem('fcmToken');

if (fcmToken && userData?.id) {
  try {
    await api.post('/save-fcm-token', {
      userId: userData.id,
      token: fcmToken,
    });

    console.log('FCM Token Saved Successfully');
  } catch (error) {
    console.log('FCM Save Error:', error);
  }
}
        
        // Navigate to UserDashboard
        router.replace('/dashboard');
      } else {
        Alert.alert('Login Failed', response.data.message || 'Invalid credentials');
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Handle different error scenarios
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.message || 
                           error.response.data?.error || 
                           'Login failed. Please check your credentials.';
        Alert.alert('Login Failed', errorMessage);
      } else if (error.request) {
        // Request was made but no response
        Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        // Something else happened
        Alert.alert('Error', error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      // Get Google auth URL from backend
      const response = await api.get('/google');
      
      if (response.data.url) {
        console.log("Opening auth URL:", response.data.url);

        // Open browser for Google login with redirect URI
        const result = await WebBrowser.openAuthSessionAsync(
          response.data.url,
          'http://localhost:8081' // Your app's URL scheme for deep linking
        );

        console.log("WebBrowser result:", result);

        if (result.type === 'success') {
          const responseUrl = result.url;
          console.log("Response URL:", responseUrl);
          
          // Parse the URL to check for success/error and extract user data
          if (responseUrl && responseUrl.includes('success=true')) {
            // Try to extract user data from URL params
            const params = new URLSearchParams(responseUrl.split('?')[1]);
            const userDataParam = params.get('userData');
            
            if (userDataParam) {
              try {
                const userData = JSON.parse(decodeURIComponent(userDataParam));
                await AsyncStorage.setItem('userData', JSON.stringify(userData));
              } catch (e) {
                console.error("Error parsing user data:", e);
              }
            }
            
            router.replace('/dashboard');
          } else if (responseUrl && responseUrl.includes('error=true')) {
            Alert.alert('Login Failed', 'Google authentication failed');
          }
        } else if (result.type === 'cancel') {
          Alert.alert('Login Cancelled', 'You cancelled the login process');
        }
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      Alert.alert('Login Failed', error?.response?.data?.message || error?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const GoogleIcon = () => (
    <Svg width="20" height="20" viewBox="0 0 24 24">
      <G>
        <Path 
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" 
          fill="#4285F4" 
        />
        <Path 
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" 
          fill="#34A853" 
        />
        <Path 
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" 
          fill="#FBBC05" 
        />
        <Path 
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" 
          fill="#EA4335" 
        />
      </G>
    </Svg>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.centerContainer}>
              <Image 
                source={require('../assets/images/android-icon-foreground.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
              
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeText}>
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                style={styles.loginBtn} 
                onPress={handleEmailLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginText}>Login</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Button */}
              <TouchableOpacity 
                style={styles.googleBtn} 
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#666" />
                ) : (
                  <>
                    <GoogleIcon />
                    <Text style={styles.googleText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/Registeruser')}>
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logo: {
    width: 200,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fafafa',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  eyeText: {
    fontSize: 20,
  },
  loginBtn: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    width: '100%',
  },
  googleText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signUpText: {
    fontSize: 14,
    color: '#666',
  },
  signUpLink: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
});