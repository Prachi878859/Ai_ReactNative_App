import messaging from '@react-native-firebase/messaging';
import { registerRootComponent } from 'expo';
import 'expo-router/entry';

messaging().setBackgroundMessageHandler(
  async remoteMessage => {

    console.log(
      'Background Message =>',
      remoteMessage
    );

  }
);

registerRootComponent(require('expo-router/entry').default);