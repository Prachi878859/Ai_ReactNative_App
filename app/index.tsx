import * as Linking from 'expo-linking';
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  useEffect(() => {
    // Handle deep links first
    const handleDeepLink = async () => {
      const url = await Linking.getInitialURL();
      if (url && url.includes('myapp://callback')) {
        const params = new URL(url);
        const success = params.searchParams.get('success');
        if (success === 'true') {
          router.replace('/Businesslist');
          return;
        }
      }
      // If no deep link, go to splash screen
      setTimeout(() => {
        router.replace("/Splash_Screen");
      }, 1000);
    };

    handleDeepLink();

    // Listen for deep links when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url.includes('myapp://callback')) {
        const params = new URL(event.url);
        const success = params.searchParams.get('success');
        if (success === 'true') {
          router.replace('/Businesslist');
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}