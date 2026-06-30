import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function CallbackScreen() {
  const params = useLocalSearchParams();
  const { success, error } = params;

  useEffect(() => {
    console.log("Callback received:", { success, error });
    
    // Small delay to ensure navigation works
    const timer = setTimeout(() => {
      if (success === 'true') {
        router.replace('/Businesslist');
      } else {
        router.replace('/LoginScreen');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [success, error]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});