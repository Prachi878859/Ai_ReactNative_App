// app/checkout.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import api from './axiosInstance';
import CustomSidebar from './Sidebar';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Razorpay native only
let RazorpayCheckout: any = null;

if (Platform.OS !== 'web') {
  RazorpayCheckout = require('react-native-razorpay').default;
}

interface Package {
  id: string;
  title: string;
  name?: string;
  description: string;
  price: string;
  duration?: string;
  duration_days?: number;
  features: string[];
  color?: string;
}

interface User {
  name: string;
  email: string;
  phone: string;
}

interface SocialMediaOption {
  value: string;
  label: string;
  icon: string;
  price: number;
}

const SOCIAL_MEDIA_PRICE = 499;

const socialMediaOptions: SocialMediaOption[] = [
  { value: 'Google My Business', label: 'Google My Business', icon: 'logo-google', price: SOCIAL_MEDIA_PRICE },
  { value: 'Instagram', label: 'Instagram', icon: 'logo-instagram', price: SOCIAL_MEDIA_PRICE },
  { value: 'Facebook', label: 'Facebook', icon: 'logo-facebook', price: SOCIAL_MEDIA_PRICE },
  { value: 'Twitter', label: 'Twitter', icon: 'logo-twitter', price: SOCIAL_MEDIA_PRICE },
  { value: 'LinkedIn', label: 'LinkedIn', icon: 'logo-linkedin', price: SOCIAL_MEDIA_PRICE },
  { value: 'YouTube', label: 'YouTube', icon: 'logo-youtube', price: SOCIAL_MEDIA_PRICE }
];

export default function CheckoutScreen() {
  const params = useLocalSearchParams();

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedSocialMedia, setSelectedSocialMedia] = useState<SocialMediaOption[]>([]);
  const [durationType, setDurationType] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  // ✅ Queue related states
  const [isQueued, setIsQueued] = useState(false);
  const [calculatedStartDate, setCalculatedStartDate] = useState<string | null>(null);
  const [calculatedEndDate, setCalculatedEndDate] = useState<string | null>(null);
  const [calculatedNextBilling, setCalculatedNextBilling] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  
  // Success Modal States
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState<{
    platforms: string[];
    totalAmount: number;
    durationType: string;
    subscriptionId?: string | number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setPageLoading(true);

      if (!params.package) {
        Alert.alert('Error', 'No package selected');
        router.back();
        return;
      }

      const parsedPackage = JSON.parse(params.package as string);
      setSelectedPackage(parsedPackage);

      // ✅ Check for queued plan data from params
      if (parsedPackage.isQueued) {
        setIsQueued(true);
        setCalculatedStartDate(parsedPackage.calculatedStartDate || null);
        setCalculatedEndDate(parsedPackage.calculatedEndDate || null);
        setCalculatedNextBilling(parsedPackage.calculatedNextBilling || null);
        setCurrentPlan(parsedPackage.currentPlan || null);
      }

      await fetchUserData();
      await fetchActiveSubscription();
    } catch (error) {
      console.log('Package Parse Error:', error);
      Alert.alert('Error', 'Invalid package data');
      router.back();
    } finally {
      setPageLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser({
          name: parsed.name || '',
          email: parsed.email || '',
          phone: parsed.phone || '',
        });
      } else {
        setUser({
          name: 'Guest User',
          email: 'guest@example.com',
          phone: '9999999999',
        });
      }
    } catch (error) {
      console.log('User Fetch Error:', error);
      setUser({
        name: 'Guest User',
        email: 'guest@example.com',
        phone: '9999999999',
      });
    }
  };

  const fetchActiveSubscription = async () => {
    try {
      const response = await api.get('/payments/active-subscription');
      if (response.data?.success) {
        setActiveSubscription(response.data.activeSubscription || null);
      }
    } catch (error) {
      console.log('Active Subscription Error:', error);
      setActiveSubscription(null);
    }
  };

  const calculateDates = () => {
    let startDate: Date, endDate: Date, nextBillingDate: Date;
    
    if (calculatedStartDate && calculatedEndDate) {
      startDate = new Date(calculatedStartDate);
      endDate = new Date(calculatedEndDate);
      nextBillingDate = new Date(calculatedNextBilling || calculatedEndDate);
    } else {
      startDate = new Date();
      if (durationType === 'year') {
        endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (selectedPackage?.duration_days || 30));
      }
      nextBillingDate = new Date(endDate);
    }
    
    return { startDate, endDate, nextBillingDate };
  };

  const { startDate, endDate } = calculateDates();

  const calculateSocialMediaTotal = () => {
    return selectedSocialMedia.reduce((total, item) => total + item.price, 0);
  };

  const calculateTotalPrice = () => {
    let socialTotal = calculateSocialMediaTotal();
    
    if (durationType === 'year') {
      socialTotal = socialTotal * 12;
      socialTotal = socialTotal - (socialTotal * 0.10);
    }
    
    return Math.round(socialTotal);
  };

  const getYearlyDiscountAmount = () => {
    if (durationType !== 'year') return 0;
    const yearlyBeforeDiscount = calculateSocialMediaTotal() * 12;
    const discount = yearlyBeforeDiscount * 0.10;
    return Math.round(discount);
  };

  const totalPrice = calculateTotalPrice();
  const discountAmount = getYearlyDiscountAmount();

  const toggleSocialMedia = (option: SocialMediaOption) => {
    const exists = selectedSocialMedia.find(s => s.value === option.value);
    if (exists) {
      setSelectedSocialMedia(selectedSocialMedia.filter(s => s.value !== option.value));
    } else {
      setSelectedSocialMedia([...selectedSocialMedia, option]);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const verifySubscription = async (
    razorpay_subscription_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string
  ) => {
    try {
      const response = await api.post('/payments/verify-subscription', {
        razorpay_subscription_id,
        razorpay_payment_id,
        razorpay_signature,
        duration_type: durationType,
        social_media_addons: selectedSocialMedia.map(s => ({ platform: s.value, price: s.price })),
        total_amount: totalPrice,
        is_queued: isQueued,  // ✅ Pass isQueued flag
        start_date: calculatedStartDate,  // ✅ Pass start date for queued plans
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      return response.data;
    } catch (error) {
      console.log('VERIFY SUBSCRIPTION ERROR:', error);
      throw error;
    }
  };

  // Show Success Modal
  const showSuccessModal = (paymentData: any, subscriptionId?: string | number) => {
    setSuccessData({
      platforms: selectedSocialMedia.map(s => s.label),
      totalAmount: totalPrice,
      durationType: durationType === 'year' ? 'Annual' : 'Monthly',
      subscriptionId: subscriptionId || paymentData?.razorpay_payment_id || 'N/A',
    });
    setSuccessModalVisible(true);
    setLoading(false);
  };

  // Handle Dashboard Navigation
  const goToDashboard = async () => {
    try {
      await AsyncStorage.setItem('openBusinessModal', 'true');
      await AsyncStorage.setItem('isSubscribed', 'true');
      await AsyncStorage.setItem('subscriptionPackage', selectedPackage?.title || '');
      await AsyncStorage.setItem('subscriptionDate', new Date().toISOString());
      await AsyncStorage.setItem('paymentId', String(successData?.subscriptionId || ''));
      await AsyncStorage.setItem('selectedSocialMedia', JSON.stringify(selectedSocialMedia));
      await AsyncStorage.setItem('durationType', durationType);
      
      setSuccessModalVisible(false);
      
      setTimeout(() => {
        router.replace('/dashboard');
      }, 300);
    } catch (error) {
      console.log('Navigation Error:', error);
      setSuccessModalVisible(false);
      router.replace('/dashboard');
    }
  };

  const handlePaymentSuccess = async (paymentData: any, subscriptionId?: string | number) => {
    try {
      // Store data in AsyncStorage
      await AsyncStorage.setItem('openBusinessModal', 'true');
      await AsyncStorage.setItem('isSubscribed', 'true');
      await AsyncStorage.setItem('subscriptionPackage', selectedPackage?.title || '');
      await AsyncStorage.setItem('subscriptionDate', new Date().toISOString());
      await AsyncStorage.setItem('paymentId', String(paymentData?.razorpay_payment_id || ''));
      await AsyncStorage.setItem('selectedSocialMedia', JSON.stringify(selectedSocialMedia));
      await AsyncStorage.setItem('durationType', durationType);
      
      // Show success modal instead of direct navigation
      showSuccessModal(paymentData, subscriptionId);
    } catch (error) {
      console.log('Success Error:', error);
      Alert.alert('Error', 'Something went wrong');
      setLoading(false);
    }
  };

  const handleWebPayment = async (subscriptionData: any) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      Alert.alert('Error', 'Razorpay SDK failed to load');
      return;
    }

    const options = {
      key: subscriptionData.key_id,
      subscription_id: subscriptionData.subscription_id,
      name: 'Sparklers Infotech',
      description: `${selectedSocialMedia.length} Social Media Platform(s)${durationType === 'year' ? ' (Annual - 10% OFF)' : ' (Monthly)'}`,
      amount: totalPrice * 100,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: {
        color: '#6366f1',
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
        },
      },
      handler: async function (response: any) {
        try {
          const verifyData = await verifySubscription(
            response.razorpay_subscription_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
          await handlePaymentSuccess(response, verifyData.subscriptionId);
        } catch (error) {
          Alert.alert('Verification Failed', 'Subscription verification failed');
          setLoading(false);
        }
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const handleNativePayment = async (subscriptionData: any) => {
    const options = {
      key: subscriptionData.key_id,
      subscription_id: subscriptionData.subscription_id,
      currency: 'INR',
      amount: totalPrice * 100,
      name: 'Sparklers Infotech',
      description: `${selectedSocialMedia.length} Social Media Platform(s)${durationType === 'year' ? ' (Annual - 10% OFF)' : ' (Monthly)'}`,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: {
        color: '#6366f1',
      },
    };

    try {
      const paymentData = await RazorpayCheckout.open(options);
      const verifyData = await verifySubscription(
        paymentData.razorpay_subscription_id,
        paymentData.razorpay_payment_id,
        paymentData.razorpay_signature
      );
      await handlePaymentSuccess(paymentData, verifyData.subscriptionId);
    } catch (error: any) {
      console.log('Native Subscription Error:', error);
      Alert.alert('Payment Failed', error?.description || 'Payment cancelled');
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPackage) return;

    if (selectedSocialMedia.length === 0) {
      Alert.alert('Selection Required', 'Please select at least 1 social media platform');
      return;
    }

    if (activeSubscription && !isQueued) {
      const endDateFormatted = new Date(activeSubscription.end_date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      Alert.alert(
        'Subscription Already Active',
        `You already have an active subscription (${activeSubscription.package_title}) until ${endDateFormatted}. Please wait until it expires`
      );
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/payments/create-subscription', {
        package_id: selectedPackage.id,
        duration_type: durationType,
        social_media_addons: selectedSocialMedia.map(s => ({ platform: s.value, price: s.price })),
        total_amount: totalPrice,
        duration_days: durationType === 'year' ? 365 : selectedPackage.duration_days,
        is_queued: isQueued,  // ✅ Send isQueued flag to backend
        start_date: calculatedStartDate,  // ✅ Send start date for queued plans
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message);
      }

      if (Platform.OS === 'web') {
        await handleWebPayment(data);
      } else {
        await handleNativePayment(data);
      }
    } catch (error: any) {
      console.log('PAYMENT ERROR:', error);
      Alert.alert(
        'Payment Failed',
        error?.response?.data?.message || error?.message || 'Something went wrong'
      );
      setLoading(false);
    }
  };

  const getFeatureIcon = (feature: string): keyof typeof Ionicons.glyphMap => {
    const text = feature.toLowerCase();
    if (text.includes('unlimited')) return 'infinite-outline';
    if (text.includes('4k') || text.includes('resolution')) return 'flash-outline';
    if (text.includes('priority')) return 'rocket-outline';
    if (text.includes('support')) return 'headset-outline';
    return 'checkmark-circle-outline';
  };

  const getPlanColor = () => {
    const title = selectedPackage?.title?.toLowerCase() || '';
    if (title.includes('ultimate')) return '#7c3aed';
    if (title.includes('pro')) return '#2563eb';
    if (title.includes('starter')) return '#059669';
    return '#4f46e5';
  };

  // Helper function to safely format subscription ID
  const formatSubscriptionId = (id: string | number | undefined): string => {
    if (!id) return 'N/A';
    const idStr = String(id);
    return idStr.length > 12 ? idStr.substring(0, 12) : idStr;
  };

  if (pageLoading || !selectedPackage) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

        <ScrollView 
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {/* ✅ QUEUED PLAN ALERT - Exactly like web version */}
          {isQueued && (
            <View style={styles.queuedCard}>
              <View style={styles.queuedIcon}>
                <Ionicons name="time-outline" size={20} color="#2563eb" />
              </View>
              <View style={styles.queuedContent}>
                <Text style={styles.queuedTitle}>📋 Plan Will Be Queued</Text>
                <Text style={styles.queuedText}>
                  Your current plan <Text style={styles.queuedBold}>{currentPlan}</Text> remains active.{'\n'}
                  This new plan will start on <Text style={styles.queuedBold}>
                    {calculatedStartDate ? new Date(calculatedStartDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : formatFullDate(startDate)}
                  </Text>.
                </Text>
              </View>
            </View>
          )}

          {/* Duration Selection */}
          <View style={styles.durationCard}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="pricetag-outline" size={16} color="#6366f1" /> Select Duration
            </Text>
            <View style={styles.durationRow}>
              <TouchableOpacity
                style={[styles.durationButton, durationType === 'month' && styles.durationActive]}
                onPress={() => setDurationType('month')}
              >
                <Ionicons name="time-outline" size={24} color={durationType === 'month' ? '#6366f1' : '#94a3b8'} />
                <Text style={[styles.durationTitle, durationType === 'month' && styles.durationTitleActive]}>Monthly Plan</Text>
                <Text style={styles.durationSubtext}>Billed monthly</Text>
                <Text style={styles.durationPrice}>₹{calculateSocialMediaTotal() === 0 ? '00' : calculateSocialMediaTotal().toLocaleString()}/month</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.durationButton, durationType === 'year' && styles.durationActiveYear]}
                onPress={() => setDurationType('year')}
              >
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>SAVE 10%</Text>
                </View>
                <Ionicons name="stats-chart-outline" size={24} color={durationType === 'year' ? '#10b981' : '#94a3b8'} />
                <Text style={[styles.durationTitle, durationType === 'year' && styles.durationTitleActiveYear]}>Annual Plan</Text>
                <Text style={styles.durationSubtext}>Billed yearly</Text>
                <Text style={styles.durationDiscountText}>10% OFF on total</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Social Media Add-ons */}
          <View style={styles.socialCard}>
            <View style={styles.socialHeader}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="add-circle-outline" size={16} color="#a855f7" /> Social Media Add-ons
              </Text>
              <Text style={styles.socialPriceHint}>₹{SOCIAL_MEDIA_PRICE} each platform</Text>
            </View>
            
            <View style={styles.socialGrid}>
              {socialMediaOptions.map((option, idx) => {
                const isSelected = selectedSocialMedia.some(s => s.value === option.value);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.socialOption, isSelected && styles.socialOptionSelected]}
                    onPress={() => toggleSocialMedia(option)}
                  >
                    <View style={styles.socialCheckbox}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                    </View>
                    <View style={styles.socialIcon}>
                      <Ionicons name={option.icon as any} size={20} color={isSelected ? '#a855f7' : '#64748b'} />
                    </View>
                    <View style={styles.socialInfo}>
                      <Text style={[styles.socialLabel, isSelected && styles.socialLabelSelected]}>{option.label}</Text>
                      <Text style={styles.socialPrice}>+₹{option.price}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#a855f7" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {selectedSocialMedia.length > 0 && (
              <View style={styles.selectedSummary}>
                <Text style={styles.selectedSummaryText}>
                  Selected {selectedSocialMedia.length} platform(s): +₹{(selectedSocialMedia.length * SOCIAL_MEDIA_PRICE).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Package Details */}
          <View style={styles.packageCard}>
            <View style={[styles.packageHeader, { backgroundColor: getPlanColor() }]}>
              <View style={styles.packageHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.durationBadge}>
                      {durationType === 'year' ? 'Annual Plan (365 days)' : `${selectedPackage.duration_days} Days`}
                    </Text>
                    {durationType === 'year' && (
                      <Text style={styles.discountBadgeSmall}>10% OFF</Text>
                    )}
                  </View>
                  <Text style={styles.packageTitle}>{selectedPackage.title}</Text>
                  <Text style={styles.packageDescription}>{selectedPackage.description}</Text>
                </View>
              </View>
            </View>

            <View style={styles.packageBody}>
              <View style={styles.dateContainer}>
                <View style={styles.dateItem}>
                  <Ionicons name="calendar-outline" size={14} color="#6366f1" />
                  <Text style={styles.dateText}>
                    {isQueued ? `Queued: ${formatDate(startDate)} - ${formatDate(endDate)}` : `${formatDate(startDate)} - ${formatDate(endDate)}`}
                  </Text>
                </View>
                <View style={styles.dateItem}>
                  <Ionicons name="time-outline" size={14} color="#6366f1" />
                  <Text style={styles.dateText}>
                    {durationType === 'year' ? '365 days validity' : `${selectedPackage.duration_days} days validity`}
                  </Text>
                </View>
              </View>

              <Text style={styles.featuresHeading}>
                <Ionicons name="diamond-outline" size={14} color="#6366f1" /> What's included
              </Text>
              <View style={styles.featuresGrid}>
                {selectedPackage.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Ionicons name={getFeatureIcon(feature)} size={14} color="#10b981" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Order Summary - Fixed at bottom */}
        <View style={styles.bottomSummary}>
          <View style={styles.summaryContent}>
            <View>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₹{totalPrice === 0 ? '00' : totalPrice.toLocaleString()}</Text>
              {durationType === 'year' && discountAmount > 0 && (
                <Text style={styles.discountInfo}>✨ 10% Annual Discount Applied</Text>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.payButton,
                (loading || selectedSocialMedia.length === 0) && styles.payButtonDisabled
              ]}
              onPress={handlePayment}
              disabled={loading || selectedSocialMedia.length === 0}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={16} color="#fff" />
                  <Text style={styles.payButtonText}>
                    {selectedSocialMedia.length === 0 ? 'Select at least 1 platform' : `Pay ₹${totalPrice.toLocaleString()}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.securityRow}>
            <View style={styles.securityItem}>
              <Ionicons name="shield-checkmark" size={12} color="#94a3b8" />
              <Text style={styles.securityText}>100% Secure</Text>
            </View>
            <View style={styles.securityItem}>
              <Ionicons name="lock-closed" size={10} color="#94a3b8" />
              <Text style={styles.securityText}>Encrypted</Text>
            </View>
          </View>
        </View>

        {/* ==================== SUCCESS MODAL ==================== */}
        <Modal
          visible={successModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.successIconContainer}>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark" size={48} color="#fff" />
                </View>
              </View>

              <Text style={styles.modalTitle}>✅ Payment Successful!</Text>
              
              <View style={styles.modalContent}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Package:</Text>
                  <Text style={styles.modalValue}>{selectedPackage?.title}</Text>
                </View>
                
                {successData?.platforms && successData.platforms.length > 0 && (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Platforms:</Text>
                    <Text style={styles.modalValue}>
                      {successData.platforms.join(', ')}
                    </Text>
                  </View>
                )}
                
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Duration:</Text>
                  <Text style={styles.modalValue}>{successData?.durationType}</Text>
                </View>
                
                {durationType === 'year' && (
                  <View style={styles.modalDiscountRow}>
                    <Ionicons name="gift" size={16} color="#10b981" />
                    <Text style={styles.modalDiscountText}>🎉 10% Annual Discount Applied!</Text>
                  </View>
                )}
                
                <View style={styles.modalDivider} />
                
                <View style={styles.modalTotalRow}>
                  <Text style={styles.modalTotalLabel}>Total Paid</Text>
                  <Text style={styles.modalTotalValue}>₹{successData?.totalAmount?.toLocaleString()}</Text>
                </View>
                
                <View style={styles.modalPaymentIdRow}>
                  <Ionicons name="receipt-outline" size={14} color="#94a3b8" />
                  <Text style={styles.modalPaymentId}>
                    Payment ID: {formatSubscriptionId(successData?.subscriptionId)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.dashboardButton} onPress={goToDashboard}>
                <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 60,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748b',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 180,
  },
  // ✅ Queued Card Styles - Exactly like web version
  queuedCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  queuedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queuedContent: {
    flex: 1,
  },
  queuedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4,
  },
  queuedText: {
    fontSize: 11,
    color: '#1e3a8a',
    lineHeight: 16,
  },
  queuedBold: {
    fontWeight: '700',
  },
  durationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    position: 'relative',
  },
  durationActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  durationActiveYear: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  discountBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  discountText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  durationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 6,
  },
  durationTitleActive: {
    color: '#6366f1',
  },
  durationTitleActiveYear: {
    color: '#10b981',
  },
  durationSubtext: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  durationPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
    marginTop: 6,
  },
  durationDiscountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 4,
  },
  socialCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  socialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  socialPriceHint: {
    fontSize: 10,
    color: '#94a3b8',
  },
  socialGrid: {
    gap: 10,
  },
  socialOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  socialOptionSelected: {
    borderColor: '#a855f7',
    backgroundColor: '#faf5ff',
  },
  socialCheckbox: {
    width: 24,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#a855f7',
    borderColor: '#a855f7',
  },
  socialIcon: {
    width: 32,
    alignItems: 'center',
  },
  socialInfo: {
    flex: 1,
  },
  socialLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  socialLabelSelected: {
    color: '#a855f7',
  },
  socialPrice: {
    fontSize: 10,
    color: '#a855f7',
    marginTop: 2,
  },
  selectedSummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#faf5ff',
    borderRadius: 12,
  },
  selectedSummaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7e22ce',
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  packageHeader: {
    padding: 20,
  },
  packageHeaderRow: {
    flexDirection: 'row',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  durationBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  discountBadgeSmall: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  packageTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  packageDescription: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  packageBody: {
    padding: 18,
  },
  dateContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    gap: 10,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#475569',
  },
  featuresHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  featuresGrid: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  bottomSummary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#6366f1',
  },
  discountInfo: {
    fontSize: 10,
    color: '#10b981',
    marginTop: 2,
  },
  payButton: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    minWidth: 180,
  },
  payButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  securityRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  securityText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  // ==================== MODAL STYLES ====================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  successIconContainer: {
    marginBottom: 12,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modalLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  modalValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  modalDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 4,
  },
  modalDiscountText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 10,
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTotalLabel: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  modalTotalValue: {
    fontSize: 20,
    color: '#6366f1',
    fontWeight: '900',
  },
  modalPaymentIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  modalPaymentId: {
    fontSize: 10,
    color: '#94a3b8',
  },
  dashboardButton: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  dashboardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});