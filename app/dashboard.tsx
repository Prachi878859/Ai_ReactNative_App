import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';
import api, { pythonGet, pythonPost } from './axiosInstance';
import CustomSidebar from './Sidebar';

const { width, height } = Dimensions.get('window');

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface SubscriptionData {
  id: string;
  package_id: string;
  package_title: string;
  amount: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'pending' | 'expired' | 'success';
  total_images?: number;
  used_images?: number;
  next_billing_date?: string;
  is_recurring?: number;
}

interface PackageDetails {
  id: string;
  title: string;
  description: string;
  amount: number;
  features: string[];
  duration_days: number;
}

// Calendar Event Interface
interface CalendarEvent {
  thumbnail: string;
  fullImage: string;
  fullImages: string[];
  isCarousel: boolean;
  caption: string;
  hashtags: string | string[];
  imageType: string;
  festival: string;
  postId: string;
  status: string;
  agenda_id: number;
  day: number;
  regeneration_count: number;
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export default function UserDashboard() {
  const navigation = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubscriptionData | null>(null);
  const [packageDetails, setPackageDetails] = useState<PackageDetails | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isSidebarEnabled, setIsSidebarEnabled] = useState(false);
  
  const [hasBusinessData, setHasBusinessData] = useState(false);
  const [checkingBusinessData, setCheckingBusinessData] = useState(false);

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<Record<string, CalendarEvent>>({});
  const [selectedEvent, setSelectedEvent] = useState<{ date: string; event: CalendarEvent } | null>(null);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [feedback, setFeedback] = useState('');
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Check business data
  const checkBusinessData = async (userId: string) => {
    if (!userId) return false;
    
    try {
      setCheckingBusinessData(true);
      const response = await api.get(`/business-data/has/${userId}`);
      console.log('Business data check response:', response.data);
      
      const hasData = response.data?.hasData === true;
      setHasBusinessData(hasData);
      console.log('Has business data:', hasData);
      return hasData;
    } catch (error: any) {
      console.log('Business data check error:', error?.response?.data || error);
      setHasBusinessData(false);
      return false;
    } finally {
      setCheckingBusinessData(false);
    }
  };

  // Fetch calendar events from agenda
  const fetchUserAgenda = async (userId: string) => {
    if (!userId) return;

    try {
      console.log('📅 Fetching agenda for userId:', userId);
      const response = await pythonGet(`/social/user-agenda/${userId}`);
      console.log('📊 Raw AGENDA RESPONSE:', JSON.stringify(response.data, null, 2));

      const formattedEvents: Record<string, CalendarEvent> = {};
      const allAgendaData = response.data?.data || [];

      allAgendaData.forEach((agendaItem: any) => {
        const agendaTable = agendaItem.agenda_table || [];

        agendaTable.forEach((post: any, index: number) => {
          let imageUrls: string[] = [];

          if (post.generated_image_url) {
            if (Array.isArray(post.generated_image_url)) {
              imageUrls = post.generated_image_url.filter((url: any) => {
                return typeof url === 'string' && url.length > 0;
              });
            } else if (typeof post.generated_image_url === 'string') {
              imageUrls = [post.generated_image_url];
            } else if (typeof post.generated_image_url === 'object') {
              imageUrls = Object.values(post.generated_image_url).filter(v => typeof v === 'string');
            }
          }

          const processedUrls = imageUrls.map(url => {
            if (url && url.startsWith('/')) {
              const baseURL = Platform.OS === 'android'
                ? 'http://192.168.1.5:5000'
                : 'http://localhost:5000';
              return `${baseURL}${url}`;
            }
            return url;
          });

          const imageType = post.image_type || (processedUrls.length > 1 ? 'Carousel' : 'Banner');

          formattedEvents[post.real_date] = {
            thumbnail: processedUrls[0] || 'https://via.placeholder.com/100x100?text=No+Image',
            fullImage: processedUrls[0] || 'https://via.placeholder.com/400x400?text=No+Image',
            fullImages: processedUrls,
            isCarousel: (imageType === 'Carousel' || processedUrls.length > 1),
            caption: post.generated_caption || 'No caption available',
            hashtags: post.generated_hashtags || [],
            imageType: imageType,
            festival: post.festival_name,
            postId: post.id || post.post_id || `${agendaItem.agenda_id}_${index}`,
            status: post.status || 'pending',
            agenda_id: agendaItem.agenda_id,
            day: post.day || index + 1,
            regeneration_count: post.regeneration_count || 0,
          };
        });
      });

      console.log('✅ Formatted events count:', Object.keys(formattedEvents).length);
      setCalendarEvents(formattedEvents);
    } catch (error: any) {
      console.log('❌ FETCH AGENDA ERROR =>', error?.response?.data || error);
    }
  };

  const shouldShowBusinessDataSection = () => {
    const hasActiveSubscription = subscriptions.some(
      sub => sub.status === 'success' || sub.status === 'active'
    );
    
    return hasActiveSubscription && !hasBusinessData && !checkingBusinessData;
  };

  const openBusinessDataModal = () => {
    console.log('🔵 Opening business modal from dashboard');
    const openModal = async () => {
      try {
        await AsyncStorage.setItem('openBusinessModal', 'true');
        console.log('✅ Flag set in AsyncStorage');
        router.push('/CalendarScreen');
      } catch (error) {
        console.log('Error setting flag:', error);
        router.push('/CalendarScreen');
      }
    };
    openModal();
  };

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
        setUser(parsedUser);
      }

      const userId = parsedUser?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      let allSubscriptions: any[] = [];

      try {
        const activeResponse = await api.get(`/payments/active-subscription?user_id=${userId}`);
        console.log('ACTIVE SUB RESPONSE:', activeResponse.data);

        if (activeResponse.data?.success) {
          if (Array.isArray(activeResponse.data.subscriptions)) {
            const activeSubs = activeResponse.data.subscriptions.filter(
              (sub: any) => sub.status === 'success' || sub.status === 'active'
            );
            allSubscriptions = [...allSubscriptions, ...activeSubs];
          } else if (activeResponse.data.activeSubscription) {
            const sub = activeResponse.data.activeSubscription;
            if (sub.status === 'success' || sub.status === 'active') {
              allSubscriptions = [...allSubscriptions, sub];
            }
          } else if (activeResponse.data.subscription) {
            const sub = activeResponse.data.subscription;
            if (sub.status === 'success' || sub.status === 'active') {
              allSubscriptions = [...allSubscriptions, sub];
            }
          }
        }
      } catch (error) {
        console.log('Active subscription fetch error:', error);
      }

      try {
        const response = await api.get(`/payments/my-subscriptions?user_id=${userId}`);
        console.log('MY SUBSCRIPTIONS:', response.data);

        if (response.data.success && response.data.subscriptions) {
          const activeOnly = response.data.subscriptions.filter(
            (sub: any) => sub.status === 'success' || sub.status === 'active'
          );
          allSubscriptions = [...allSubscriptions, ...activeOnly];
        }
      } catch (error) {
        console.log('All subscriptions fetch error:', error);
      }

      const uniqueSubscriptions = allSubscriptions.filter(
        (item, index, self) => index === self.findIndex((t) => t.id === item.id)
      );

      console.log('FINAL ACTIVE SUBSCRIPTIONS:', uniqueSubscriptions);
      setSubscriptions(uniqueSubscriptions);

      const hasActiveSubscription = uniqueSubscriptions.length > 0;

      if (hasActiveSubscription) {
        await fetchUserAgenda(userId);
        
        const hasData = await checkBusinessData(userId);
        console.log('🔍 Business data exists?', hasData);
        
        const storedFlag = await AsyncStorage.getItem('openBusinessModal');
        console.log('📱 Stored openBusinessModal flag:', storedFlag);
        
        if (storedFlag === 'true' && !hasData) {
          console.log('🚀 Opening business modal from fetchSubscriptions');
          await AsyncStorage.removeItem('openBusinessModal');
          setTimeout(() => {
            router.push({
              pathname: '/CalendarScreen',
              params: { openBusinessModal: 'true' }
            });
          }, 500);
        }
      } else {
        setHasBusinessData(false);
      }

    } catch (error: any) {
      console.error('Subscriptions error:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        router.dismissAll();
        router.replace('/LoginScreen');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkSidebarVisibility = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userData');
      let parsedUser = null;
      if (storedUser) {
        parsedUser = JSON.parse(storedUser);
      }
      const userId = parsedUser?.id;
      
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
        
        const hasBusinessDataFlag = await checkBusinessData(userId);
        
        const shouldEnableSidebar = hasActiveSubscription && hasBusinessDataFlag;
        setIsSidebarEnabled(shouldEnableSidebar);
        return shouldEnableSidebar;
      }
    } catch (error) {
      console.log('Sidebar visibility check error:', error);
    }
    return false;
  };

  useEffect(() => {
    checkSidebarVisibility();
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('📱 Dashboard focused');
      fetchSubscriptions();
      checkSidebarVisibility();
      setShowAllPosts(false);
    }, [])
  );

  const generateRazorpayHtml = (orderData: any, sub: SubscriptionData) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
          .loading {
            text-align: center;
            color: #64748B;
          }
          .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #6366f1;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 12px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="loading">
          <div class="spinner"></div>
          <div>Loading payment gateway...</div>
        </div>
        <script>
          var options = {
            key: "${orderData.key_id}",
            amount: ${orderData.amount * 100},
            currency: "INR",
            name: "Your App Name",
            description: "${sub.package_title.replace(/'/g, "\\'")}",
            order_id: "${orderData.order_id}",
            prefill: {
              name: "${(user?.name || '').replace(/'/g, "\\'")}",
              email: "${(user?.email || '').replace(/'/g, "\\'")}",
              contact: "${user?.phone || '9999999999'}"
            },
            theme: {
              color: "#6366f1"
            },
            handler: function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'payment_success',
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                subscription_id: "${sub.id}"
              }));
            },
            modal: {
              ondismiss: function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'payment_cancelled'
                }));
              }
            }
          };
          
          var rzp = new Razorpay(options);
          rzp.open();
        </script>
      </body>
      </html>
    `;
  };

  const handlePayment = async (sub: SubscriptionData) => {
    setProcessingPayment(true);
    try {
      const response = await api.post('/payments/create-order', {
        package_id: sub.package_id,
        user_id: user?.id,
        subscription_id: sub.id
      });

      if (!response.data.success) {
        Alert.alert('Error', response.data.message || 'Failed to create order');
        setProcessingPayment(false);
        return;
      }

      if (Platform.OS === 'web') {
        const options = {
          key: response.data.key_id,
          amount: response.data.amount * 100,
          currency: 'INR',
          name: 'Your App Name',
          description: sub.package_title,
          order_id: response.data.order_id,

          handler: async function (paymentResponse: any) {
            const verifyResponse = await api.post('/payments/verify-payment', {
              order_id: paymentResponse.razorpay_order_id,
              payment_id: paymentResponse.razorpay_payment_id,
              signature: paymentResponse.razorpay_signature,
              subscription_id: sub.id
            });

            if (verifyResponse.data.success) {
              Alert.alert('Success', 'Payment completed successfully!', [
                { 
                  text: 'OK', 
                  onPress: async () => {
                    await AsyncStorage.setItem('openBusinessModal', 'true');
                    await fetchSubscriptions();
                  } 
                }
              ]);
            } else {
              Alert.alert('Error', 'Payment verification failed');
            }
          },

          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || '9999999999',
          },

          theme: {
            color: '#6366f1',
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      } else {
        const html = generateRazorpayHtml(response.data, sub);
        setPaymentHtml(html);
        setPaymentModalVisible(true);
      }
      setProcessingPayment(false);
    } catch (err: any) {
      console.error('Order creation error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to initialize payment');
      setProcessingPayment(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'payment_success') {
        setPaymentModalVisible(false);

        const verifyResponse = await api.post('/payments/verify-payment', {
          order_id: data.order_id,
          payment_id: data.payment_id,
          signature: data.signature,
          subscription_id: data.subscription_id
        });

        if (verifyResponse.data.success) {
          Alert.alert('Success', 'Payment completed successfully!', [
            { 
              text: 'OK', 
              onPress: async () => {
                await AsyncStorage.setItem('openBusinessModal', 'true');
                await fetchSubscriptions();
              } 
            }
          ]);
        } else {
          Alert.alert('Error', 'Payment verification failed');
        }
      } else if (data.type === 'payment_cancelled') {
        setPaymentModalVisible(false);
        Alert.alert('Payment Cancelled', 'You cancelled the payment');
      }
    } catch (error) {
      console.error('WebView message error:', error);
      Alert.alert('Error', 'Payment processing failed');
      setPaymentModalVisible(false);
    }
  };

  const handleSubscriptionClick = async (sub: SubscriptionData) => {
    if (sub.status === 'pending') {
      handlePayment(sub);
    } else if (sub.status === 'success' || sub.status === 'active') {
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

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      console.log("Subscription ID:", subscriptionId);
      console.log("Calling cancel API...");

      setProcessingPayment(true);

      const response = await api.post(
        `/payments/cancel-subscription/${subscriptionId}`
      );

      console.log("API RESPONSE:", response.data);

      if (response.data?.success) {
        Alert.alert("Success", "Subscription cancelled successfully");
        await fetchSubscriptions();
        await checkSidebarVisibility();
      } else {
        Alert.alert(
          "Error",
          response.data?.message || "Failed to cancel subscription"
        );
      }
    } catch (error: any) {
      console.log(
        "CANCEL API ERROR:",
        error?.response?.data || error.message
      );

      Alert.alert(
        "Error",
        error?.response?.data?.message || "Cancel failed"
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedSub(null);
    setPackageDetails(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
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

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "No",
          style: "cancel",
          onPress: () => {
            console.log("Logout cancelled");
          },
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("Logging out...");
              await AsyncStorage.removeItem("userToken");
              await AsyncStorage.removeItem("userData");
              await AsyncStorage.removeItem("openBusinessModal");
              navigation.replace("/LoginScreen");
            } catch (error) {
              console.log("Logout Error:", error);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSubscriptions();
    checkSidebarVisibility();
    setShowAllPosts(false);
  };

  const handleBuyNewPlan = () => {
    router.push('/packages');
  };

  const getRemainingDays = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Calendar Event Modal Handlers
  const handleEventClick = (date: string, event: CalendarEvent) => {
    setSelectedEvent({ date, event });
    setCurrentCarouselIndex(0);
    setEventModalVisible(true);
  };

  const closeEventModal = () => {
    setEventModalVisible(false);
    setSelectedEvent(null);
    setCurrentCarouselIndex(0);
    setCustomPrompt('');
    setFeedback('');
    setShowPromptModal(false);
    setIsRegenerating(false);
  };

  const goToNextImage = () => {
    if (selectedEvent?.event?.fullImages && currentCarouselIndex < selectedEvent.event.fullImages.length - 1) {
      const newIndex = currentCarouselIndex + 1;
      setCurrentCarouselIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  };

  const goToPrevImage = () => {
    if (currentCarouselIndex > 0) {
      const newIndex = currentCarouselIndex - 1;
      setCurrentCarouselIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  };

  const renderCarouselItem = ({ item }: { item: string }) => {
    const modalWidth = Platform.OS === 'web' ? Math.min(600, width * 0.9) : (width >= 768 ? width * 0.7 : width * 0.9);
    const imageContainerHeight = height * 0.4;

    return (
      <View
        style={{
          width: modalWidth,
          height: imageContainerHeight,
          justifyContent: 'flex-start',
          alignItems: 'center',
          backgroundColor: '#fff',
          paddingTop: 10,
        }}
      >
        <Image
          source={{ uri: item }}
          resizeMode="contain"
          style={{
            width: modalWidth - 20,
            height: imageContainerHeight,
            marginTop: -20,
          }}
        />
      </View>
    );
  };

  const onScrollEnd = (event: any) => {
    const modalWidth = Platform.OS === 'web' ? Math.min(600, width * 0.9) : (width >= 768 ? width * 0.7 : width * 0.9);
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / modalWidth);
    setCurrentCarouselIndex(newIndex);
  };

  const handleApprove = async () => {
    if (!selectedEvent) return;
    try {
      const payload = {
        agenda_id: selectedEvent.event.agenda_id,
        day: selectedEvent.event.day,
        decision: 'approve',
      };

      const response = await pythonPost('/social/review-post', payload);

      if (response.data?.success) {
        Alert.alert('Success', 'Post Approved Successfully');
        closeEventModal();
        const userId = user?.id;
        if (userId) {
          await fetchUserAgenda(userId);
        }
      }
    } catch (error: any) {
      console.log('APPROVE ERROR =>', error?.response?.data || error);
      Alert.alert('Error', 'Failed to approve post');
    }
  };

  const handleReject = async () => {
    if (!selectedEvent) return;
    
    Alert.alert(
      'Regenerate Image',
      'Do you want to regenerate this image?',
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: () => console.log('Regeneration cancelled'),
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              setIsRegenerating(true);

              const payload = {
                agenda_id: selectedEvent.event.agenda_id,
                day: selectedEvent.event.day,
                decision: 'decline',
              };

              const response = await pythonPost('/social/review-post', payload);
              console.log('REJECT RESPONSE =>', response.data);

              if (response.data?.success) {
                Alert.alert('Regenerated', response.data?.message);
                closeEventModal();
                const userId = user?.id;
                if (userId) {
                  await fetchUserAgenda(userId);
                }
                return;
              }

              if (response.data?.need_custom_prompt) {
                setShowPromptModal(true);
                setIsRegenerating(false);
                return;
              }
            } catch (error: any) {
              console.log('REJECT ERROR =>', error?.response?.data || error);
              Alert.alert('Error', 'Failed to regenerate post');
            } finally {
              setIsRegenerating(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleCustomRegenerate = async () => {
    if (!selectedEvent) return;
    try {
      if (!customPrompt.trim()) {
        Alert.alert('Error', 'Please enter custom prompt');
        return;
      }

      setIsRegenerating(true);

      const payload = {
        agenda_id: selectedEvent.event.agenda_id,
        day: selectedEvent.event.day,
        custom_prompt: customPrompt,
        feedback: feedback,
      };

      const response = await pythonPost('/social/regenerate-with-prompt', payload);
      console.log('CUSTOM REGENERATE =>', response.data);

      if (response.data?.success) {
        Alert.alert('Success', response.data?.message);
        setShowPromptModal(false);
        setCustomPrompt('');
        setFeedback('');
        closeEventModal();
        const userId = user?.id;
        if (userId) {
          await fetchUserAgenda(userId);
        }
      }
    } catch (error: any) {
      console.log('CUSTOM REGENERATE ERROR =>', error?.response?.data || error);
      Alert.alert('Error', 'Failed to regenerate');
    } finally {
      setIsRegenerating(false);
    }
  };

  const modalWidth = Platform.OS === 'web' ? Math.min(600, width * 0.9) : (width >= 768 ? width * 0.7 : width * 0.9);
  const imageContainerHeight = height * 0.4;

  // Calculate card width for horizontal scroll
  const cardWidth = width * 0.75; // Each card takes 75% of screen width

  // Render a single post card in horizontal row
  const renderPostCard = ({ item }: { item: [string, CalendarEvent] }) => {
    const [date, event] = item;
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const displayImage = event.fullImages && event.fullImages.length > 0 
      ? event.fullImages[0] 
      : event.thumbnail;

    return (
      <TouchableOpacity
        style={[styles.postCard, { width: cardWidth }]}
        onPress={() => handleEventClick(date, event)}
        activeOpacity={0.9}
      >
        {/* Image Section */}
        <View style={styles.postImageContainer}>
          {displayImage && displayImage !== 'https://via.placeholder.com/100x100?text=No+Image' ? (
            <Image
              source={{ uri: displayImage }}
              style={styles.postImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.postImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={40} color="#94a3b8" />
            </View>
          )}
          {event.isCarousel && event.fullImages?.length > 1 && (
            <View style={styles.carouselBadge}>
              <Ionicons name="albums-outline" size={12} color="#fff" />
              <Text style={styles.carouselBadgeText}>{event.fullImages.length}</Text>
            </View>
          )}
          {event.imageType && (
            <View style={styles.imageTypeBadge}>
              <Text style={styles.imageTypeBadgeText}>{event.imageType}</Text>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.postContent}>
          {/* Date and Festival */}
          <View style={styles.postHeader}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color="#6366f1" />
              <Text style={styles.postDate}>{formattedDate}</Text>
            </View>
            {event.festival && (
              <View style={styles.festivalBadge}>
                <Text style={styles.festivalText}>🎉 {event.festival}</Text>
              </View>
            )}
          </View>

          {/* Caption */}
          {event.caption && event.caption !== 'No caption available' && (
            <Text style={styles.postCaption} numberOfLines={3}>
              {event.caption}
            </Text>
          )}

          {/* Hashtags - Show first 3 */}
          {(() => {
            let tags: string[] = [];
            if (Array.isArray(event.hashtags)) {
              tags = event.hashtags;
            } else if (typeof event.hashtags === 'string' && event.hashtags.trim()) {
              tags = event.hashtags.split(' ').filter(t => t.trim().length > 0);
            }
            if (tags.length > 0) {
              return (
                <View style={styles.hashtagContainer}>
                  {tags.slice(0, 3).map((tag, index) => (
                    <View key={index} style={styles.hashtagPill}>
                      <Text style={styles.hashtagText}>{tag}</Text>
                    </View>
                  ))}
                  {tags.length > 3 && (
                    <Text style={styles.moreHashtags}>+{tags.length - 3}</Text>
                  )}
                </View>
              );
            }
            return null;
          })()}

          {/* View Button Only */}
          <TouchableOpacity 
            style={styles.viewBtn}
            onPress={() => handleEventClick(date, event)}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={16} color="#fff" />
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  const eventsArray = Object.entries(calendarEvents);
  const initialDisplayCount = 2;
  const displayedEvents = showAllPosts ? eventsArray : eventsArray.slice(0, initialDisplayCount);
  const hasMorePosts = eventsArray.length > initialDisplayCount;

  return (
    <>
      <Stack.Screen options={{
        headerShown: true,
        title: 'My Dashboard',
        headerTitleStyle: styles.headerTitle,
        headerLeft: () => (
          isSidebarEnabled ? (
            <TouchableOpacity
              onPress={() => setSidebarVisible(true)}
              style={styles.profileButton}
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
              console.log("TOP LOGOUT CLICKED");
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
                        await AsyncStorage.removeItem("openBusinessModal");
                        navigation.replace("/LoginScreen");
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366f1']} />
          }
        >
          {/* Welcome Section */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="person" size={32} color="#fff" />
            </View>
            <View style={styles.welcomeContent}>
              <Text style={styles.userName}>
                Welcome back, {user?.name || 'User'}! 👋
              </Text>              
              <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
            </View>
          </View>

          {/* Posts Section - Horizontal Row */}
          <View style={styles.postsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="newspaper-outline" size={22} color="#6366f1" />
                <Text style={styles.sectionTitle}>Your Posts</Text>
              </View>
              <View style={styles.sectionRight}>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{eventsArray.length}</Text>
                </View>
                {hasMorePosts && !showAllPosts && (
                  <TouchableOpacity 
                    style={styles.viewAllBtn}
                    onPress={() => setShowAllPosts(true)}
                  >
                    <Text style={styles.viewAllText}>View All →</Text>
                  </TouchableOpacity>
                )}
                {showAllPosts && eventsArray.length > initialDisplayCount && (
                  <TouchableOpacity 
                    style={styles.viewAllBtn}
                    onPress={() => setShowAllPosts(false)}
                  >
                    <Text style={styles.viewAllText}>Show Less ↑</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {eventsArray.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={60} color="#94a3b8" />
                <Text style={styles.emptyStateTitle}>No Posts Yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Generate your content calendar to see posts here
                </Text>
                <TouchableOpacity 
                  style={styles.generatePostBtn}
                  onPress={() => router.push('/CalendarScreen')}
                >
                  <Text style={styles.generatePostBtnText}>Go to Calendar →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.postsRow}
              >
                {displayedEvents.map((item) => (
                  <React.Fragment key={item[0]}>
                    {renderPostCard({ item })}
                  </React.Fragment>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Business Data Section */}
          {shouldShowBusinessDataSection() && (
            <View style={styles.businessDataCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="business-outline" size={22} color="#6366f1" />
                  <Text style={styles.sectionTitle}>Business Data Management</Text>
                </View>
              </View>

              <View style={styles.businessDataContainer}>
                <Ionicons name="folder-open-outline" size={48} color="#94A3B8" />
                <Text style={styles.businessDataTitle}>Add Your Business Information</Text>
                <Text style={styles.businessDataSubtitle}>
                  Upload business documents, reference images, and provide description 
                  to generate AI-powered social media content calendar
                </Text>
                <TouchableOpacity 
                  style={styles.addBusinessDataBtn}
                  onPress={openBusinessDataModal}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.addBusinessDataBtnText}>Get Started →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          
          
        </ScrollView>
      </SafeAreaView>

      {/* Event Detail Modal with Reject and Approve Buttons */}
      <Modal visible={eventModalVisible} transparent animationType="slide" onRequestClose={closeEventModal}>
        <TouchableWithoutFeedback onPress={closeEventModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.eventModal,
                  {
                    width: modalWidth,
                    height: height * 0.85,
                  },
                ]}
              >
                {selectedEvent && selectedEvent.event && (
                  <View style={styles.eventModalContainer}>
                    <View style={{ width: '100%' }}>
                      {selectedEvent.event.isCarousel && selectedEvent.event.fullImages?.length > 1 ? (
                        <View
                          style={[
                            styles.carouselWrapper,
                            {
                              height: imageContainerHeight,
                              backgroundColor: '#fff',
                            },
                          ]}
                        >
                          <FlatList
                            contentContainerStyle={{ justifyContent: 'center' }}
                            ref={flatListRef}
                            data={selectedEvent.event.fullImages}
                            renderItem={renderCarouselItem}
                            keyExtractor={(item, index) => `carousel_${index}`}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={onScrollEnd}
                            getItemLayout={(data, index) => ({
                              length: modalWidth,
                              offset: modalWidth * index,
                              index,
                            })}
                            initialScrollIndex={currentCarouselIndex}
                          />

                          {currentCarouselIndex > 0 && (
                            <TouchableOpacity
                              style={[styles.navArrow, styles.navArrowLeft]}
                              onPress={goToPrevImage}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="chevron-back" size={32} color="#fff" />
                            </TouchableOpacity>
                          )}

                          {currentCarouselIndex < selectedEvent.event.fullImages.length - 1 && (
                            <TouchableOpacity
                              style={[styles.navArrow, styles.navArrowRight]}
                              onPress={goToNextImage}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="chevron-forward" size={32} color="#fff" />
                            </TouchableOpacity>
                          )}

                          <View style={styles.carouselPagination}>
                            {selectedEvent.event.fullImages.map((_: any, idx: number) => (
                              <TouchableOpacity
                                key={idx}
                                onPress={() => {
                                  setCurrentCarouselIndex(idx);
                                  flatListRef.current?.scrollToIndex({ index: idx, animated: true });
                                }}
                              >
                                <View
                                  style={[
                                    styles.paginationDot,
                                    idx === currentCarouselIndex && styles.paginationDotActive,
                                  ]}
                                />
                              </TouchableOpacity>
                            ))}
                          </View>

                          <View style={styles.carouselCounter}>
                            <Text style={styles.carouselCounterText}>
                              {currentCarouselIndex + 1} / {selectedEvent.event.fullImages.length}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View
                          style={{
                            height: imageContainerHeight,
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            backgroundColor: '#fff',
                            width: '100%',
                            paddingTop: 10,
                          }}
                        >
                          <Image
                            source={{ uri: selectedEvent.event.fullImages[0] || selectedEvent.event.thumbnail }}
                            resizeMode="contain"
                            style={{
                              width: '100%',
                              height: imageContainerHeight,
                              marginTop: -20,
                            }}
                          />
                        </View>
                      )}
                      <TouchableOpacity style={styles.closeBtn} onPress={closeEventModal}>
                        <Ionicons name="close" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      style={styles.eventModalScrollView}
                      contentContainerStyle={{ paddingBottom: 30 }}
                    >
                      <View style={styles.eventModalContent}>
                        {/* Tags */}
                        <View style={styles.tagContainer}>
                          {selectedEvent.event.imageType && (
                            <View style={styles.imageTypeTag}>
                              <Text style={styles.tagText}>{selectedEvent.event.imageType}</Text>
                            </View>
                          )}
                          {selectedEvent.event.isCarousel && (
                            <View style={styles.carouselTag}>
                              <Text style={styles.tagText}>Carousel ({selectedEvent.event.fullImages?.length} slides)</Text>
                            </View>
                          )}
                          {selectedEvent.event.festival && (
                            <View style={styles.festivalTag}>
                              <Text style={styles.festivalTagText}>🎉 {selectedEvent.event.festival}</Text>
                            </View>
                          )}
                        </View>

                        {/* Date */}
                        <View style={styles.dateContainer}>
                          <Ionicons name="calendar-outline" size={16} color="#4f46e5" />
                          <Text style={styles.dateText}>{new Date(selectedEvent.date).toDateString()}</Text>
                        </View>

                        {/* Hashtags */}
                        <View style={styles.hashtagContainer}>
                          {(() => {
                            const tags = selectedEvent?.event?.hashtags;
                            
                            if (Array.isArray(tags)) {
                              return tags.map((tag: string, index: number) => (
                                <View key={index} style={styles.hashtagPill}>
                                  <Text style={styles.hashtagText}>{tag}</Text>
                                </View>
                              ));
                            }
                            
                            if (typeof tags === 'string' && tags.trim()) {
                              return tags
                                .split(' ')
                                .filter((tag: string) => tag.trim().length > 0)
                                .map((tag: string, index: number) => (
                                  <View key={index} style={styles.hashtagPill}>
                                    <Text style={styles.hashtagText}>{tag}</Text>
                                  </View>
                                ));
                            }
                            
                            return null;
                          })()}
                        </View>

                        {/* Caption */}
                        <View style={styles.captionContainer}>
                          <Text style={styles.caption}>
                            {selectedEvent?.event?.caption}
                          </Text>
                        </View>

                        {/* Action Buttons - Reject and Approve */}
                        <View style={styles.actionRow}>
                          <TouchableOpacity 
                            style={[styles.rejectBtn, isRegenerating && styles.disabledRegenerateBtn]} 
                            onPress={handleReject} 
                            activeOpacity={0.8}
                            disabled={isRegenerating}
                          >
                            {isRegenerating ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <>
                                <Ionicons name="refresh-outline" size={16} color="#fff" />
                                <Text style={styles.actionBtnText} numberOfLines={1}>Reject</Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={styles.approveBtn} 
                            onPress={handleApprove} 
                            activeOpacity={0.8}
                          >
                            <Ionicons name="checkmark-outline" size={16} color="#fff" />
                            <Text style={styles.actionBtnText} numberOfLines={1}>Approve</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Prompt Modal */}
      <Modal visible={showPromptModal} transparent animationType="slide" onRequestClose={() => setShowPromptModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.promptModal, { width: modalWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Regenerate With Prompt</Text>
              <TouchableOpacity onPress={() => setShowPromptModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Custom Prompt</Text>
            <TextInput
              value={customPrompt}
              onChangeText={setCustomPrompt}
              placeholder="Enter custom prompt"
              multiline
              style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
            />

            <Text style={styles.label}>Feedback</Text>
            <TextInput
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Enter feedback"
              multiline
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            />

            <View style={styles.bottomBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPromptModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendBtn} onPress={handleCustomRegenerate}>
                {isRegenerating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sendText}>Regenerate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                <View style={styles.modalHeader}>
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
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Amount</Text>
                      <Text style={styles.statValue}>₹{selectedSub?.amount}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Status</Text>
                      <View style={[styles.statBadge, { backgroundColor: '#10B98120' }]}>
                        <Text style={[styles.statBadgeText, { color: '#10B981' }]}>Active</Text>
                      </View>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Started</Text>
                      <Text style={styles.statDate}>{selectedSub && formatDate(selectedSub.start_date)}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Expires</Text>
                      <Text style={styles.statDate}>{selectedSub && formatDate(selectedSub.end_date)}</Text>
                    </View>
                  </View>

                  {packageDetails?.features && packageDetails.features.length > 0 && (
                    <View style={styles.featuresSection}>
                      <View style={styles.featuresHeader}>
                        <Ionicons name="gift-outline" size={18} color="#6366f1" />
                        <Text style={styles.featuresTitle}>What's included</Text>
                      </View>
                      <View style={styles.featuresList}>
                        {packageDetails.features.map((feature, idx) => (
                          <View key={idx} style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.modalFooter}>
                    <Ionicons name="shield-checkmark" size={14} color="#94A3B8" />
                    <Text style={styles.footerText}>Secured by Razorpay</Text>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment WebView Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <SafeAreaView style={styles.webviewContainer}>
          <View style={styles.webviewHeader}>
            <TouchableOpacity
              onPress={() => setPaymentModalVisible(false)}
              style={styles.webviewCloseButton}
            >
              <Ionicons name="close" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.webviewTitle}>Complete Payment</Text>
            <View style={{ width: 40 }} />
          </View>
          <WebView
            ref={webViewRef}
            source={{ html: paymentHtml }}
            onMessage={handleWebViewMessage}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.webviewLoadingText}>Loading payment gateway...</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Processing Payment Overlay */}
      {processingPayment && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        </View>
      )}
      
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
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  profileButton: {
    marginLeft: 16,
    padding: 4,
  },
  logoutButton: {
    marginRight: 16,
    padding: 4,
  },
  welcomeCard: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  welcomeContent: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#C7D2FE',
  },

  // Posts Section Styles
  postsSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
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
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  viewAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  viewAllText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
  },
  actionBtnText: {
  color: '#fff',
  fontWeight: '700',
  fontSize: 13,
  letterSpacing: 0.2,
  textAlign: 'center',
  flexShrink: 0, // Prevents text from shrinking
},
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  generatePostBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  generatePostBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Horizontal Row Styles
  postsRow: {
    paddingRight: 4,
    gap: 12,
  },

  // Post Card Styles - Horizontal
  postCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 4,
  },
  postImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  carouselBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  carouselBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  imageTypeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  imageTypeBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  postContent: {
    padding: 14,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  festivalBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  festivalText: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: '500',
  },
  postCaption: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  hashtagPill: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  hashtagText: {
    color: '#4f46e5',
    fontSize: 10,
    fontWeight: '500',
  },
  moreHashtags: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    paddingVertical: 2,
  },
  viewBtn: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    width: '100%',
  },
  viewBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Business Data Styles
  businessDataCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  businessDataContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  businessDataTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  businessDataSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  addBusinessDataBtn: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addBusinessDataBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },

  // Event Modal Styles
  eventModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    flex: 0,
  },
  eventModalContainer: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  eventModalScrollView: {
    maxHeight: height * 0.45,
  },
  eventModalContent: {
    padding: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  imageTypeTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  carouselTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  festivalTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  festivalTagText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  tagText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dateText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '600',
  },
  captionContainer: {
    marginBottom: 14,
  },
  caption: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
  disabledRegenerateBtn: {
    opacity: 0.7,
  },

  // Carousel Styles
  carouselWrapper: {
    position: 'relative',
    width: '100%',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    padding: 10,
    zIndex: 20,
  },
  navArrowLeft: {
    left: 10,
  },
  navArrowRight: {
    right: 10,
  },
  carouselPagination: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    zIndex: 15,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: '#fff',
  },
  carouselCounter: {
    position: 'absolute',
    top: 12,
    right: 60,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 15,
  },
  carouselCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Prompt Modal Styles
  promptModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalCloseBtn: {
    padding: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginTop: 6,
    fontSize: 14,
  },
  bottomBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 28,
    gap: 12,
  },
  cancelBtn: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelText: {
    color: '#334155',
    fontWeight: '700',
  },
  sendBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  sendText: {
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
    backgroundColor: '#6366f1',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 80) / 4,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E293B',
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  featuresList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  webviewCloseButton: {
    padding: 8,
  },
  webviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  webviewLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
});