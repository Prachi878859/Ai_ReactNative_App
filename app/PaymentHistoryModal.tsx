// PaymentHistoryModal.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import api from './axiosInstance';
import { generateInvoicePDF } from './utils/InvoicePDF';


const { width, height } = Dimensions.get('window');

interface Payment {
    id: string;
    user_id: string;
    package_id: string;
    package_title: string;
    amount: number;
    status: 'success' | 'pending' | 'failed' | 'cancelled';
    original_status?: string;
    payment_status?: string;
    payment_id: string;
    razorpay_subscription_id: string;
    created_at: string;
    start_date?: string;
    end_date?: string;
    duration_type?: string;
    social_media_addons?: Array<{ platform: string }>;
    invoice_no?: string;
    user_name?: string;
    user_email?: string;
    is_recurring?: boolean;
    next_billing_date?: string;
}

interface ActiveSubscription {
    id: string;
    package_title: string;
    amount: number;
    next_billing_date: string;
    user_name?: string;
    user_email?: string;
    start_date?: string;
    end_date?: string;
}

interface PaymentHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName?: string;
    userEmail?: string;
}

export default function PaymentHistoryModal({
    isOpen,
    onClose,
    userId,
    userName,
    userEmail
}: PaymentHistoryModalProps) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            fetchPaymentHistory();
            fetchActiveSubscription();
        }
    }, [isOpen, userId]);

    const fetchPaymentHistory = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Error', 'Please login again');
                setLoading(false);
                return;
            }

            const response = await api.get('/payments/payment-history');
            console.log('Payment history response:', response.data);

            if (response.data.success && response.data.paymentHistory) {
                setPayments(response.data.paymentHistory);
            } else {
                setPayments([]);
            }
        } catch (error: any) {
            console.error('Payment history error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to fetch payment history');
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveSubscription = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await api.get('/payments/active-subscription');
            console.log('Active subscription response:', response.data);

            if (response.data.success && response.data.activeSubscription) {
                setActiveSubscription(response.data.activeSubscription);
            }
        } catch (error: any) {
            console.error('Failed to fetch active subscription:', error);
        }
    };

    const isPaymentSuccessful = (payment: Payment): boolean => {
        return payment.status === 'success' ||
            payment.original_status === 'success' ||
            payment.payment_status === 'success';
    };

    const getStatusBadge = (payment: Payment) => {
        const isSuccess = isPaymentSuccessful(payment);

        if (isSuccess) {
            return {
                text: 'Completed',
                color: '#10B981',
                bgColor: '#D1FAE5',
                icon: 'checkmark-circle'
            };
        } else if (payment.status === 'pending' || payment.original_status === 'pending') {
            return {
                text: 'Pending',
                color: '#F59E0B',
                bgColor: '#FEF3C7',
                icon: 'time-outline'
            };
        } else if (payment.status === 'cancelled' || payment.original_status === 'cancelled') {
            return {
                text: 'Cancelled',
                color: '#EF4444',
                bgColor: '#FEE2E2',
                icon: 'close-circle'
            };
        }
        return {
            text: payment.status || 'N/A',
            color: '#94A3B8',
            bgColor: '#F1F5F9',
            icon: 'help-circle'
        };
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDaysRemaining = (nextBillingDate: string): number | null => {
        if (!nextBillingDate) return null;
        const days = Math.ceil((new Date(nextBillingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    };

    const handleDownloadInvoice = async (payment: Payment) => {
        try {
            setDownloading(payment.id);

            const storedUser = await AsyncStorage.getItem('userData');
            let userData = null;

            if (storedUser) {
                userData = JSON.parse(storedUser);
            }

            const cleanPaymentData = {
                ...payment,
                user_name:
                    userName ||
                    payment.user_name ||
                    userData?.name ||
                    `Client ID: ${userId}`,

                user_email:
                    userEmail ||
                    payment.user_email ||
                    userData?.email ||
                    '',
            };

            await generateInvoicePDF(payment);

        } catch (error) {
            console.log('Invoice Error:', error);
            Alert.alert('Error', 'Failed to generate invoice');
        } finally {
            setDownloading(null);
        }
    };

    const getPaymentCardStyle = (payment: Payment) => {
        const isSuccess = isPaymentSuccessful(payment);
        if (isSuccess && payment.end_date && new Date(payment.end_date) > new Date()) {
            return styles.cardActive;
        } else if (isSuccess) {
            return styles.cardSuccess;
        } else if (payment.status === 'pending' || payment.original_status === 'pending') {
            return styles.cardPending;
        }
        return styles.cardDefault;
    };

    return (
        <Modal
            visible={isOpen}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#6366f1" />

                {/* Header */}
                <LinearGradient
                    colors={['#6366f1', '#8B5CF6']}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <View style={styles.headerIconContainer}>
                            <Ionicons name="document-text-outline" size={22} color="#fff" />
                        </View>
                        <View>
                            <Text style={styles.headerTitle}>Payment History</Text>
                            <Text style={styles.headerSubtitle}>Complete transaction history</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight} />
                </LinearGradient>

                {/* Content */}
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.contentContainer}
                >
                    {/* Active Subscription Highlight */}
                    {activeSubscription && (
                        <View style={styles.activeSubscriptionContainer}>
                            <LinearGradient
                                colors={['#EEF2FF', '#F5F3FF']}
                                style={styles.activeSubscriptionCard}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.activeSubscriptionHeader}>
                                    <View style={styles.activeSubscriptionIcon}>
                                        <Ionicons name="sync" size={20} color="#6366f1" />
                                    </View>
                                    <View style={styles.activeSubscriptionInfo}>
                                        <View style={styles.activePlanRow}>
                                            <Text style={styles.activePlanLabel}>Current Active Plan</Text>
                                            {activeSubscription.next_billing_date &&
                                                getDaysRemaining(activeSubscription.next_billing_date) !== null &&
                                                getDaysRemaining(activeSubscription.next_billing_date)! <= 8 && (
                                                    <View style={styles.renewalBadge}>
                                                        <Ionicons name="notifications" size={10} color="#D97706" />
                                                        <Text style={styles.renewalBadgeText}>Renewal Soon</Text>
                                                    </View>
                                                )}
                                        </View>
                                        <Text style={styles.activePlanTitle}>{activeSubscription.package_title}</Text>
                                        <Text style={styles.activePlanAmount}>₹{activeSubscription.amount}</Text>
                                    </View>
                                    <View style={styles.activeSubscriptionNext}>
                                        <Text style={styles.nextPaymentLabel}>Next Auto-Payment</Text>
                                        <Text style={styles.nextPaymentDate}>
                                            {formatDate(activeSubscription.next_billing_date)}
                                        </Text>
                                        {activeSubscription.next_billing_date && (
                                            <Text style={styles.daysRemaining}>
                                                {getDaysRemaining(activeSubscription.next_billing_date)} days remaining
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>
                    )}

                    {/* Payment History List */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#6366f1" />
                            <Text style={styles.loadingText}>Loading payment history...</Text>
                        </View>
                    ) : payments.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
                            </View>
                            <Text style={styles.emptyTitle}>No Payment History</Text>
                            <Text style={styles.emptySubtitle}>
                                Your payment transactions will appear here
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.paymentsList}>
                            {payments.map((payment) => {
                                const statusBadge = getStatusBadge(payment);
                                const isSuccess = isPaymentSuccessful(payment);
                                const cardStyle = getPaymentCardStyle(payment);

                                return (
                                    <View key={payment.id} style={[styles.paymentCard, cardStyle]}>
                                        // Replace the paymentCardHeader section where payment.is_recurring is used:

<View style={styles.paymentCardHeader}>
    <View style={styles.paymentCardLeft}>
        <View style={[
            styles.paymentIconContainer,
            isSuccess ? styles.paymentIconSuccess : styles.paymentIconDefault
        ]}>
            <Ionicons
                name="cash-outline"
                size={18}
                color={isSuccess ? '#059669' : '#64748B'}
            />
        </View>
        <View>
            <Text style={styles.paymentTitle}>{payment.package_title}</Text>
            <View style={styles.paymentMeta}>
                <View style={styles.paymentMetaItem}>
                    <Ionicons name="calendar-outline" size={10} color="#94A3B8" />
                    <Text style={styles.paymentMetaText}>
                        {formatDate(payment.created_at)}
                    </Text>
                </View>
                {Boolean(payment.is_recurring) && (
                    <View style={styles.recurringBadge}>
                        <Ionicons name="sync-outline" size={10} color="#6366f1" />
                        <Text style={styles.recurringBadgeText}>Auto-renewal</Text>
                    </View>
                )}
            </View>
        </View>
    </View>
    <View style={styles.paymentCardRight}>
        <Text style={styles.paymentAmount}>₹{payment.amount}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bgColor }]}>
            <Ionicons name={statusBadge.icon as any} size={12} color={statusBadge.color} />
            <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                {statusBadge.text}
            </Text>
        </View>
    </View>
</View>

                                      {Boolean(payment.is_recurring) && (
    <View style={styles.recurringBadge}>
        <Ionicons name="sync-outline" size={10} color="#6366f1" />
        <Text style={styles.recurringBadgeText}>Auto-renewal</Text>
    </View>
)}

                                        {isSuccess && (
                                            <TouchableOpacity
                                                style={[
                                                    styles.downloadButton,
                                                    downloading === payment.id && styles.downloadingButton
                                                ]}
                                                onPress={() => handleDownloadInvoice(payment)}
                                                disabled={downloading === payment.id}
                                            >
                                                {downloading === payment.id ? (
                                                    <>
                                                        <ActivityIndicator size="small" color="#fff" />
                                                        <Text style={styles.downloadButtonText}>
                                                            Downloading...
                                                        </Text>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Ionicons
                                                            name="download-outline"
                                                            size={16}
                                                            color="#fff"
                                                        />
                                                        <Text style={styles.downloadButtonText}>
                                                            Download Invoice
                                                        </Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            * This shows all your payment history including completed, pending and cancelled subscriptions
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 12 : 16,
        paddingBottom: 16,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 4,
        width: 40,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
    },
    headerRight: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    loadingContainer: {
        paddingVertical: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
    },
    emptyContainer: {
        paddingVertical: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
    },
    activeSubscriptionContainer: {
        padding: 16,
        paddingBottom: 8,
    },
    activeSubscriptionCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    activeSubscriptionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    activeSubscriptionIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeSubscriptionInfo: {
        flex: 1,
    },
    activePlanRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    activePlanLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6366f1',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    renewalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    renewalBadgeText: {
        fontSize: 9,
        color: '#D97706',
        fontWeight: '600',
    },
    activePlanTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 2,
    },
    activePlanAmount: {
        fontSize: 14,
        color: '#64748B',
    },
    activeSubscriptionNext: {
        alignItems: 'flex-end',
    },
    nextPaymentLabel: {
        fontSize: 10,
        color: '#94A3B8',
        marginBottom: 2,
    },
    nextPaymentDate: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366f1',
    },
    daysRemaining: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 2,
    },
    paymentsList: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    paymentCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    cardActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#C7D2FE',
    },
    cardSuccess: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
    },
    cardPending: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
    },
    cardDefault: {
        backgroundColor: '#F8FAFC',
        borderColor: '#E2E8F0',
    },
    paymentCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    paymentCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    paymentIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentIconSuccess: {
        backgroundColor: '#D1FAE5',
    },
    paymentIconDefault: {
        backgroundColor: '#F1F5F9',
    },
    paymentTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 2,
    },
    paymentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    paymentMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    paymentMetaText: {
        fontSize: 10,
        color: '#94A3B8',
    },
    recurringBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    recurringBadgeText: {
        fontSize: 9,
        color: '#6366f1',
        fontWeight: '500',
    },
    paymentCardRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    paymentAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 9,
        fontWeight: '600',
    },
    paymentCardFooter: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    transactionId: {
        fontSize: 10,
        color: '#94A3B8',
    },
    validityText: {
        fontSize: 10,
        color: '#94A3B8',
    },
    downloadButton: {
        backgroundColor: '#6366f1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#6366f1',
    },
    downloadingButton: {
        opacity: 0.7,
    },
    downloadButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 11,
        color: '#94A3B8',
        textAlign: 'center',
    },
});