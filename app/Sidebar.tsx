import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function CustomSidebar({
  visible,
  onClose,
}: SidebarProps) {
  const router = useRouter();

  const slideAnim = useRef(
    new Animated.Value(-SIDEBAR_WIDTH)
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');

      onClose();

      router.replace('/LoginScreen');
    } catch (error) {
      console.log('Logout Error:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Dark Background */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        {/* Sidebar */}
        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>Menu</Text>

            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* MENU ITEMS */}
          <ScrollView
            style={styles.menuContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Dashboard */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/dashboard');
              }}
            >
              <Ionicons
                name="grid-outline"
                size={22}
                color="#6366f1"
              />
              <Text style={styles.menuText}>
                Dashboard
              </Text>
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/ProfileScreen');
              }}
            >
              <Ionicons
                name="person-outline"
                size={22}
                color="#6366f1"
              />
              <Text style={styles.menuText}>
                My Profile
              </Text>
            </TouchableOpacity>

            {/* Upload Image - NEW */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/ImageUploadScreen');
              }}
            >
              <Ionicons
                name="image-outline"
                size={22}
                color="#6366f1"
              />
              <Text style={styles.menuText}>
                Upload Image
              </Text>
            </TouchableOpacity>

            {/* Buy Plan */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/MySubscriptionsScreen');
              }}
            >
              <Ionicons
                name="cart-outline"
                size={22}
                color="#6366f1"
              />
              <Text style={styles.menuText}>
                My Subscriptions
              </Text>
            </TouchableOpacity>

            {/* New Offer */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/NewOffer');
              }}
            >
              <Ionicons
                name="gift-outline"
                size={22}
                color="#6366f1"
              />
              <Text style={styles.menuText}>
                New Offer
              </Text>
            </TouchableOpacity>

            {/* Calendar */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/CalendarScreen');
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={22}
                color="#6366f1"
              />
              <Text style={styles.menuText}>
                Calendar
              </Text>
            </TouchableOpacity>

            {/* Setting */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                router.push('/setting');
              }}
            >
              <Ionicons
                name="settings-outline"
                size={22}
                color="#6366f1"
              />
              <Text style={styles.menuText}>
                Setting
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* LOGOUT BOTTOM */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons
                name="log-out-outline"
                size={22}
                color="#fff"
              />
              <Text style={styles.logoutText}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 55,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: {
      width: -5,
      height: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 999,
  },

  header: {
    backgroundColor: '#6366f1',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },

  headerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  menuContainer: {
    flex: 1,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
  },

  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },

  bottomContainer: {
    paddingBottom: 40,
  },

  logoutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  logoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});