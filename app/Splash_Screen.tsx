import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  ImageBackground,
  Platform,
  StyleSheet,
  View,
} from "react-native";

const SPLASH_DELAY = 10000; // 10 sec

export default function Splash() {
  const router = useRouter();
  const hasNavigated = useRef(false); // Prevent multiple navigation

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        router.replace("/LoginScreen");
      }
    }, SPLASH_DELAY);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          gestureEnabled: false // Prevent back gesture on splash
        }} 
      />
      <View style={styles.container}>
        <ImageBackground
          source={require("../assets/images/splash_image.png")}
          style={styles.background}
          imageStyle={styles.image}
          resizeMode="contain"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    alignSelf: "center",
    ...(Platform.OS === "web" && {
      maxWidth: 1200,
      marginHorizontal: "auto",
    }),
  },
});