import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

export const setupForegroundNotification = () => {

  return messaging().onMessage(
    async remoteMessage => {

      Alert.alert(
        remoteMessage.notification?.title || '',
        remoteMessage.notification?.body || ''
      );

    }
  );

};