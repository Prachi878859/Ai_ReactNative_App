// ImageUploadScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router'; // Stack import करा
import React, { useState } from 'react';
import {
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import CustomSidebar from './Sidebar'; // Sidebar import करा

export default function ImageUploadScreen() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);  // Sidebar state

  // Image picker function
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Camera function
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    try {
      Alert.alert('Success', 'Image uploaded successfully!');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
      console.error('Upload error:', error);
    }
  };

  return (
    <>
      {/* Stack Header with Menu Button */}
      <Stack.Screen options={{
        headerShown: true,
        title: 'Upload Image',
        headerTitleStyle: styles.headerTitle,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={28} color="#6366f1" />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={{ width: 40 }} />
        ),
      }} />
      
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

        {/* Upload Area */}
        <ScrollView style={styles.scrollView}>
          <View style={[
            styles.uploadArea,
            selectedImage && styles.uploadAreaWithImage
          ]}>
            {selectedImage ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close-circle" size={30} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="cloud-upload-outline" size={60} color="#6366f1" />
                <Text style={styles.dropText}>Upload your image here</Text>
                <Text style={styles.dropSubText}>Choose from gallery or take a photo</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                    <Ionicons name="images-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Browse Files</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
                    <Ionicons name="camera-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Upload Button */}
          {selectedImage && (
            <TouchableOpacity style={styles.uploadActionButton} onPress={handleUpload}>
              <Ionicons name="cloud-upload" size={24} color="#fff" />
              <Text style={styles.uploadActionText}>Upload Image</Text>
            </TouchableOpacity>
          )}

          {/* Supported formats */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              Supported formats: JPG, PNG, GIF, WebP (Max size: 5MB)
            </Text>
          </View>
        </ScrollView>

        {/* Sidebar */}
        <CustomSidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },

  menuButton: {
    marginLeft: 16,
    padding: 4,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },

  uploadArea: {
    marginTop: 20,
    height: 350,
    borderWidth: 3,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  uploadAreaWithImage: {
    borderStyle: 'solid',
    borderColor: '#6366f1',
    backgroundColor: '#F8FAFC',
  },
  
  placeholderContainer: {
    alignItems: 'center',
    padding: 20,
  },
  
  dropText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 15,
  },
  
  dropSubText: {
    fontSize: 14,
    color: '#94A3B8',
    marginVertical: 15,
  },
  
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  
  uploadButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  
  cameraButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
    resizeMode: 'cover',
  },
  
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 15,
  },
  
  uploadActionButton: {
    backgroundColor: '#6366f1',
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  
  uploadActionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 20,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    gap: 8,
    marginBottom: 20,
  },
  
  infoText: {
    color: '#64748B',
    fontSize: 14,
    flex: 1,
  },
});