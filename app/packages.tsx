// app/packages.tsx
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from "expo-router";
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import api from './axiosInstance';
import CustomSidebar from './Sidebar';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Package {
  id: string;
  title: string;
  name: string;
  rating: number;
  description: string;
  quota: string;
  price: string;
  duration: string;
  duration_days?: number;
  features: string[];
  color: string;
  badge: string;
  daily_limit?: string;
}

interface Subscription {
  id: string;
  package_title: string;
  amount: string;
  status: string;
  is_queued: number;
  start_date: string;
  end_date: string;
}

export default function SubscriptionScreen() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [pendingPackage, setPendingPackage] = useState<Package | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [queuedSubscriptions, setQueuedSubscriptions] = useState<Subscription[]>([]);
  const [latestEndDate, setLatestEndDate] = useState<Date | null>(null);
  
  // State for queue confirmation popup
  const [queuePopupVisible, setQueuePopupVisible] = useState(false);
  const [queuePopupData, setQueuePopupData] = useState<any>(null);

  const getPackageColor = (packageTitle: string): string => {
    const title = packageTitle?.toLowerCase() || '';
    if (title.includes('premium')) return '#8B5CF6';
    if (title.includes('max')) return '#F59E0B';
    if (title.includes('cloud')) return '#3B82F6';
    if (title.includes('starter')) return '#10B981';
    if (title.includes('pro')) return '#EF4444';
    return '#3B82F6';
  };

  const getPackageIcon = (title: string): IoniconsName => {
    const name = title?.toLowerCase() || '';
    if (name.includes('premium')) return 'diamond-outline';
    if (name.includes('max')) return 'rocket-outline';
    if (name.includes('cloud')) return 'cloud-outline';
    if (name.includes('starter')) return 'cube-outline';
    return 'star-outline';
  };

  const getDisplayDuration = (pkg: Package): string => {
    if (pkg.duration) return pkg.duration;
    if (pkg.duration_days) return `${pkg.duration_days} days`;
    return 'Flexible';
  };

  const parseFeatures = (features: any): string[] => {
    if (!features) return [];
    if (Array.isArray(features)) return features.filter((f: string) => f && f.trim().length > 0);
    if (typeof features === 'string') {
      try {
        const parsed = JSON.parse(features);
        if (Array.isArray(parsed)) return parsed.filter((f: string) => f && f.trim().length > 0);
      } catch(e) {}
      const lines = features.split('\n');
      const result: string[] = [];
      lines.forEach((line: string) => {
        let cleanedLine = line.replace(/^\d+\.\s*/, '').trim();
        if (cleanedLine) result.push(cleanedLine);
      });
      return result;
    }
    return [];
  };

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const checkLoginStatus = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
      return !!token;
    } catch (error) {
      return false;
    }
  };

  const fetchPackages = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.get('/packages/all');
      
      const data = response.data;
      let packagesArray: any[] = [];
      
      if (data && data.success && data.packages) {
        packagesArray = data.packages;
      } else if (data && Array.isArray(data)) {
        packagesArray = data;
      }
      
      if (packagesArray.length > 0) {
        const formattedPackages = packagesArray.map((pkg: any) => {
          const featuresList = parseFeatures(pkg.features);
          return {
            id: pkg.id?.toString() || '',
            title: pkg.title || pkg.name || 'Package',
            name: pkg.title || pkg.name || 'Package',
            rating: 5,
            description: pkg.description || `${pkg.title || 'Package'} plan`,
            quota: pkg.quota || pkg.daily_limit || 'Daily limit',
            price: pkg.price?.toString() || '0',
            duration: pkg.duration || '30 days',
            duration_days: pkg.duration_days,
            features: featuresList.length > 0 ? featuresList : ['Coming soon', 'More details available'],
            color: getPackageColor(pkg.title || pkg.name || ''),
            badge: '',
            daily_limit: pkg.daily_limit
          };
        });
        
        setPackages(formattedPackages);
      } else {
        setPackages([]);
      }
    } catch (error: any) {
      console.error("Error fetching packages:", error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load packages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserSubscriptions = async (): Promise<void> => {
    try {
      const { data } = await api.get('/payments/my-subscriptions');
      if (data.success && data.subscriptions) {
        const subs = data.subscriptions;
        
        const active = subs.find((sub: Subscription) => 
          sub.status === 'success' && 
          sub.is_queued === 0 && 
          new Date(sub.end_date) > new Date()
        );
        setActiveSubscription(active || null);
        
        const queued = subs.filter((sub: Subscription) => 
          sub.status === 'success' && 
          sub.is_queued === 1 && 
          new Date(sub.start_date) > new Date()
        ).sort((a: Subscription, b: Subscription) => {
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        });
        setQueuedSubscriptions(queued);
        
        if (subs.length > 0) {
          const latest = subs.reduce((latest: Subscription, sub: Subscription) => {
            return new Date(sub.end_date).getTime() > new Date(latest.end_date).getTime() ? sub : latest;
          }, subs[0]);
          setLatestEndDate(new Date(latest.end_date));
        }
      }
    } catch (err) {
      console.error('Fetch subscriptions failed:', err);
    }
  };

  const handleChoosePlan = async (pkg: Package): Promise<void> => {
    const loggedIn = await checkLoginStatus();
    
    if (!loggedIn) {
      setPendingPackage(pkg);
      setAuthModalVisible(true);
      return;
    }

    try {
      const { data } = await api.get('/payments/my-subscriptions');
      const subscriptions = data.subscriptions || [];
      
      let nextStartDate = new Date();
      let lastPlanName: string | null = null;
      let lastPlanEndDate: string | null = null;
      
      if (subscriptions.length > 0) {
        const latestSub = subscriptions.reduce((latest: Subscription, sub: Subscription) => {
          return new Date(sub.end_date).getTime() > new Date(latest.end_date).getTime() ? sub : latest;
        }, subscriptions[0]);
        
        nextStartDate = new Date(latestSub.end_date);
        lastPlanName = latestSub.package_title;
        lastPlanEndDate = nextStartDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      
      const formattedStartDate = nextStartDate.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      
      const endDate = new Date(nextStartDate);
      endDate.setDate(endDate.getDate() + (pkg.duration_days || 30));
      const formattedEndDate = endDate.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      
      const nextBillingDate = new Date(endDate);
      const formattedNextBilling = nextBillingDate.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      const isExistingPlan = subscriptions.length > 0;
      
      // Show queue confirmation popup
      setQueuePopupData({
        pkg,
        isExistingPlan,
        lastPlanName,
        lastPlanEndDate,
        formattedStartDate,
        formattedEndDate,
        formattedNextBilling,
        nextStartDate,
        endDate,
        nextBillingDate
      });
      setQueuePopupVisible(true);
      
    } catch (error) {
      console.error('Error checking subscriptions:', error);
      Alert.alert('Error', 'Could not fetch subscription details. Please try again.');
    }
  };



const handleQueueConfirm = (): void => {
  if (!queuePopupData) return;
  
  const { 
    pkg, 
    isExistingPlan, 
    lastPlanName,
    formattedStartDate,
    formattedEndDate,
    formattedNextBilling,
    nextStartDate,
    endDate,
    nextBillingDate
  } = queuePopupData;
  
  setQueuePopupVisible(false);
  
  // ✅ Navigate to checkout with ALL data including isQueued flag
  router.push({
    pathname: '/checkout',
    params: { 
      package: JSON.stringify({
        ...pkg,
        isQueued: isExistingPlan,  // IMPORTANT: This flag controls the banner
        queueStartDate: formattedStartDate,
        queueEndDate: formattedEndDate,
        queueNextBilling: formattedNextBilling,
        currentPlan: lastPlanName,
        calculatedStartDate: nextStartDate.toISOString(),
        calculatedEndDate: endDate.toISOString(),
        calculatedNextBilling: nextBillingDate.toISOString()
      })
    }
  });
};

  const handleQueueCancel = (): void => {
    setQueuePopupVisible(false);
    setQueuePopupData(null);
  };

  const onRefresh = (): void => {
    setRefreshing(true);
    fetchPackages();
    if (isLoggedIn) {
      fetchUserSubscriptions();
    }
  };

  const toggleFeatureExpand = (packageId: string): void => {
    setExpandedFeatures(prev => ({ ...prev, [packageId]: !prev[packageId] }));
  };

  const handleLoginSuccess = (): void => {
    setAuthModalVisible(false);
    if (pendingPackage) {
      const pkg = pendingPackage;
      setPendingPackage(null);
      fetchUserSubscriptions();
      handleChoosePlan(pkg);
    } else {
      fetchPackages();
    }
  };

  useEffect(() => {
    checkLoginStatus();
    fetchPackages();
    if (isLoggedIn) {
      fetchUserSubscriptions();
    }
  }, [isLoggedIn]);

  const filteredPackages = packages.filter((pkg: Package) =>
    pkg.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pkg.description && pkg.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const SubscriptionBanner = (): React.ReactElement | null => {
    if (!activeSubscription && queuedSubscriptions.length === 0) return null;
    
    return (
      <View style={styles.bannerContainer}>
        {activeSubscription && (
          <View style={styles.activeBanner}>
            <View style={styles.bannerIconContainer}>
              <Feather name="calendar" size={18} color="#16A34A" />
            </View>
            <View style={styles.bannerContent}>
              <Text style={styles.activeBannerTitle}>
                ✅ Active: {activeSubscription.package_title} - ₹{activeSubscription.amount}
              </Text>
              <Text style={styles.activeBannerSubtitle}>
                Valid until {new Date(activeSubscription.end_date).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>
        )}
        
        {queuedSubscriptions.length > 0 && (
          <View style={styles.queuedBanner}>
            <Text style={styles.queuedBannerTitle}>⏳ Queued Plans:</Text>
            {queuedSubscriptions.map((sub: Subscription, index: number) => (
              <View key={sub.id} style={styles.queuedItem}>
                <View style={styles.queuedNumber}>
                  <Text style={styles.queuedNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.queuedContent}>
                  <Text style={styles.queuedPlanName}>{sub.package_title} - ₹{sub.amount}</Text>
                  <Text style={styles.queuedPlanDate}>
                    Starts: {new Date(sub.start_date).toLocaleDateString('en-IN')} | 
                    Ends: {new Date(sub.end_date).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Queue Confirmation Popup Component
  const QueuePopup = (): React.ReactElement | null => {
    if (!queuePopupVisible || !queuePopupData) return null;
    
    const { 
      pkg, 
      isExistingPlan,
      lastPlanName,
      lastPlanEndDate,
      formattedStartDate,
      formattedEndDate,
      formattedNextBilling
    } = queuePopupData;
    
    return (
      <Modal
        visible={queuePopupVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleQueueCancel}
      >
        <TouchableWithoutFeedback onPress={handleQueueCancel}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.queueModalContainer}>
                <View style={styles.queueModalHeader}>
                  <Text style={styles.queueModalTitle}>
                    {isExistingPlan ? '📋 Queue New Plan?' : '✨ Purchase New Plan'}
                  </Text>
                </View>
                
                <ScrollView style={styles.queueModalContent} showsVerticalScrollIndicator={false}>
                  {isExistingPlan && (
                    <View style={styles.queueExistingPlanSection}>
                      <Text style={styles.queueExistingPlanText}>
                        You have an existing plan: <Text style={styles.queueBoldText}>{lastPlanName}</Text>
                      </Text>
                      <Text style={styles.queueExistingPlanText}>
                        It will end on: <Text style={styles.queueBoldText}>{lastPlanEndDate}</Text>
                      </Text>
                    </View>
                  )}
                  
                  <View style={[styles.queueDetailsBox, { backgroundColor: isExistingPlan ? '#E3F2FD' : '#E8F5E9' }]}>
                    <Text style={styles.queueDetailsTitle}>
                      {isExistingPlan ? '🔄 Your New Plan Details:' : '✨ Your New Plan Details:'}
                    </Text>
                    <View style={styles.queueDetailRow}>
                      <Text style={styles.queueDetailLabel}>📅 Start Date:</Text>
                      <Text style={styles.queueDetailValue}>{formattedStartDate}</Text>
                    </View>
                    <View style={styles.queueDetailRow}>
                      <Text style={styles.queueDetailLabel}>📅 End Date:</Text>
                      <Text style={styles.queueDetailValue}>{formattedEndDate}</Text>
                    </View>
                    <View style={styles.queueDetailRow}>
                      <Text style={styles.queueDetailLabel}>💰 Next Billing:</Text>
                      <Text style={styles.queueDetailValue}>{formattedNextBilling}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.queuePurchaseText}>
                    Do you want to purchase <Text style={styles.queueBoldText}>{pkg.title}</Text> for <Text style={styles.queueBoldText}>₹{pkg.price}</Text>?
                  </Text>
                </ScrollView>
                
                <View style={styles.queueModalButtons}>
                  <TouchableOpacity 
                    style={[styles.queueButton, styles.queueCancelButton]}
                    onPress={handleQueueCancel}
                  >
                    <Text style={styles.queueCancelButtonText}>No, Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.queueButton, styles.queueConfirmButton]}
                    onPress={handleQueueConfirm}
                  >
                    <Text style={styles.queueConfirmButtonText}>
                      {isExistingPlan ? 'Yes, Queue It!' : 'Yes, Purchase'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading packages...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Subscription Plans',
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
        }}
      />
      
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
          }
        >
          <View style={styles.header}>
            <Text style={styles.mainTitle}>Subscription Plans</Text>
            <Text style={styles.subtitle}>Choose the perfect plan for your needs</Text>
          </View>

          <SubscriptionBanner />

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search packages..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {filteredPackages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No packages found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchPackages}>
                <Text style={styles.retryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredPackages.map((plan: Package) => {
              const featuresList = plan.features;
              const isExpanded = expandedFeatures[plan.id] || false;
              const visibleFeatures = isExpanded ? featuresList : featuresList.slice(0, 3);
              const hasMoreFeatures = featuresList.length > 3;
              const isCurrentActive = activeSubscription?.package_title === plan.title;
              const isAlreadyQueued = queuedSubscriptions.some((q: Subscription) => q.package_title === plan.title);
              
              return (
                <View key={plan.id} style={styles.cardContainer}>
                  <View style={[
                    styles.card, 
                    { borderTopColor: plan.color, borderTopWidth: 4 },
                    isCurrentActive && styles.activeCard,
                    isAlreadyQueued && styles.queuedCard
                  ]}>
                    {(isCurrentActive || isAlreadyQueued) && (
                      <View style={[
                        styles.badgeContainer,
                        isCurrentActive ? styles.activeBadge : styles.queuedBadge
                      ]}>
                        <Text style={styles.badgeText}>
                          {isCurrentActive ? '✅ CURRENTLY ACTIVE' : '⏳ QUEUED - WILL START LATER'}
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconContainer, { backgroundColor: `${plan.color}10` }]}>
                        <Ionicons name={getPackageIcon(plan.title)} size={32} color={plan.color} />
                      </View>
                      <View style={styles.headerTextContainer}>
                        <Text style={styles.planName}>{plan.title}</Text>
                        <View style={styles.durationContainer}>
                          <Ionicons name="time-outline" size={12} color="#6B7280" />
                          <Text style={styles.durationText}>{getDisplayDuration(plan)}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.priceRow}>
                      <View style={styles.priceItem}>
                        <View style={[styles.iconBadge, { backgroundColor: `${plan.color}10` }]}>
                          <Ionicons name="cash-outline" size={16} color={plan.color} />
                        </View>
                        <View>
                          <Text style={styles.priceLabel}>Price</Text>
                          <Text style={[styles.priceValue, { color: plan.color }]}>₹{formatPrice(plan.price)}</Text>
                        </View>
                      </View>
                      <View style={styles.priceItem}>
                        <View style={[styles.iconBadge, { backgroundColor: `${plan.color}10` }]}>
                          <Ionicons name="calendar-outline" size={16} color={plan.color} />
                        </View>
                        <View>
                          <Text style={styles.priceLabel}>Duration</Text>
                          <Text style={styles.durationValue}>{getDisplayDuration(plan)}</Text>
                        </View>
                      </View>
                    </View>

                    {plan.description && (
                      <View style={[styles.descriptionBox, { backgroundColor: `${plan.color}05` }]}>
                        <Text style={styles.descriptionText} numberOfLines={2}>
                          {plan.description}
                        </Text>
                      </View>
                    )}

                    {featuresList.length > 0 && (
                      <View style={[styles.featuresContainer, { backgroundColor: `${plan.color}05` }]}>
                        <View style={styles.featuresHeader}>
                          <Ionicons name="star-outline" size={14} color="#F59E0B" />
                          <Text style={styles.featuresTitle}>Features</Text>
                        </View>
                        <View style={styles.featuresList}>
                          {visibleFeatures.map((feature: string, index: number) => (
                            <View key={index} style={styles.featureItem}>
                              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                              <Text style={styles.featureText} numberOfLines={2}>
                                {feature}
                              </Text>
                            </View>
                          ))}
                        </View>
                        {hasMoreFeatures && (
                          <TouchableOpacity 
                            style={styles.showMoreButton} 
                            onPress={() => toggleFeatureExpand(plan.id)}
                          >
                            <Text style={[styles.showMoreText, { color: plan.color }]}>
                              {isExpanded ? 'Show less' : `Show more (${featuresList.length - 3} more)`}
                            </Text>
                            <Ionicons 
                              name={isExpanded ? "chevron-up" : "chevron-down"} 
                              size={14} 
                              color={plan.color} 
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.subscribeButton, 
                        { backgroundColor: plan.color },
                        isAlreadyQueued && !isCurrentActive && styles.disabledButton
                      ]}
                      onPress={() => handleChoosePlan(plan)}
                      activeOpacity={0.9}
                      disabled={isAlreadyQueued && !isCurrentActive}
                    >
                      <View style={styles.buttonContent}>
                        <Ionicons name="star" size={18} color="#FCD34D" />
                        <Text style={styles.subscribeButtonText}>
                          {isCurrentActive 
                            ? '📋 Queue Another Plan' 
                            : isAlreadyQueued
                              ? '⏳ Already Queued'
                              : activeSubscription || queuedSubscriptions.length > 0
                                ? '📋 Queue This Plan' 
                                : '✨ Choose Plan'}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Queue Confirmation Popup */}
        <QueuePopup />

        {/* Auth Modal */}
        <Modal
          visible={authModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setAuthModalVisible(false);
            setPendingPackage(null);
          }}
        >
          <TouchableWithoutFeedback onPress={() => {
            setAuthModalVisible(false);
            setPendingPackage(null);
          }}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>🔐 Login Required</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setAuthModalVisible(false);
                        setPendingPackage(null);
                      }}
                      style={styles.modalCloseButton}
                    >
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.modalSubtitle}>
                    Please login to continue with your purchase
                  </Text>
                  
                  <View style={styles.modalButtonsContainer}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.modalCancelButton]}
                      onPress={() => {
                        setAuthModalVisible(false);
                        setPendingPackage(null);
                      }}
                    >
                      <Text style={styles.modalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.modalLoginButton]}
                      onPress={() => {
                        setAuthModalVisible(false);
                        router.push('/LoginScreen');
                      }}
                    >
                      <Text style={styles.modalLoginButtonText}>Login</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.modalSignupButton]}
                      onPress={() => {
                        setAuthModalVisible(false);
                        router.push('/Registeruser');
                      }}
                    >
                      <Text style={styles.modalSignupButtonText}>Sign Up</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

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
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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
  bannerContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderBottomWidth: 0,
  },
  bannerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  bannerContent: {
    flex: 1,
  },
  activeBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 2,
  },
  activeBannerSubtitle: {
    fontSize: 11,
    color: '#15803D',
  },
  queuedBanner: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderTopWidth: 0,
  },
  queuedBannerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 6,
  },
  queuedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  queuedNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  queuedNumberText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
  },
  queuedContent: {
    flex: 1,
  },
  queuedPlanName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E40AF',
  },
  queuedPlanDate: {
    fontSize: 10,
    color: '#3B82F6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 8,
  },
  cardContainer: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  activeCard: {
    borderWidth: 2,
    borderColor: '#4ADE80',
  },
  queuedCard: {
    borderWidth: 2,
    borderColor: '#60A5FA',
  },
  badgeContainer: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
    alignItems: 'center',
  },
  activeBadge: {
    backgroundColor: '#22C55E',
  },
  queuedBadge: {
    backgroundColor: '#3B82F6',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  descriptionBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  featuresContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  featuresTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  subscribeButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Auth Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalCancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  modalLoginButton: {
    backgroundColor: '#3B82F6',
  },
  modalLoginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSignupButton: {
    backgroundColor: '#10B981',
  },
  modalSignupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Queue Popup Styles
  queueModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  queueModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  queueModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  queueModalContent: {
    marginBottom: 16,
  },
  queueExistingPlanSection: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  queueExistingPlanText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 4,
  },
  queueDetailsBox: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  queueDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  queueDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  queueDetailLabel: {
    fontSize: 13,
    color: '#475569',
  },
  queueDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  queuePurchaseText: {
    fontSize: 15,
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 4,
  },
  queueBoldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  queueModalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  queueButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  queueCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  queueCancelButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  queueConfirmButton: {
    backgroundColor: '#3085D6',
  },
  queueConfirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});