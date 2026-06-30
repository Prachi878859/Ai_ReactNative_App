import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import api from './axiosInstance';
import CustomSidebar from './Sidebar';

interface UserData {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    created_at?: string;
}

export default function ProfileScreen() {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    
    // Form states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    
    // Password change states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [passwordUpdating, setPasswordUpdating] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    
    // Password visibility states
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Session Expired', 'Please login again', [
                    { text: 'OK', onPress: () => router.replace('/LoginScreen') }
                ]);
                return;
            }

            // First, try to get user data from AsyncStorage as fallback
            const storedUserData = await AsyncStorage.getItem('userData');
            if (storedUserData) {
                const parsedUser = JSON.parse(storedUserData);
                setUser(parsedUser);
                setName(parsedUser.name || '');
                setEmail(parsedUser.email || '');
                setPhone(parsedUser.phone || '');
            }

            // Then fetch fresh data from API
            try {
                const response = await api.get('/user/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.data.success && response.data.user) {
                    const freshUser = response.data.user;
                    setUser(freshUser);
                    setName(freshUser.name || '');
                    setEmail(freshUser.email || '');
                    setPhone(freshUser.phone || '');
                    // Update AsyncStorage with fresh data
                    await AsyncStorage.setItem('userData', JSON.stringify(freshUser));
                } else {
                    // If API fails but we have stored data, keep using it
                    console.log('API returned no user data, using stored data');
                }
            } catch (apiError: any) {
                console.log('Profile fetch from API error:', apiError.response?.data || apiError.message);
                // If API fails but we have stored data, we already set it above
                if (!storedUserData) {
                    Alert.alert('Error', 'Failed to load profile data from server');
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            Alert.alert('Error', 'Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Error', 'Email is required');
            return;
        }

        setUpdating(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Session Expired', 'Please login again');
                router.replace('/LoginScreen');
                return;
            }

            const response = await api.put('/user/profile', {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || null
            });

            if (response.data.success) {
                // Update local user data - ensure id is preserved
                if (user && user.id) {
                    const updatedUser: UserData = {
                        id: user.id,
                        name: name.trim(),
                        email: email.trim(),
                        phone: phone.trim() || undefined,
                        role: user.role,
                        created_at: user.created_at
                    };
                    setUser(updatedUser);
                    await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
                }
                Alert.alert('Success', 'Profile updated successfully');
            } else {
                Alert.alert('Error', response.data.message || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error('Profile update error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!currentPassword) {
            Alert.alert('Error', 'Current password is required');
            return;
        }
        if (!newPassword) {
            Alert.alert('Error', 'New password is required');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Error', 'New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        setPasswordUpdating(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Session Expired', 'Please login again');
                router.replace('/LoginScreen');
                return;
            }

            // Using the same /user/profile endpoint to update password
            const response = await api.put('/user/profile', {
                password: newPassword
            });

            if (response.data.success) {
                Alert.alert('Success', 'Password updated successfully');
                // Clear password fields and close modal
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setModalVisible(false);
            } else {
                Alert.alert('Error', response.data.message || 'Failed to update password');
            }
        } catch (error: any) {
            console.error('Password update error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update password');
        } finally {
            setPasswordUpdating(false);
        }
    };

    const closeModal = () => {
        setModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen options={{
                headerShown: true,
                title: 'My Profile',
                headerTitleStyle: styles.headerTitle,
              headerLeft: () => (
  <TouchableOpacity
    onPress={() => setSidebarVisible(true)}
    style={styles.backButton}
  >
    <Ionicons name="menu" size={28} color="#6366f1" />
  </TouchableOpacity>
),
                headerRight: () => (
                    <TouchableOpacity 
                        onPress={() => setModalVisible(true)} 
                        style={styles.passwordIconButton}
                    >
                        <Ionicons name="key-outline" size={22} color="#6366f1" />
                    </TouchableOpacity>
                ),
            }} />
            
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
                
                <ScrollView 
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Header - Updated to show user name */}
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <Ionicons name="person-circle" size={100} color="#6366f1" />
                        </View>
                        <Text style={styles.userName}>{user?.name || 'User'}</Text>
                       
                    </View>

                    {/* Profile Form */}
                    <View style={styles.formCard}>
                        <Text style={styles.sectionTitle}>Personal Information</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your full name"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                placeholderTextColor="#94A3B8"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Enter your phone number"
                                placeholderTextColor="#94A3B8"
                                keyboardType="phone-pad"
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.updateButton, updating && styles.disabledButton]}
                            onPress={handleUpdateProfile}
                            disabled={updating}
                        >
                            {updating ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.updateButtonText}>Update Profile</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Password Change Modal with Eye Icons */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <Ionicons name="key-outline" size={24} color="#6366f1" />
                                <Text style={styles.modalTitle}>Change Password</Text>
                            </View>
                            <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {/* Current Password Field with Eye Icon */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Current Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        placeholder="Enter current password"
                                        placeholderTextColor="#94A3B8"
                                        secureTextEntry={!showCurrentPassword}
                                    />
                                    <TouchableOpacity 
                                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                        style={styles.eyeIcon}
                                    >
                                        <Ionicons 
                                            name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
                                            size={22} 
                                            color="#64748B" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* New Password Field with Eye Icon */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>New Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        placeholder="Enter new password (min 6 characters)"
                                        placeholderTextColor="#94A3B8"
                                        secureTextEntry={!showNewPassword}
                                    />
                                    <TouchableOpacity 
                                        onPress={() => setShowNewPassword(!showNewPassword)}
                                        style={styles.eyeIcon}
                                    >
                                        <Ionicons 
                                            name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                                            size={22} 
                                            color="#64748B" 
                                        />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.passwordHint}>
                                    Password must be at least 6 characters long
                                </Text>
                            </View>

                            {/* Confirm Password Field with Eye Icon */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Confirm New Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="Confirm new password"
                                        placeholderTextColor="#94A3B8"
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <TouchableOpacity 
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={styles.eyeIcon}
                                    >
                                        <Ionicons 
                                            name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                                            size={22} 
                                            color="#64748B" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.modalUpdateButton, passwordUpdating && styles.disabledButton]}
                                onPress={handleUpdatePassword}
                                disabled={passwordUpdating}
                            >
                                {passwordUpdating ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.modalUpdateButtonText}>Update Password</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            <CustomSidebar
  visible={sidebarVisible}
  onClose={() => setSidebarVisible(false)}
/>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
    },
    scrollContainer: {
        padding: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    backButton: {
        marginLeft: 16,
        padding: 4,
    },
    passwordIconButton: {
        marginRight: 16,
        padding: 4,
        backgroundColor: '#EEF2FF',
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        marginBottom: 12,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 14,
        color: '#64748B',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#475569',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#F8FAFC',
    },
    disabledInput: {
        backgroundColor: '#F1F5F9',
        color: '#94A3B8',
    },
    fieldNote: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 4,
        marginLeft: 4,
    },
    updateButton: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    disabledButton: {
        opacity: 0.6,
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    passwordHint: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 6,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: '#111827',
    },
    eyeIcon: {
        padding: 12,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 24,
        width: '90%',
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: '#fff',
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        padding: 20,
    },
    modalUpdateButton: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 20,
    },
    modalUpdateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});