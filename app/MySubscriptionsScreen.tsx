import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import api from './axiosInstance';
import CustomSidebar from './Sidebar';
import PaymentHistoryModal from './PaymentHistoryModal';

const { width, height } = Dimensions.get('window');

interface SubscriptionData {
    id: string;
    package_id: string;
    package_title: string;
    description?: string;
    amount: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'pending' | 'expired' | 'success';
    is_queued?: number;
    is_recurring?: number;
    next_billing_date?: string;
    features?: string[] | string;
    total_images?: number;
    used_images?: number;
}

interface PackageDetails {
    id: string;
    title: string;
    description: string;
    amount: number;
    features: string[];
    duration_days: number;
}

export default function MySubscriptionsScreen() {
    const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [isSidebarEnabled, setIsSidebarEnabled] = useState(false);
    const [cancelLoading, setCancelLoading] = useState<string | null>(null);

    // Modal states
    const [selectedSub, setSelectedSub] = useState<SubscriptionData | null>(null);
    const [packageDetails, setPackageDetails] = useState<PackageDetails | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [paymentHistoryUserId, setPaymentHistoryUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('');
    const [userEmail, setUserEmail] = useState<string>('');

    // Check sidebar visibility
    const checkSidebarVisibility = async () => {
        try {
            const storedUser = await AsyncStorage.getItem('userData');
            let parsedUser = null;
            if (storedUser) {
                parsedUser = JSON.parse(storedUser);
                setUserName(parsedUser?.name || '');
                setUserEmail(parsedUser?.email || '');
            }
            const userId = parsedUser?.id;
            setPaymentHistoryUserId(userId);

            if (userId) {
                let hasActiveSubscription = false;
                try {
                    const activeResponse = await api.get(`/payments/active-subscription?user_id=${userId}`);
                    if (activeResponse.data?.success) {
                        const subscriptions = activeResponse.data.subscriptions ||
                            (activeResponse.data.activeSubscription ? [activeResponse.data.activeSubscription] : []);
                        hasActiveSubscription = subscriptions.some((sub: any) =>
                            sub.status === 'success' || sub.status === 'active'
                        );
                    }
                } catch (error) {
                    console.log('Active subscription check error:', error);
                }

                // Check business data
                const hasBusinessData = await checkBusinessData(userId);

                const shouldEnableSidebar = hasActiveSubscription && hasBusinessData;
                setIsSidebarEnabled(shouldEnableSidebar);
                return shouldEnableSidebar;
            }
        } catch (error) {
            console.log('Sidebar visibility check error:', error);
        }
        return false;
    };

    // Check if user has business data
    const checkBusinessData = async (userId: string) => {
        if (!userId) return false;

        try {
            const response = await api.get(`/business-data/has/${userId}`);
            return response.data?.hasData === true;
        } catch (error: any) {
            console.log('Business data check error:', error?.response?.data || error);
            return false;
        }
    };

    // Fetch subscriptions
    const fetchSubscriptions = async () => {
        try {
            setLoading(true);

            const token = await AsyncStorage.getItem('userToken');
            const storedUser = await AsyncStorage.getItem('userData');

            if (!token) {
                Alert.alert(
                    'Session Expired',
                    'Please login again',
                    [{ text: 'OK', onPress: () => router.replace('/LoginScreen') }]
                );
                return;
            }

            let parsedUser = null;
            if (storedUser) {
                parsedUser = JSON.parse(storedUser);
                setUserName(parsedUser?.name || '');
                setUserEmail(parsedUser?.email || '');
            }

            const userId = parsedUser?.id;
            setPaymentHistoryUserId(userId);

            if (!userId) {
                setLoading(false);
                return;
            }

            // FETCH FROM MY-SUBSCRIPTIONS
            try {
                const response = await api.get(`/payments/my-subscriptions?user_id=${userId}`);
                console.log('MY SUBSCRIPTIONS:', response.data);

                if (response.data.success && response.data.subscriptions) {
                    const subs = response.data.subscriptions;

                    // Sort subscriptions: active first, then queued
                    const sortedSubs = subs.sort((a: any, b: any) => {
                        if (a.is_queued !== b.is_queued) return a.is_queued - b.is_queued;
                        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
                    });

                    setSubscriptions(sortedSubs);
                } else {
                    setSubscriptions([]);
                }
            } catch (error) {
                console.log('All subscriptions fetch error:', error);
                setSubscriptions([]);
            }

        } catch (error: any) {
            console.error('Subscriptions error:', error);
            if (error.response?.status === 401) {
                await AsyncStorage.removeItem('userToken');
                await AsyncStorage.removeItem('userData');
                router.replace('/LoginScreen');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCancelSubscription = (subscriptionId: string) => {
        console.log("🔵 Cancel button pressed for:", subscriptionId);
        setSelectedSubscriptionId(subscriptionId);
        setCancelModalVisible(true);
    };

    const cancelSubscriptionAPI = async (subscriptionId: string) => {
        console.log("🔄 Starting API call for:", subscriptionId);
        setCancelLoading(subscriptionId);

        try {
            const token = await AsyncStorage.getItem('userToken');
            console.log("🔑 Token:", token ? "Available" : "Not available");

            if (!token) {
                Alert.alert("Error", "Please login again");
                setCancelLoading(null);
                return;
            }

            // ✅ Using axiosInstance instead of hardcoded URL
            const response = await api.post(`/payments/cancel-subscription/${subscriptionId}`);
            
            console.log("✅ Response data:", response.data);

            if (response.data.success) {
                Alert.alert("Success", response.data.message || "Auto-renewal cancelled successfully");
                await fetchSubscriptions();
                await checkSidebarVisibility();
            } else {
                Alert.alert("Error", response.data.message || "Failed to cancel");
            }
        } catch (error: any) {
            console.log("❌ Error:", error);
            Alert.alert(
                "Error", 
                error.response?.data?.message || error.message || "Failed to cancel subscription"
            );
        } finally {
            console.log("🔵 Setting cancelLoading to null");
            setCancelLoading(null);
        }
    };

    // Handle subscription click - show details modal
    const handleSubscriptionClick = async (sub: SubscriptionData) => {
        if (sub.status === 'success' || sub.status === 'active') {
            setSelectedSub(sub);
            setModalVisible(true);
            setModalLoading(true);
            try {
                const response = await api.get(`/packages/${sub.package_id}`);
                if (response.data.success) {
                    setPackageDetails(response.data.package);
                } else {
                    setPackageDetails(null);
                }
            } catch (err) {
                Alert.alert('Error', 'Could not load package features');
                setPackageDetails(null);
            } finally {
                setModalLoading(false);
            }
        }
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedSub(null);
        setPackageDetails(null);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchSubscriptions();
        checkSidebarVisibility();
    };

    const handleBuyNewPlan = () => {
        router.push('/packages');
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatFullDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        if (status === 'success' || status === 'active') return '#10B981';
        if (status === 'pending') return '#F59E0B';
        return '#EF4444';
    };

    const getStatusText = (status: string) => {
        if (status === 'success' || status === 'active') return 'Active';
        if (status === 'pending') return 'Pending';
        return 'Expired';
    };

    const getRemainingDays = (endDate: string) => {
        const end = new Date(endDate);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    };

    const getProgressPercent = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.min(totalDays, Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))));
        return totalDays > 0 ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : 0;
    };

    // Get features array
    const getFeatures = (sub: SubscriptionData): string[] => {
        if (!sub.features) return [];
        if (Array.isArray(sub.features)) return sub.features;
        if (typeof sub.features === 'string') {
            return sub.features.split('\n').filter(f => f.trim());
        }
        return [];
    };

    // useEffect for initial data load
    useFocusEffect(
        useCallback(() => {
            console.log('📱 MySubscriptions focused');
            fetchSubscriptions();
            checkSidebarVisibility();
        }, [])
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading subscriptions...</Text>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen options={{
                headerShown: true,
                title: 'My Subscriptions',
                headerTitleStyle: styles.headerTitle,
                headerLeft: () => (
                    isSidebarEnabled ? (
                        <TouchableOpacity
                            onPress={() => setSidebarVisible(true)}
                            style={styles.menuButton}
                        >
                            <Ionicons name="menu" size={30} color="#6366f1" />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )
                ),
                headerRight: () => (
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert(
                                "Logout",
                                "Are you sure you want to logout?",
                                [
                                    {
                                        text: "No",
                                        style: "cancel",
                                        onPress: () => console.log("Logout cancelled")
                                    },
                                    {
                                        text: "Yes",
                                        style: "destructive",
                                        onPress: async () => {
                                            try {
                                                console.log("Logging out...");
                                                await AsyncStorage.removeItem("userToken");
                                                await AsyncStorage.removeItem("userData");
                                                router.replace("/LoginScreen");
                                            } catch (error) {
                                                console.log("Logout Error:", error);
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                        style={styles.logoutButton}
                    >
                        <Ionicons name="log-out-outline" size={26} color="#EF4444" />
                    </TouchableOpacity>
                ),
            }} />

            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#6366f1']}
                        />
                    }
                >
                    {/* Subscriptions Card */}
                    <View style={styles.subscriptionsCard}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleContainer}>
                                <Ionicons name="layers-outline" size={22} color="#6366f1" />
                                <Text style={styles.sectionTitle}>Your Subscriptions</Text>
                            </View>
                            {subscriptions.length > 0 && (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{subscriptions.length}</Text>
                                </View>
                            )}
                        </View>

                        {subscriptions.length === 0 ? (
                            <View style={styles.noPlanContainer}>
                                <Ionicons name="card-outline" size={48} color="#94A3B8" />
                                <Text style={styles.noPlanText}>No subscriptions found</Text>
                                <Text style={styles.noPlanSubtext}>
                                    Purchase a plan to access premium features
                                </Text>
                                <TouchableOpacity style={styles.browseButton} onPress={handleBuyNewPlan}>
                                    <Text style={styles.browseButtonText}>Browse Packages</Text>
                                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.subscriptionsList}>
                                {subscriptions.map((sub, index) => {
                                    const isActive = sub.status === 'success' && sub.is_queued === 0 && new Date(sub.end_date) > new Date();
                                    const isQueued = sub.is_queued === 1 && new Date(sub.start_date) > new Date();
                                    const isPending = sub.status === 'pending';
                                    const isRecurring = sub.is_recurring === 1;
                                    const canCancel = (isActive || isQueued) && isRecurring;

                                    const remainingDays = isActive ? getRemainingDays(sub.end_date) : 0;
                                    const progressPercent = isActive ? getProgressPercent(sub.start_date, sub.end_date) : 0;

                                    // Next billing date
                                    let displayNextBillingDate = null;
                                    if (isRecurring) {
                                        if (sub.next_billing_date) {
                                            displayNextBillingDate = formatDate(sub.next_billing_date);
                                        } else if (isQueued && sub.end_date) {
                                            displayNextBillingDate = formatDate(sub.end_date);
                                        }
                                    }

                                    const features = getFeatures(sub);

                                    return (
                                        <TouchableOpacity
                                            key={sub.id}
                                            style={[
                                                styles.subscriptionItem,
                                                isActive && styles.activeSubscription,
                                                isQueued && styles.queuedSubscription,
                                                isPending && styles.pendingSubscription,
                                                index === subscriptions.length - 1 && styles.lastItem
                                            ]}
                                            onPress={() => handleSubscriptionClick(sub)}
                                            activeOpacity={0.7}
                                        >
                                            {/* Header with Title and Status */}
                                            <View style={styles.subscriptionHeader}>
                                                <View style={styles.planIconContainer}>
                                                    <Ionicons
                                                        name={isActive ? "checkmark-circle" : isQueued ? "time-outline" : "alert-circle-outline"}
                                                        size={22}
                                                        color={isActive ? "#10B981" : isQueued ? "#3B82F6" : "#F59E0B"}
                                                    />
                                                </View>
                                                <View style={styles.planInfo}>
                                                    <Text style={styles.planTitle}>{sub.package_title}</Text>
                                                    <Text style={styles.planDescription} numberOfLines={1}>
                                                        {sub.description || 'Premium plan'}
                                                    </Text>
                                                </View>
                                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sub.status) + '20' }]}>
                                                    <Text style={[styles.statusText, { color: getStatusColor(sub.status) }]}>
                                                        {isActive ? 'ACTIVE' : isQueued ? 'QUEUED' : isPending ? 'PENDING' : 'INACTIVE'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Start & End Date */}
                                            <View style={styles.dateGrid}>
                                                <View style={styles.dateCard}>
                                                    <Text style={styles.dateLabel}>START DATE</Text>
                                                    <Text style={styles.dateValue}>{formatDate(sub.start_date)}</Text>
                                                </View>
                                                <View style={styles.dateCard}>
                                                    <Text style={styles.dateLabel}>END DATE</Text>
                                                    <Text style={styles.dateValue}>{formatDate(sub.end_date)}</Text>
                                                </View>
                                            </View>

                                            {/* Progress Bar - ONLY for Active */}
                                            {isActive && (
                                                <View style={styles.progressContainer}>
                                                    <View style={styles.progressHeader}>
                                                        <Text style={styles.progressLabel}>Plan Progress</Text>
                                                        <Text style={[styles.progressDays, { color: remainingDays < 7 ? '#EF4444' : '#10B981' }]}>
                                                            {remainingDays} days remaining
                                                        </Text>
                                                    </View>
                                                    <View style={styles.progressBar}>
                                                        <View
                                                            style={[
                                                                styles.progressFill,
                                                                {
                                                                    width: `${progressPercent}%`,
                                                                    backgroundColor: progressPercent > 80 ? '#EF4444' : '#10B981'
                                                                }
                                                            ]}
                                                        />
                                                    </View>
                                                </View>
                                            )}

                                            {/* Queued Message */}
                                            {isQueued && (
                                                <View style={styles.queuedCard}>
                                                    <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
                                                    <Text style={styles.queuedText}>
                                                        This plan is queued and will activate on <Text style={styles.queuedDate}>{formatFullDate(sub.start_date)}</Text>
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Price & Next Billing */}
                                            <View style={styles.priceGrid}>
                                                <View style={styles.priceCard}>
                                                    <Text style={styles.priceLabel}>Plan Price</Text>
                                                    <Text style={styles.priceValue}>₹{sub.amount}</Text>
                                                </View>

                                                {isRecurring && displayNextBillingDate && (
                                                    <View style={styles.billingCard}>
                                                        <Text style={styles.billingLabel}>Next Auto Payment</Text>
                                                        <Text style={styles.billingValue}>₹{sub.amount} on {displayNextBillingDate}</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Features */}
                                            {features.length > 0 && (
                                                <View style={styles.featuresContainer}>
                                                    <Text style={styles.featuresTitle}>
                                                        <Ionicons name="sparkles-outline" size={12} color="#94A3B8" /> What's included
                                                    </Text>
                                                    <View style={styles.featuresList}>
                                                        {features.slice(0, 4).map((feat, idx) => (
                                                            <View key={idx} style={styles.featureItem}>
                                                                <Ionicons name="ellipse" size={6} color="#6366f1" />
                                                                <Text style={styles.featureText} numberOfLines={1}>{feat}</Text>
                                                            </View>
                                                        ))}
                                                        {features.length > 4 && (
                                                            <Text style={styles.moreFeatures}>+{features.length - 4} more features</Text>
                                                        )}
                                                    </View>
                                                </View>
                                            )}

                                            {/* Cancel Button */}
                                            {canCancel && (
                                                <View style={styles.cancelContainer}>
                                                    <View style={styles.renewalBadge}>
                                                        <Ionicons name="refresh-outline" size={12} color="#6366f1" />
                                                        <Text style={styles.renewalText}>
                                                            {isActive ? 'Auto-renews monthly' : 'Auto-renewal will apply when plan starts'}
                                                        </Text>
                                                    </View>
                                                    <Pressable
                                                        style={styles.cancelButton}
                                                        onPress={() => handleCancelSubscription(sub.id)}
                                                        disabled={cancelLoading === sub.id}
                                                    >
                                                        {cancelLoading === sub.id ? (
                                                            <ActivityIndicator size="small" color="#EF4444" />
                                                        ) : (
                                                            <>
                                                                <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                                                                <Text style={styles.cancelButtonText}>Cancel Auto-Renewal</Text>
                                                            </>
                                                        )}
                                                    </Pressable>
                                                </View>
                                            )}

                                            {isPending && (
                                                <TouchableOpacity style={styles.pendingButton}>
                                                    <Text style={styles.pendingButtonText}>Complete Payment</Text>
                                                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                                                </TouchableOpacity>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Payment History Button */}
                    {!loading && subscriptions.length > 0 && (
                        <TouchableOpacity
                            style={styles.paymentHistoryButton}
                            onPress={() => {
                                if (paymentHistoryUserId) {
                                    setShowPaymentHistory(true);
                                } else {
                                    Alert.alert('Error', 'User ID not found');
                                }
                            }}
                        >
                            <LinearGradient
                                colors={['#6366f1', '#8B5CF6']}
                                style={styles.paymentHistoryGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <View style={styles.paymentHistoryContent}>
                                    <View style={styles.paymentHistoryIconContainer}>
                                        <Ionicons name="document-text-outline" size={24} color="#fff" />
                                    </View>
                                    <View style={styles.paymentHistoryTextContainer}>
                                        <Text style={styles.paymentHistoryTitle}>Payment History</Text>
                                        <Text style={styles.paymentHistorySubtitle}>View all your transactions</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Buy New Plan Button */}
                    {subscriptions.length > 0 && (
                        <TouchableOpacity
                            style={styles.buyNewPlanButton}
                            onPress={handleBuyNewPlan}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#fff" />
                            <Text style={styles.buyNewPlanText}>Buy New Plan</Text>
                        </TouchableOpacity>
                    )}

                </ScrollView>
            </SafeAreaView>

            {/* Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {modalLoading ? (
                            <View style={styles.modalLoadingContainer}>
                                <ActivityIndicator size="large" color="#6366f1" />
                                <Text style={styles.modalLoadingText}>Loading plan details...</Text>
                            </View>
                        ) : (
                            <>
                                <LinearGradient
                                    colors={['#6366f1', '#8B5CF6']}
                                    style={styles.modalHeader}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <View style={styles.modalHeaderContent}>
                                        <View style={styles.modalPlanIcon}>
                                            <Ionicons name="diamond-outline" size={24} color="#fff" />
                                        </View>
                                        <View style={styles.modalTitleContainer}>
                                            <Text style={styles.modalTitle}>{packageDetails?.title || selectedSub?.package_title}</Text>
                                            <Text style={styles.modalSubtitle}>{packageDetails?.description || 'Premium subscription plan'}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                                        <Ionicons name="close" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </LinearGradient>

                                <ScrollView style={styles.modalBody}>
                                    <View style={styles.modalStatsGrid}>
                                        <View style={styles.modalStatCard}>
                                            <Text style={styles.modalStatLabel}>Amount</Text>
                                            <Text style={styles.modalStatValue}>₹{selectedSub?.amount}</Text>
                                        </View>
                                        <View style={styles.modalStatCard}>
                                            <Text style={styles.modalStatLabel}>Status</Text>
                                            <View style={[styles.modalStatBadge, { backgroundColor: '#10B98120' }]}>
                                                <Text style={[styles.modalStatBadgeText, { color: '#10B981' }]}>Active</Text>
                                            </View>
                                        </View>
                                        <View style={styles.modalStatCard}>
                                            <Text style={styles.modalStatLabel}>Started</Text>
                                            <Text style={styles.modalStatDate}>{selectedSub && formatDate(selectedSub.start_date)}</Text>
                                        </View>
                                        <View style={styles.modalStatCard}>
                                            <Text style={styles.modalStatLabel}>Expires</Text>
                                            <Text style={styles.modalStatDate}>{selectedSub && formatDate(selectedSub.end_date)}</Text>
                                        </View>
                                    </View>

                                    {packageDetails?.features && packageDetails.features.length > 0 && (
                                        <View style={styles.modalFeaturesSection}>
                                            <View style={styles.modalFeaturesHeader}>
                                                <Ionicons name="gift-outline" size={18} color="#6366f1" />
                                                <Text style={styles.modalFeaturesTitle}>What's included</Text>
                                            </View>
                                            <View style={styles.modalFeaturesList}>
                                                {packageDetails.features.map((feature, idx) => (
                                                    <View key={idx} style={styles.modalFeatureItem}>
                                                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                                        <Text style={styles.modalFeatureText}>{feature}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.modalFooter}>
                                        <Ionicons name="shield-checkmark" size={14} color="#94A3B8" />
                                        <Text style={styles.modalFooterText}>Secured by Razorpay</Text>
                                    </View>
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Cancel Confirmation Modal */}
            <Modal
                visible={cancelModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setCancelModalVisible(false)}
            >
                <View style={styles.cancelModalOverlay}>
                    <View style={styles.cancelModalContainer}>
                        <Ionicons
                            name="warning-outline"
                            size={50}
                            color="#EF4444"
                        />
                        <Text style={styles.cancelModalTitle}>
                            Cancel Auto-Renewal?
                        </Text>
                        <Text style={styles.cancelModalText}>
                            Your plan will remain active until its expiry date,
                            but auto-renewal will be disabled.
                        </Text>
                        <View style={styles.cancelModalButtons}>
                            <TouchableOpacity
                                style={styles.keepButton}
                                onPress={() => setCancelModalVisible(false)}
                            >
                                <Text style={styles.keepButtonText}>
                                    No, Keep It
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmCancelButton}
                                onPress={() => {
                                    setCancelModalVisible(false);
                                    if (selectedSubscriptionId) {
                                        cancelSubscriptionAPI(selectedSubscriptionId);
                                    }
                                }}
                            >
                                <Text style={styles.confirmCancelButtonText}>
                                    Yes, Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Payment History Modal */}
            <PaymentHistoryModal
                isOpen={showPaymentHistory}
                onClose={() => setShowPaymentHistory(false)}
                userId={paymentHistoryUserId || ''}
                userName={userName}
                userEmail={userEmail}
            />

            {/* SIDEBAR */}
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
    menuButton: {
        marginLeft: 16,
        padding: 4,
    },
    logoutButton: {
        marginRight: 16,
        padding: 4,
    },
    subscriptionsCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
    },
    countBadge: {
        backgroundColor: '#6366f120',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366f1',
    },
    subscriptionsList: {
        gap: 12,
    },
    subscriptionItem: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    activeSubscription: {
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
    },
    queuedSubscription: {
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    pendingSubscription: {
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    lastItem: {
        marginBottom: 0,
    },
    subscriptionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    planIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    planInfo: {
        flex: 1,
    },
    planTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    planDescription: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginLeft: 4,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    dateGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    dateCard: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    dateLabel: {
        fontSize: 8,
        fontWeight: '600',
        color: '#6366f1',
        letterSpacing: 0.5,
    },
    dateValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1E293B',
        marginTop: 2,
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    progressLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: '#64748B',
    },
    progressDays: {
        fontSize: 10,
        fontWeight: '600',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    queuedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EFF6FF',
        padding: 10,
        borderRadius: 10,
        marginBottom: 12,
    },
    queuedText: {
        fontSize: 11,
        color: '#3B82F6',
        flex: 1,
    },
    queuedDate: {
        fontWeight: '700',
    },
    priceGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    priceCard: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 2,
    },
    billingCard: {
        flex: 1,
        backgroundColor: '#EEF2FF',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    billingLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#6366f1',
        letterSpacing: 0.5,
    },
    billingValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6366f1',
        marginTop: 2,
    },
    featuresContainer: {
        marginBottom: 12,
    },
    featuresTitle: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    featuresList: {
        gap: 4,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    featureText: {
        fontSize: 11,
        color: '#475569',
        flex: 1,
    },
    moreFeatures: {
        fontSize: 10,
        color: '#6366f1',
        marginLeft: 12,
        fontWeight: '500',
    },
    cancelContainer: {
        marginTop: 4,
    },
    renewalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    renewalText: {
        fontSize: 10,
        color: '#6366f1',
        fontWeight: '500',
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        paddingVertical: 10,
        borderRadius: 12,
    },
    cancelButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#EF4444',
    },
    pendingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F59E0B',
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 8,
    },
    pendingButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    noPlanContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    noPlanText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#475569',
        marginTop: 12,
        marginBottom: 4,
    },
    noPlanSubtext: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 16,
        textAlign: 'center',
    },
    browseButton: {
        marginTop: 8,
        backgroundColor: '#6366f1',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    browseButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    paymentHistoryButton: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    paymentHistoryGradient: {
        padding: 16,
        borderRadius: 16,
    },
    paymentHistoryContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentHistoryIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    paymentHistoryTextContainer: {
        flex: 1,
    },
    paymentHistoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    paymentHistorySubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    buyNewPlanButton: {
        backgroundColor: '#6366f1',
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buyNewPlanText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    // Cancel Modal Styles
    cancelModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    cancelModalContainer: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    cancelModalTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 10,
        color: '#111827',
    },
    cancelModalText: {
        textAlign: 'center',
        fontSize: 15,
        color: '#6B7280',
        lineHeight: 22,
        marginBottom: 24,
    },
    cancelModalButtons: {
        flexDirection: 'row',
        width: '100%',
    },
    keepButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#E5E7EB',
        marginRight: 8,
        alignItems: 'center',
    },
    keepButtonText: {
        fontWeight: '600',
        color: '#374151',
    },
    confirmCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        marginLeft: 8,
        alignItems: 'center',
    },
    confirmCancelButtonText: {
        color: '#fff',
        fontWeight: '700',
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
        width: width - 32,
        maxHeight: height * 0.85,
        overflow: 'hidden',
    },
    modalLoadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    modalLoadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
    },
    modalHeader: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    modalHeaderContent: {
        flex: 1,
        flexDirection: 'row',
        gap: 12,
    },
    modalPlanIcon: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitleContainer: {
        flex: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBody: {
        padding: 20,
    },
    modalStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    modalStatCard: {
        flex: 1,
        minWidth: (width - 80) / 4,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalStatLabel: {
        fontSize: 10,
        color: '#64748B',
        marginBottom: 4,
    },
    modalStatValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    modalStatDate: {
        fontSize: 11,
        fontWeight: '500',
        color: '#1E293B',
    },
    modalStatBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    modalStatBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    modalFeaturesSection: {
        marginBottom: 16,
    },
    modalFeaturesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    modalFeaturesTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    modalFeaturesList: {
        gap: 8,
    },
    modalFeatureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 10,
    },
    modalFeatureText: {
        flex: 1,
        fontSize: 13,
        color: '#475569',
    },
    modalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    modalFooterText: {
        fontSize: 11,
        color: '#94A3B8',
    },
});