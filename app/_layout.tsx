import messaging from '@react-native-firebase/messaging';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
 // Foreground Notification
  useEffect(() => {

    const unsubscribe = messaging().onMessage(
      async remoteMessage => {

        console.log(
          'Foreground Notification =>',
          remoteMessage
        );

      }
    );

    return unsubscribe;

  }, []);
 // Notification Click
  useEffect(() => {

    const unsubscribe =
      messaging().onNotificationOpenedApp(
        remoteMessage => {

          console.log(
            'Opened From Background =>',
            remoteMessage
          );

        }
      );

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {

        if (remoteMessage) {

          console.log(
            'Opened From Quit State =>',
            remoteMessage
          );

        }
      });

    return unsubscribe;

  }, []);
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="LoginScreen"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="Businesslist"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="callback"
        options={{
          headerShown: false,
        }}
      />

      {/* IMPORTANT */}
      <Stack.Screen
        name="checkout"
        options={{
          headerShown: true,
        }}
      />

      <Stack.Screen
        name="MySubscriptionsScreen"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
      name='ImageUploadScreen'
      options={{headerShown:false,

      }}
      />
    </Stack>
  );
}