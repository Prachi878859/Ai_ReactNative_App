// app/offers.tsx - Fully Responsive with Fixed Date Pickers and Sidebar

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import axiosInstance from './axiosInstance';
import CustomSidebar from './Sidebar';

interface Offer {
  id: number;
  user_id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  created_at?: string;
  updated_at?: string;
}

const OffersScreen = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  const { width, height } = useWindowDimensions();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  // Responsive values
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const isMobile = width < 768;
  
  const cardPadding = width < 380 ? 14 : 18;
  const headingSize = width < 380 ? 22 : isTablet ? 34 : 28;
  
  // Enhanced responsive modal values
  const modalWidth = isDesktop ? '45%' : isTablet ? '60%' : '90%';
  const modalMaxWidth = isDesktop ? 550 : isTablet ? 500 : 400;
  const modalBorderRadius = isMobile ? 24 : 20;
  const modalPadding = isMobile ? (width < 380 ? 16 : 20) : 24;
  
  // Responsive font sizes
  const modalTitleSize = isMobile ? (width < 380 ? 20 : 22) : 24;
  const labelSize = isMobile ? 14 : 15;
  const inputSize = isMobile ? 14 : 15;
  const buttonTextSize = isMobile ? 14 : 15;

  // Fetch all offers on component mount
  useEffect(() => {
    fetchOffers();
  }, []);

  const getUserId = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        return null;
      }
      return Number(userId);
    } catch (error) {
      console.error('Error getting user_id:', error);
      return null;
    }
  };

  // Fetch all offers for the user
  const fetchOffers = async () => {
    setLoading(true);
    try {
      const userId = await getUserId();
      console.log('Logged in user ID:', userId);
      if (!userId) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const response = await axiosInstance.get(`/offers?user_id=${userId}`);
      
      if (response.data && Array.isArray(response.data)) {
        setOffers(response.data);
      } else if (response.data && response.data.offers) {
        setOffers(response.data.offers);
      } else {
        setOffers([]);
      }
    } catch (error: any) {
      console.error('Error fetching offers:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch offers');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOffers();
    setRefreshing(false);
  };

  // Add or Update offer
  const handleSaveOffer = async () => {
    if (!offerForm.title.trim()) {
      Alert.alert('Validation Error', 'Please enter offer title');
      return;
    }

    if (!offerForm.startDate.trim()) {
      Alert.alert('Validation Error', 'Please enter start date');
      return;
    }

    if (!offerForm.endDate.trim()) {
      Alert.alert('Validation Error', 'Please enter end date');
      return;
    }
    
    if (new Date(offerForm.endDate) < new Date(offerForm.startDate)) {
      Alert.alert(
        'Validation Error',
        'End date cannot be before start date'
      );
      return;
    }

    setSaving(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const offerData = {
        user_id: userId,
        title: offerForm.title,
        description: offerForm.description,
        startDate: offerForm.startDate,
        endDate: offerForm.endDate,
      };

      let response;
      if (editingOffer) {
        response = await axiosInstance.put(`/offers/${editingOffer.id}`, offerData);
        if (response.data) {
          Alert.alert('Success', 'Offer updated successfully');
        }
      } else {
        response = await axiosInstance.post('/offers', offerData);
        if (response.data) {
          Alert.alert('Success', 'Offer created successfully');
        }
      }

      resetForm();
      await fetchOffers();
      setShowModal(false);
    } catch (error: any) {
      console.error('Error saving offer:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  // Delete offer
const handleDeleteOffer = async (offerId: number) => {
  try {
    console.log('DELETE FUNCTION CALLED');
    console.log('Offer ID:', offerId);

    setLoading(true);

    const userId = await getUserId();

    console.log('User ID:', userId);

    const response = await axiosInstance.delete(
      `/offers/${offerId}`,
      {
        data: {
          user_id: userId,
        },
      }
    );

    console.log('DELETE RESPONSE:', response.data);

    Alert.alert('Success', 'Offer deleted successfully');

    await fetchOffers();

  } catch (error: any) {
    console.log('DELETE ERROR:', error?.response?.data || error);

    Alert.alert(
      'Error',
      error?.response?.data?.message || 'Failed to delete offer'
    );

  } finally {
    setLoading(false);
  }
};

  // Edit offer
  const handleEditOffer = (offer: any) => {
    setEditingOffer(offer);
    setOfferForm({
      title: offer.title || '',
      description: offer.description || '',
      startDate: offer.start_date ? offer.start_date.split('T')[0] : '',
      endDate: offer.end_date ? offer.end_date.split('T')[0] : '',
    });
    setShowModal(true);
  };
  
  // Reset form
  const resetForm = () => {
    setEditingOffer(null);
    setOfferForm({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date for display in input (DD/MM/YYYY)
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  // Render single offer card
  const renderOffer = ({ item }: { item: Offer }) => (
    <View
      style={[
        styles.offerCard,
        { padding: cardPadding },
      ]}
    >
      <View style={styles.offerTop}>
        <View style={styles.iconBox}>
          <Ionicons name="sparkles" size={20} color="#f59e0b" />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.offerHeader}>
            <Text
              style={[
                styles.offerTitle,
                { fontSize: width < 380 ? 15 : 17 },
              ]}
            >
              {item.title}
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => handleEditOffer(item)}
                style={styles.actionButton}
              >
                <Ionicons name="pencil" size={18} color="#3b82f6" />
              </TouchableOpacity>
              
              <TouchableOpacity
  style={styles.actionButton}
  onPress={() => {
    console.log('DELETE BUTTON CLICKED');

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to delete this offer?'
      );

      if (confirmed) {
        handleDeleteOffer(item.id);
      }
    } else {
      Alert.alert(
        'Delete Offer',
        'Are you sure you want to delete this offer?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            onPress: () => handleDeleteOffer(item.id),
          },
        ]
      );
    }
  }}
>
  <Ionicons
    name="trash-outline"
    size={18}
    color="#ef4444"
  />
</TouchableOpacity>
            </View>
          </View>

          <Text
            style={[
              styles.offerDescription,
              { fontSize: width < 380 ? 13 : 14 },
            ]}
          >
            {item.description || 'No description'}
          </Text>

          {(item.start_date || item.end_date) && (
            <View style={styles.dateContainer}>
              {item.start_date && (
                <View style={styles.dateBadge}>
                  <Ionicons name="calendar-outline" size={12} color="#f59e0b" />
                  <Text style={styles.dateText}>
                    From: {formatDate(item.start_date)}
                  </Text>
                </View>
              )}
              
              {item.end_date && (
                <View style={styles.dateBadge}>
                  <Ionicons name="flag-outline" size={12} color="#f59e0b" />
                  <Text style={styles.dateText}>
                    To: {formatDate(item.end_date)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{
        headerShown: true,
        title: 'New Offer',
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

        {/* Header */}
        <View
          style={[
            styles.header,
            {
              flexDirection: width < 480 ? 'column' : 'row',
              alignItems: width < 480 ? 'flex-start' : 'center',
              gap: width < 480 ? 16 : 0,
            },
          ]}
        >
          <View>
            <Text style={[styles.heading, { fontSize: headingSize }]}>
              Your Offers
            </Text>
            <Text style={styles.subHeading}>
              Manage your special business offers
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              { width: width < 480 ? '100%' : 'auto' }
            ]}
            onPress={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add Offer</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && !refreshing && offers.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.loadingText}>Loading offers...</Text>
          </View>
        ) : (
          <FlatList
            data={offers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderOffer}
            contentContainerStyle={[
              styles.listContainer,
              offers.length === 0 && styles.emptyListContainer
            ]}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIcon, {
                  width: width < 380 ? 70 : 90,
                  height: width < 380 ? 70 : 90,
                  borderRadius: width < 380 ? 35 : 45,
                }]}>
                  <Ionicons
                    name="sparkles-outline"
                    size={width < 380 ? 32 : 40}
                    color="#94a3b8"
                  />
                </View>
                <Text style={styles.emptyTitle}>No offers created yet</Text>
                <Text style={styles.emptyText}>
                  Tap on Add Offer button to create your first offer
                </Text>
              </View>
            }
          />
        )}

        {/* Modal for Add/Edit Offer */}
        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            resetForm();
            setShowModal(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContainer,
                {
                  width: modalWidth,
                  maxWidth: modalMaxWidth,
                  borderRadius: modalBorderRadius,
                  padding: modalPadding,
                  maxHeight: isMobile ? height * 0.85 : height * 0.8,
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { fontSize: modalTitleSize }]}>
                  {editingOffer ? 'Edit Offer' : 'Add New Offer'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={isMobile ? 24 : 28} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Title */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { fontSize: labelSize }]}>
                    Offer Title <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    placeholder="e.g. 20% Discount on All Items"
                    value={offerForm.title}
                    onChangeText={(text) =>
                      setOfferForm({ ...offerForm, title: text })
                    }
                    style={[styles.input, { fontSize: inputSize }]}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { fontSize: labelSize }]}>
                    Description
                  </Text>
                  <TextInput
                    placeholder="Describe your offer in detail..."
                    multiline
                    numberOfLines={isMobile ? 4 : 5}
                    textAlignVertical="top"
                    value={offerForm.description}
                    onChangeText={(text) =>
                      setOfferForm({ ...offerForm, description: text })
                    }
                    style={[styles.input, styles.textArea, { fontSize: inputSize }]}
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                {/* Start Date Field - Fixed Responsive */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { fontSize: labelSize }]}>
                    Start Date <Text style={styles.required}>*</Text>
                  </Text>

                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={offerForm.startDate}
                      onChange={(e: any) =>
                        setOfferForm({ ...offerForm, startDate: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '16px',
                        border: '1px solid #cbd5e1',
                        fontSize: `${inputSize}px`,
                        backgroundColor: '#f8fafc',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.datePickerButton, { width: '100%' }]}
                        onPress={() => setShowStartPicker(true)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.datePickerContent}>
                          <Ionicons 
                            name="calendar-outline" 
                            size={isMobile ? 20 : 22} 
                            color="#f59e0b" 
                          />
                          <Text
                            style={[
                              styles.datePickerText,
                              {
                                fontSize: inputSize,
                                color: offerForm.startDate ? '#0f172a' : '#94a3b8',
                                flex: 1,
                              },
                            ]}
                          >
                            {offerForm.startDate ? formatDisplayDate(offerForm.startDate) : 'Select Start Date'}
                          </Text>
                        </View>
                        <Ionicons 
                          name="chevron-down" 
                          size={isMobile ? 18 : 20} 
                          color="#64748b" 
                        />
                      </TouchableOpacity>

                      {showStartPicker && (
                        <View style={styles.datePickerModal}>
                          <View style={styles.datePickerHeader}>
                            <TouchableOpacity
                              onPress={() => setShowStartPicker(false)}
                              style={styles.datePickerCancel}
                            >
                              <Text style={styles.datePickerCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.datePickerTitle}>Start Date</Text>
                            <TouchableOpacity
                              onPress={() => setShowStartPicker(false)}
                              style={styles.datePickerDone}
                            >
                              <Text style={styles.datePickerDoneText}>Done</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={offerForm.startDate ? new Date(offerForm.startDate) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedDate) => {
                              if (selectedDate) {
                                const formattedDate = selectedDate.toISOString().split('T')[0];
                                setOfferForm({ ...offerForm, startDate: formattedDate });
                              }
                              setShowStartPicker(false);
                            }}
                            style={styles.dateTimePicker}
                          />
                        </View>
                      )}
                    </>
                  )}
                </View>

                {/* End Date Field - Fixed Responsive */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { fontSize: labelSize }]}>
                    End Date <Text style={styles.required}>*</Text>
                  </Text>

                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={offerForm.endDate}
                      onChange={(e: any) =>
                        setOfferForm({ ...offerForm, endDate: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '16px',
                        border: '1px solid #cbd5e1',
                        fontSize: `${inputSize}px`,
                        backgroundColor: '#f8fafc',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.datePickerButton, { width: '100%' }]}
                        onPress={() => setShowEndPicker(true)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.datePickerContent}>
                          <Ionicons 
                            name="calendar-outline" 
                            size={isMobile ? 20 : 22} 
                            color="#f59e0b" 
                          />
                          <Text
                            style={[
                              styles.datePickerText,
                              {
                                fontSize: inputSize,
                                color: offerForm.endDate ? '#0f172a' : '#94a3b8',
                                flex: 1,
                              },
                            ]}
                          >
                            {offerForm.endDate ? formatDisplayDate(offerForm.endDate) : 'Select End Date'}
                          </Text>
                        </View>
                        <Ionicons 
                          name="chevron-down" 
                          size={isMobile ? 18 : 20} 
                          color="#64748b" 
                        />
                      </TouchableOpacity>

                      {showEndPicker && (
                        <View style={styles.datePickerModal}>
                          <View style={styles.datePickerHeader}>
                            <TouchableOpacity
                              onPress={() => setShowEndPicker(false)}
                              style={styles.datePickerCancel}
                            >
                              <Text style={styles.datePickerCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.datePickerTitle}>End Date</Text>
                            <TouchableOpacity
                              onPress={() => setShowEndPicker(false)}
                              style={styles.datePickerDone}
                            >
                              <Text style={styles.datePickerDoneText}>Done</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={offerForm.endDate ? new Date(offerForm.endDate) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedDate) => {
                              if (selectedDate) {
                                const formattedDate = selectedDate.toISOString().split('T')[0];
                                setOfferForm({ ...offerForm, endDate: formattedDate });
                              }
                              setShowEndPicker(false);
                            }}
                            style={styles.dateTimePicker}
                          />
                        </View>
                      )}
                    </>
                  )}
                </View>

                {/* Footer Buttons */}
                <View
                  style={[
                    styles.footer,
                    {
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? 12 : 16,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.cancelButton, isMobile && { width: '100%' }]}
                    onPress={() => {
                      resetForm();
                      setShowModal(false);
                    }}
                  >
                    <Text style={[styles.cancelButtonText, { fontSize: buttonTextSize }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      saving && styles.saveButtonDisabled,
                      isMobile && { width: '100%' }
                    ]}
                    onPress={handleSaveOffer}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={[styles.saveButtonText, { fontSize: buttonTextSize }]}>
                          {editingOffer ? 'Update Offer' : 'Save Offer'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Sidebar */}
        <CustomSidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    paddingRight: 20,
  },

  menuButton: {
    marginLeft: 16,
    padding: 4,
    paddingLeft:-50,
  },

  header: {
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  heading: {
    fontWeight: '700',
    color: '#0f172a',
  },

  subHeading: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    elevation: 3,
  },

  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },

  listContainer: {
    paddingBottom: 30,
  },

  emptyListContainer: {
    flex: 1,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 50,
  },

  emptyIcon: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },

  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    elevation: 2,
  },

  offerTop: {
    flexDirection: 'row',
    gap: 14,
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  offerTitle: {
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  actionButton: {
    padding: 4,
  },

  offerDescription: {
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 8,
  },

  dateContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },

  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },

  dateText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    fontWeight: '700',
    color: '#0f172a',
  },

  closeButton: {
    padding: 4,
  },

  modalScrollContent: {
    paddingBottom: 10,
  },

  inputGroup: {
    marginBottom: 18,
  },

  label: {
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },

  required: {
    color: '#ef4444',
  },

  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#0f172a',
  },

  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Fixed Date Picker Styles - Fully Responsive
  datePickerButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },

  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  datePickerText: {
    fontWeight: '500',
  },

  datePickerModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },

  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },

  datePickerCancel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  datePickerCancelText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },

  datePickerDone: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  datePickerDoneText: {
    fontSize: 15,
    color: '#f59e0b',
    fontWeight: '600',
  },

  dateTimePicker: {
    height: 200,
  },

  footer: {
    marginTop: 24,
  },

  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#475569',
    fontWeight: '600',
  },

  saveButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default OffersScreen;