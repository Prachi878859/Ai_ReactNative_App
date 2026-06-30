import {
  FontAwesome5,
  Ionicons,
  MaterialIcons,
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import axiosInstance, {
  pythonGet,
  pythonPost
} from './axiosInstance';
import CustomSidebar from './Sidebar';

const { width, height } = Dimensions.get('window');

const CalendarScreen = () => {
  const params = useLocalSearchParams();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [businessDataFiles, setBusinessDataFiles] = useState<any[]>([]);
  const [referenceImgFiles, setReferenceImgFiles] = useState<any[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');
  // New business fields
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any>({});
  const eventsByDate = calendarEvents;
  const [isGenerating, setIsGenerating] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCalendarGenerated, setIsCalendarGenerated] = useState(false);
  const [hasBusinessData, setHasBusinessData] = useState(false);
  const [checkingBusinessData, setCheckingBusinessData] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Sidebar state
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Carousel state
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isMounted = useRef(true);

  // Auto-open business modal when coming from dashboard
  useEffect(() => {
    const checkAndOpenModal = async () => {
      let shouldOpen = params?.openBusinessModal === 'true';

      if (!shouldOpen) {
        try {
          const storedFlag = await AsyncStorage.getItem('openBusinessModal');
          console.log('📱 Stored flag from AsyncStorage:', storedFlag);
          shouldOpen = storedFlag === 'true';

          if (shouldOpen) {
            await AsyncStorage.removeItem('openBusinessModal');
            console.log('🗑️ Cleared flag from AsyncStorage');
          }
        } catch (error) {
          console.log('Error reading AsyncStorage:', error);
        }
      }

      console.log('🎯 Should open business modal:', shouldOpen);

      if (shouldOpen) {
        setTimeout(() => {
          setShowBusinessModal(true);
          console.log('✅ Business modal opened');
        }, 500);
      }
    };

    checkAndOpenModal();

    return () => {
      isMounted.current = false;
    };
  }, [params?.openBusinessModal]);

  useEffect(() => {
    if (selectedEvent) {
      console.log(
        'HASHTAGS =>',
        selectedEvent?.event?.hashtags
      );
      console.log(
        'CAPTION =>',
        selectedEvent?.event?.caption
      );
    }
  }, [selectedEvent]);

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get userId from AsyncStorage
  useEffect(() => {
    const getUserId = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          const parsedUser = JSON.parse(storedUserData);
          console.log('USER DATA =>', parsedUser);
          if (parsedUser?.id) {
            setUserId(parsedUser.id.toString());
          }
        }
      } catch (error) {
        console.log('Error fetching user:', error);
      }
    };
    getUserId();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (dateStr: string) => {
    const eventData = eventsByDate[dateStr];
    console.log('SELECTED EVENT =>', JSON.stringify(eventData, null, 2));

    if (eventData) {
      setSelectedEvent({
        date: dateStr,
        event: eventData,
      });
      setCurrentCarouselIndex(0);
    }
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setCustomPrompt('');
    setFeedback('');
    setShowPromptModal(false);
    setCurrentCarouselIndex(0);
    setIsRegenerating(false);
  };

  // Carousel navigation functions
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

  // Business data check function
  const checkBusinessData = async () => {
    if (!userId) return false;

    try {
      setCheckingBusinessData(true);
      const response = await axiosInstance.get(`/business-data/has/${userId}`);
      console.log('Business data check response:', response.data);

      const hasData = response.data?.hasData === true;
      setHasBusinessData(hasData);
      return hasData;
    } catch (error: any) {
      console.log('Business data check error:', error?.response?.data || error);
      setHasBusinessData(false);
      return false;
    } finally {
      setCheckingBusinessData(false);
    }
  };

  const handleDownloadImage = async () => {
    try {
      const imageUrls = selectedEvent?.event?.fullImages || [selectedEvent?.event?.fullImage];
      const validUrls = imageUrls.filter((url: string) => url && typeof url === 'string');

      if (validUrls.length === 0) {
        Alert.alert('Error', 'Image URL not found');
        return;
      }

      let urlsToDownload = validUrls;
      if (validUrls.length > 1) {
        return new Promise((resolve) => {
          Alert.alert(
            'Download Images',
            `You have ${validUrls.length} images. Do you want to download all or just the current one?`,
            [
              { text: 'Current Only', onPress: () => { urlsToDownload = [validUrls[currentCarouselIndex]]; resolve(downloadImages(urlsToDownload)); } },
              { text: 'Download All', onPress: () => { urlsToDownload = validUrls; resolve(downloadImages(urlsToDownload)); } },
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) }
            ],
            { cancelable: true }
          );
        });
      } else {
        await downloadImages(urlsToDownload);
      }
    } catch (error) {
      console.log('DOWNLOAD ERROR =>', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const downloadImages = async (urls: string[]) => {
    try {
      if (Platform.OS === 'web') {
        for (const url of urls) {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.src = url;

          await new Promise((resolve, reject) => {
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  reject('Canvas failed');
                  return;
                }
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                  if (!blob) {
                    reject('Blob creation failed');
                    return;
                  }
                  const downloadUrl = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = downloadUrl;
                  link.download = `calendar_${Date.now()}_${Math.random()}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(downloadUrl);
                  resolve(null);
                }, 'image/png');
              } catch (error) {
                reject(error);
              }
            };
            img.onerror = reject;
          });
        }
        Alert.alert('Success', `${urls.length} image(s) downloaded successfully`);
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow media access');
        return;
      }

      for (const url of urls) {
        const fileUri = FileSystem.documentDirectory + `calendar_${Date.now()}_${Math.random()}.png`;
        const downloadResumable = FileSystem.createDownloadResumable(url, fileUri);
        const result = await downloadResumable.downloadAsync();
        if (result?.uri) {
          await MediaLibrary.saveToLibraryAsync(result.uri);
        }
      }

      Alert.alert('Success', `${urls.length} image(s) downloaded to gallery`);
    } catch (error) {
      console.log('DOWNLOAD IMAGES ERROR =>', error);
      Alert.alert('Error', 'Failed to download images');
    }
  };

  const handleApprove = async () => {
    try {
      const payload = {
        agenda_id: selectedEvent.event.agenda_id,
        day: selectedEvent.event.day,
        decision: 'approve',
      };

      const response = await pythonPost('/social/review-post', payload);

      if (response.data?.success) {
        Alert.alert('Success', 'Post Approved Successfully');
        closeModal();
        await fetchUserAgenda();
      }
    } catch (error: any) {
      console.log('APPROVE ERROR =>', error?.response?.data || error);
      Alert.alert('Error', 'Failed to approve post');
    }
  };

  // Updated handleReject with confirmation and loading
  const handleReject = async () => {
    // Show confirmation alert first
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
              // Set regenerating state to true
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
                closeModal();
                await fetchUserAgenda();
                return;
              }

              if (response.data?.need_custom_prompt) {
                setShowPromptModal(true);
                setIsRegenerating(false); // Reset loading when showing prompt modal
                return;
              }
            } catch (error: any) {
              console.log('REJECT ERROR =>', error?.response?.data || error);
              Alert.alert('Error', 'Failed to regenerate post');
            } finally {
              // Reset regenerating state
              setIsRegenerating(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleCustomRegenerate = async () => {
    try {
      if (!customPrompt.trim()) {
        Alert.alert('Error', 'Please enter custom prompt');
        return;
      }

      // Set regenerating state for custom regeneration
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
        closeModal();
        await fetchUserAgenda();
      }
    } catch (error: any) {
      console.log('CUSTOM REGENERATE ERROR =>', error?.response?.data || error);
      Alert.alert('Error', 'Failed to regenerate');
    } finally {
      setIsRegenerating(false);
    }
  };

  const openBusinessModal = () => {
    if (!hasBusinessData) {
      setShowBusinessModal(true);
    }
  };

  const closeBusinessModal = () => {
    setShowBusinessModal(false);
    setBusinessDataFiles([]);
    setReferenceImgFiles([]);
    setWebsiteUrl('');
    setDescription('');
    setBusinessName('');
    setBusinessType('');
    setEmail('');
    setAddress('');
    setPhone('');
    AsyncStorage.removeItem('openBusinessModal').catch(console.log);
    router.back();
  };

  const pickBusinessFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: '*/*',
      });

      if (!result.canceled) {
        setBusinessDataFiles(result.assets);
        console.log('BUSINESS FILES =>', JSON.stringify(result.assets, null, 2));
      }
    } catch (error) {
      console.log('Business files pick error:', error);
    }
  };

  const pickReferenceImages = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Gallery permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });

      if (!result.canceled) {
        setReferenceImgFiles(result.assets);
        console.log('REFERENCE FILES =>', JSON.stringify(result.assets, null, 2));
      }
    } catch (error) {
      console.log('Reference images pick error:', error);
    }
  };

  const handleSendBusinessData = async () => {
    console.log('🚀 Starting file upload...');
    console.log('Business Data Files count:', businessDataFiles.length);
    console.log('Reference Images count:', referenceImgFiles.length);

    // Validate required fields
    if (!businessName.trim()) {
      Alert.alert('Validation Error', 'Business Name is required');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return;
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Phone number is required');
      return;
    }

    // Phone validation - exactly 10 digits
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      Alert.alert('Validation Error', 'Phone number must be exactly 10 digits');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Validation Error', 'Address is required');
      return;
    }

    const formData = new FormData();

    // Append new business fields
    formData.append('businessName', businessName.trim());
    formData.append('businessType', businessType.trim());
    formData.append('email', email.trim().toLowerCase());
    formData.append('phone', cleanPhone);
    formData.append('address', address.trim());

    for (const file of businessDataFiles) {
      const fileName = file.name || 'business.txt';
      const fileType = fileName.endsWith('.pdf') ? 'application/pdf' :
        fileName.endsWith('.txt') ? 'text/plain' :
          fileName.endsWith('.doc') ? 'application/msword' :
            fileName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
              fileName.endsWith('.sql') ? 'application/sql' :
                'application/octet-stream';

      formData.append('businessFile', {
        uri: file.uri,
        name: fileName,
        type: fileType,
      } as any);
    }

    for (const file of referenceImgFiles) {
      const fileType = file.mimeType ||
        (file.fileName?.endsWith('.png') ? 'image/png' :
          file.fileName?.endsWith('.jpg') || file.fileName?.endsWith('.jpeg') ? 'image/jpeg' :
            'image/jpeg');

      formData.append('referenceImage', {
        uri: file.uri,
        name: file.fileName || file.name || 'image.jpg',
        type: fileType,
      } as any);
    }

    if (websiteUrl.trim()) {
      formData.append('websiteUrl', websiteUrl.trim());
    }

    if (description.trim()) {
      formData.append('description', description.trim());
    }

    formData.append('userId', userId);

    try {
      setIsUploading(true);

      const response = await axiosInstance.post(
        '/business-data',
        formData,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'multipart/form-data',
          },
          transformRequest: (data) => data,
          timeout: 30000,
        }
      );

      console.log('✅ Upload response:', response.data);

      if (response.data?.success || response.status === 200) {
        Alert.alert('Success', response.data.message || 'Business data uploaded successfully');
        closeBusinessModal();

        await AsyncStorage.removeItem('openBusinessModal');
        await AsyncStorage.removeItem('shouldOpenBusinessModal');

        if (userId) {
          await fetchUserAgenda();
        }

        setHasBusinessData(true);
      } else {
        Alert.alert('Error', 'Failed to upload business data');
      }
    } catch (error: any) {
      console.log('❌ FULL ERROR =>', JSON.stringify(error, null, 2));

      if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
        Alert.alert('Error', 'Connection timeout. Please check if the server is running and accessible.');
      } else if (error?.message?.includes('Network Error')) {
        Alert.alert('Error', 'Network error. Please check your connection and server IP address.');
      } else if (error?.response?.data?.error) {
        Alert.alert('Validation Error', error.response.data.error);
      } else {
        Alert.alert(
          'Error',
          error?.response?.data?.error || error?.message || 'Upload failed'
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  const fetchUserAgenda = async () => {
    try {
      console.log('📅 Fetching agenda for userId:', userId);

      const response = await pythonGet(`/social/user-agenda/${userId}`);
      console.log('📊 Raw AGENDA RESPONSE:', JSON.stringify(response.data, null, 2));

      const formattedEvents: any = {};
      const allAgendaData = response.data?.data || [];

      if (allAgendaData.length > 0) {
        setIsCalendarGenerated(true);
      } else {
        setIsCalendarGenerated(false);
      }

      allAgendaData.forEach((agendaItem: any) => {
        const agendaTable = agendaItem.agenda_table || [];
        console.log(`📅 Agenda ${agendaItem.agenda_id} has ${agendaTable.length} posts`);

        agendaTable.forEach((post: any, index: number) => {
          console.log(
            'POST HASHTAGS =>',
            JSON.stringify(post.generated_hashtags, null, 2)
          );
          let imageUrls: string[] = [];

          if (post.generated_image_url) {
            if (Array.isArray(post.generated_image_url)) {
              imageUrls = post.generated_image_url.filter((url: any) => {
                const isValid = typeof url === 'string' && url.length > 0;
                if (!isValid) console.log('Invalid URL found:', url);
                return isValid;
              });
            } else if (typeof post.generated_image_url === 'string') {
              imageUrls = [post.generated_image_url];
            } else if (typeof post.generated_image_url === 'object') {
              console.log('Image URL is object:', post.generated_image_url);
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

          console.log(`📸 Post for ${post.real_date} image URLs (${processedUrls.length}):`, processedUrls);

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

      if (Platform.OS === 'android') {
        setTimeout(() => {
          setCalendarEvents({ ...formattedEvents });
        }, 100);
      }

    } catch (error: any) {
      console.log('❌ FETCH AGENDA ERROR =>', error?.response?.data || error);
      console.log('Error stack:', error?.stack);
      Alert.alert('Error', 'Failed to fetch calendar');
    }
  };

  const handleGenerateCalendar = async () => {
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please login again.');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await pythonPost(`/social/create-agenda-for-user/${userId}`, {});

      if (!response.data?.success) {
        Alert.alert('Error', response.data?.message || 'Calendar generation failed');
        return;
      }

      Alert.alert('Success', 'Calendar Generated Successfully');
      await fetchUserAgenda();
    } catch (error: any) {
      console.log('GENERATE ERROR =>', error?.response?.data || error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to generate calendar');
    } finally {
      setIsGenerating(false);
    }
  };

  // FIXED: renderCarouselItem with proper aspect ratio
  const renderCarouselItem = ({ item }: { item: string }) => {
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
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / modalWidth);
    setCurrentCarouselIndex(newIndex);
  };

  const calendarDays = useMemo(() => {
    let days: any[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      let day = prevMonthDays - i;
      let date = new Date(year, month - 1, day);
      days.push({
        date,
        dateStr: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      let date = new Date(year, month, day);
      days.push({
        date,
        dateStr: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        isCurrentMonth: true,
      });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      let date = new Date(year, month + 1, day);
      days.push({
        date,
        dateStr: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate, eventsByDate, firstDayIndex, prevMonthDays, daysInMonth, year, month]);

  useEffect(() => {
    if (userId) {
      fetchUserAgenda();
      checkBusinessData();
    }
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === 'android' && Object.keys(calendarEvents).length > 0) {
      console.log('🖼️ Preloading images for Android...');
      const allImages = Object.values(calendarEvents).map((event: any) => event.thumbnail).filter(Boolean);
      allImages.forEach((uri: string) => {
        if (uri && uri !== 'https://via.placeholder.com/100x100?text=No+Image') {
          Image.prefetch(uri).catch(err => console.log('Prefetch failed:', err));
        }
      });
    }
  }, [calendarEvents]);

  useEffect(() => {
    if (selectedEvent) {
      console.log(
        'MODAL IMAGE URL =>',
        selectedEvent?.event?.fullImage
      );
      console.log(
        'MODAL IMAGES =>',
        selectedEvent?.event?.fullImages
      );
    }
  }, [selectedEvent]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Calculate dynamic sizes based on screen dimensions
  const isTablet = width >= 768;
  const isWeb = Platform.OS === 'web';
  const modalWidth = isWeb ? Math.min(600, width * 0.9) : (isTablet ? width * 0.7 : width * 0.9);

  // Image container height - keeping it flexible
  const imageContainerHeight = height * 0.42;

  return (
    <>
      <Stack.Screen options={{
        headerShown: true,
        title: 'Calendar',
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
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.heading}>Content Calendar</Text>

            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[
                  styles.generateBtn,
                  (isGenerating || isCalendarGenerated) && { backgroundColor: '#94a3b8' },
                ]}
                onPress={handleGenerateCalendar}
                disabled={isGenerating || isCalendarGenerated}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="calendar" size={16} color="#fff" />
                    <Text style={styles.businessBtnText}>
                      {isCalendarGenerated ? 'Calendar Generated' : 'Generate Calendar'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.businessBtn,
                  (hasBusinessData || checkingBusinessData) && styles.disabledBusinessBtn
                ]}
                onPress={!hasBusinessData ? openBusinessModal : undefined}
                disabled={hasBusinessData || checkingBusinessData}
              >
                {checkingBusinessData ? (
                  <ActivityIndicator size="small" color="#94a3b8" />
                ) : (
                  <>
                    <FontAwesome5 name="briefcase" size={16} color={hasBusinessData ? "#94a3b8" : "#fff"} />
                    <Text style={[styles.businessBtnText, hasBusinessData && styles.disabledBusinessBtnText]}>
                      {hasBusinessData ? 'Business Data Added' : 'Add Business Data'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Month Header */}
          <View style={styles.monthContainer}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthNames[month]} {year}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.iconBtn}>
              <Ionicons name="chevron-forward" size={24} color="#111" />
            </TouchableOpacity>
          </View>

          {/* Week Days */}
          <View style={styles.weekRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <View key={day} style={styles.weekDay}>
                <Text style={styles.weekText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar */}
          <View style={styles.calendarContainer}>
            {calendarDays.map(({ date, dateStr, isCurrentMonth }, idx) => {
              const event = eventsByDate[dateStr];
              const isToday = date.toDateString() === today.toDateString();
              const hasEvent = !!event;

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => hasEvent && handleDateClick(dateStr)}
                  style={[styles.dayCard, !isCurrentMonth && { backgroundColor: '#f8fafc' }]}
                >
                  <View style={styles.dayHeader}>
                    <View style={[styles.dayCircle, isToday && { backgroundColor: '#4f46e5' }]}>
                      <Text style={[styles.dayText, isToday && { color: '#fff' }, !isCurrentMonth && { color: '#cbd5e1' }]}>
                        {date.getDate()}
                      </Text>
                    </View>
                  </View>
                  {hasEvent && (
                    <View style={{ marginTop: 6 }}>
                      {event.thumbnail && event.thumbnail !== 'https://via.placeholder.com/100x100?text=No+Image' ? (
                        <Image
                          source={{ uri: event.thumbnail }}
                          style={styles.thumbnail}
                          resizeMode="cover"
                          onError={(e) => {
                            console.log('❌ Image load error for', dateStr, ':', e.nativeEvent.error);
                            console.log('Failed URL:', event.thumbnail);
                          }}
                          onLoad={() => console.log('✅ Image loaded for', dateStr)}
                        />
                      ) : (
                        <View style={[styles.thumbnail, { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="image-outline" size={24} color="#94a3b8" />
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                        {event.imageType && (
                          <View style={{ backgroundColor: '#e0e7ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 }}>
                            <Text style={{ fontSize: 8, color: '#4338ca', fontWeight: '600' }}>{event.imageType}</Text>
                          </View>
                        )}

                        {event.festival && (
                          <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, marginTop: 2 }}>
                            <Text style={{ fontSize: 8, color: '#92400e', fontWeight: '600' }}>🎉 {event.festival}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Responsive Event Modal - Full Image Display */}
      <Modal visible={!!selectedEvent} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.eventModal,
                  {
                    width: modalWidth,
                    height: height * 0.88,
                  },
                ]}
              >
                {selectedEvent && selectedEvent.event && (
                  <View style={styles.modalContainer}>
                    <View
                      style={{
                        width: '100%',
                      }}
                    >
                      {selectedEvent.event.isCarousel && selectedEvent.event.fullImages?.length > 1 ? (
                        // Carousel View with Navigation Arrows
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
                            contentContainerStyle={{
                              justifyContent: 'center',
                            }}
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

                          {/* Left Navigation Arrow */}
                          {currentCarouselIndex > 0 && (
                            <TouchableOpacity
                              style={[styles.navArrow, styles.navArrowLeft]}
                              onPress={goToPrevImage}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="chevron-back" size={32} color="#fff" />
                            </TouchableOpacity>
                          )}

                          {/* Right Navigation Arrow */}
                          {currentCarouselIndex < selectedEvent.event.fullImages.length - 1 && (
                            <TouchableOpacity
                              style={[styles.navArrow, styles.navArrowRight]}
                              onPress={goToNextImage}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="chevron-forward" size={32} color="#fff" />
                            </TouchableOpacity>
                          )}

                          {/* Carousel Pagination Dots */}
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

                          {/* Carousel Counter */}
                          <View style={styles.carouselCounter}>
                            <Text style={styles.carouselCounterText}>
                              {currentCarouselIndex + 1} / {selectedEvent.event.fullImages.length}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        // Single Image View
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
                            source={{ uri: selectedEvent.event.fullImages[0] }}
                            resizeMode="contain"
                            style={{
                              width: '100%',
                              height: imageContainerHeight,
                              marginTop: -20,
                            }}
                          />
                        </View>
                      )}
                      <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                        <Ionicons name="close" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      style={styles.modalScrollView}
                      contentContainerStyle={{
                        paddingBottom: 30,
                      }}
                    >
                      <View style={styles.modalContent}>
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

                        {/* Hashtags - Displayed as pills - MOVED HERE (between date and caption) */}
                        <View style={styles.hashtagContainer}>
                          {Array.isArray(selectedEvent?.event?.hashtags) && selectedEvent.event.hashtags.length > 0 ? (
                            selectedEvent.event.hashtags.map((tag: string, index: number) => (
                              <View key={index} style={styles.hashtagPill}>
                                <Text style={styles.hashtagText}>{tag}</Text>
                              </View>
                            ))
                          ) : selectedEvent?.event?.hashtags && typeof selectedEvent.event.hashtags === 'string' ? (
                            selectedEvent.event.hashtags
                              .split(' ')
                              .filter(Boolean)
                              .map((tag: string, index: number) => (
                                <View key={index} style={styles.hashtagPill}>
                                  <Text style={styles.hashtagText}>{tag}</Text>
                                </View>
                              ))
                          ) : null}
                        </View>

                        {/* Caption */}
                        <View style={styles.captionContainer}>
                          <Text style={styles.caption}>
                            {selectedEvent?.event?.caption}
                          </Text>
                        </View>

                        {/* All 3 Action Buttons in One Row - Download, Regenerate, Approve */}
                        <View style={styles.actionRow}>
                          {/* Download Button - Blue */}
                          <TouchableOpacity 
                            style={styles.downloadBtn} 
                            onPress={handleDownloadImage} 
                            activeOpacity={0.8}
                          >
                            <Ionicons name="download-outline" size={16} color="#fff" />
                            <Text style={styles.actionBtnText} numberOfLines={1}>Download</Text>
                          </TouchableOpacity>

                          {/* Regenerate Button - Red */}
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

                          {/* Approve Button - Green */}
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
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Responsive Business Modal - Updated with new fields */}
      <Modal visible={showBusinessModal} transparent animationType="fade" onRequestClose={closeBusinessModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalOverlay}>
            <View style={[styles.businessModal, { width: modalWidth, maxHeight: height * 0.9 }]}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.businessScrollContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Business Data</Text>
                  <TouchableOpacity onPress={closeBusinessModal} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={26} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Business Name - Required */}
                <Text style={styles.label}>Business Name <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Enter business name"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />

                {/* Business Type */}
                <Text style={[styles.label, { marginTop: 14 }]}>Business Type</Text>
                <TextInput
                  value={businessType}
                  onChangeText={setBusinessType}
                  placeholder="e.g., Restaurant, Retail, Service"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />

                {/* Email - Required */}
                <Text style={[styles.label, { marginTop: 14 }]}>Email <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="business@example.com"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Phone - Required */}
                <Text style={[styles.label, { marginTop: 14 }]}>Phone Number <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter 10 digit phone number"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  keyboardType="phone-pad"
                  maxLength={10}
                />

                {/* Address - Required */}
                <Text style={[styles.label, { marginTop: 14 }]}>Address <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter business address"
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={3}
                />

                {/* Website URL */}
                <Text style={[styles.label, { marginTop: 14 }]}>Website URL</Text>
                <TextInput
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  placeholder="https://example.com"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  keyboardType="url"
                  autoCapitalize="none"
                />

                {/* Description */}
                <Text style={[styles.label, { marginTop: 14 }]}>Description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter description about your business..."
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={3}
                />

                <Text style={[styles.label, { marginTop: 14 }]}>Business Data Files</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={pickBusinessFiles}>
                  <MaterialIcons name="attach-file" size={24} color="#4f46e5" />
                  <Text style={styles.uploadText}>Select Multiple Files</Text>
                </TouchableOpacity>
                {businessDataFiles.map((file: any, index: number) => (
                  <Text key={index} style={styles.fileName}>✓ {file.name}</Text>
                ))}

                <Text style={[styles.label, { marginTop: 14 }]}>Reference Images</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={pickReferenceImages}>
                  <Ionicons name="image" size={24} color="#4f46e5" />
                  <Text style={styles.uploadText}>Select Images</Text>
                </TouchableOpacity>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                  {referenceImgFiles.map((img: any, index: number) => (
                    <Image key={index} source={{ uri: img.uri }} style={styles.previewImage} />
                  ))}
                </ScrollView>

                <View style={styles.bottomBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeBusinessModal}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.sendBtn} disabled={isUploading} onPress={handleSendBusinessData}>
                    {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send Data</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Prompt Modal */}
      <Modal visible={showPromptModal} transparent animationType="slide" onRequestClose={() => setShowPromptModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.businessModal, { width: modalWidth }]}>
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

      {/* Sidebar */}
      <CustomSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
    </>
  );
};

export default CalendarScreen;

const SCREEN_PADDING = 8;
const GAP = 4;
const CELL_SIZE = (width - SCREEN_PADDING * 2 - GAP * 6) / 7;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  menuButton: {
    marginLeft: 16,
    padding: 4,
  },
  heading: { fontSize: width < 400 ? 18 : 22, fontWeight: '700', color: '#111827' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', marginTop: width < 400 ? 10 : 0 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f766e', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginRight: 10 },
  businessBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  businessBtnText: { color: '#fff', fontWeight: '600', fontSize: 13, marginLeft: 6 },
  monthContainer: { backgroundColor: '#fff', marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  monthText: { fontSize: width < 400 ? 15 : 18, fontWeight: '700', color: '#111827' },
  disabledBusinessBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  disabledBusinessBtnText: { color: '#94a3b8' },
  iconBtn: { padding: 6 },
  weekRow: { flexDirection: 'row', backgroundColor: '#e2e8f0' },
  weekDay: { width: width / 7, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f8fafc' },
  weekText: { fontWeight: '600', fontSize: width < 400 ? 10 : 12, color: '#475569' },
  calendarContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4, paddingBottom: 20 },
  dayCard: { width: CELL_SIZE, minHeight: width < 400 ? 90 : 115, backgroundColor: '#fff', marginBottom: 4, marginRight: 4, borderRadius: 10, padding: 4 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCircle: { width: 26, height: 26, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 12, fontWeight: '600', color: '#111827' },
  thumbnail: { width: '100%', height: width < 400 ? 38 : 52, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  eventModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    flex: 0,
  },
  modalContainer: { flex: 1 },
  closeBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20, zIndex: 10 },
  modalScrollView: { maxHeight: height * 0.5 },
  modalContent: { padding: 20 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  imageTypeTag: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  carouselTag: { backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  festivalTag: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 8 },
  festivalTagText: { color: '#92400e', fontSize: 12, fontWeight: '600' },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  dateText: { color: '#4f46e5', fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 16, color: '#334155', lineHeight: 24, marginBottom: 12 },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  hashtagPill: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  hashtagText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '500',
  },
  captionContainer: {
    marginBottom: 14,
  },
  tagText: { color: '#4f46e5', fontSize: 12, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
    minWidth: 0,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
    minWidth: 0,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
    minWidth: 0,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
    textAlign: 'center',
    flexShrink: 0,
  },
  downloadText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  businessModal: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  businessScrollContent: { flexGrow: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalCloseBtn: { padding: 4 },
  label: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 8 },
  requiredStar: { color: '#dc2626', fontSize: 16 },
  uploadBox: { borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  uploadText: { marginTop: 6, color: '#4f46e5', fontWeight: '600' },
  fileName: { marginTop: 6, color: '#16a34a', fontSize: 13 },
  previewImage: { width: 70, height: 70, borderRadius: 10, marginRight: 10 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, marginTop: 6, fontSize: 14, color: '#111827' },
  bottomBtns: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 28, gap: 12 },
  cancelBtn: { backgroundColor: '#e2e8f0', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  cancelText: { color: '#334155', fontWeight: '700' },
  sendBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, minWidth: 120, alignItems: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
  // Carousel styles
  carouselWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
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
  disabledRegenerateBtn: {
    opacity: 0.7,
  },
});