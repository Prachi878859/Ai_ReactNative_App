import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Platform options
const platforms = [
  { id: "1", name: "Instagram", icon: "logo-instagram", color: "#E4405F" },
  { id: "2", name: "Facebook", icon: "logo-facebook", color: "#1877F2" },
  { id: "3", name: "Twitter", icon: "logo-twitter", color: "#1DA1F2" },
  { id: "4", name: "LinkedIn", icon: "logo-linkedin", color: "#0A66C2" },
  { id: "5", name: "YouTube", icon: "logo-youtube", color: "#FF0000" },
  { id: "6", name: "Pinterest", icon: "logo-pinterest", color: "#BD081C" },
];

// Days of the week
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Months
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Years for selector
const YEARS = [2023, 2024, 2025, 2026, 2027];

export default function SchedulePostScreen() {
  const router = useRouter();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [autoPost, setAutoPost] = useState(false);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  
  // Time picker state
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState(new Date().getMinutes());
  const [isAM, setIsAM] = useState(new Date().getHours() < 12);

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter(id => id !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  const handleSchedule = () => {
    if (selectedPlatforms.length === 0) {
      Alert.alert("Error", "Please select at least one platform");
      return;
    }

    if (selectedDateTime <= new Date()) {
      Alert.alert("Error", "Please select a future date and time");
      return;
    }

    const selectedPlatformNames = selectedPlatforms.map(id => 
      platforms.find(p => p.id === id)?.name
    ).join(", ");

    Alert.alert(
      "Post Scheduled",
      `Your post has been scheduled on ${selectedPlatformNames}\n\nDate & Time: ${formatDate(selectedDateTime)} at ${formatTime(selectedDateTime)}\n\nAuto-post: ${autoPost ? "ON" : "OFF"}`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  // Calendar functions
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days: (number | null)[] = [];
    
    // Previous month days
    const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(prevMonthDays - i);
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(i);
    }
    
    return days;
  };

  const isSelectedDate = (day: number, monthOffset: number = 0) => {
    const date = new Date(currentYear, currentMonth + monthOffset, day);
    return date.toDateString() === selectedDateTime.toDateString();
  };

  const isToday = (day: number, monthOffset: number = 0) => {
    const today = new Date();
    const date = new Date(currentYear, currentMonth + monthOffset, day);
    return date.toDateString() === today.toDateString();
  };

  const handleDateSelect = (day: number, monthOffset: number = 0) => {
    const newDate = new Date(currentYear, currentMonth + monthOffset, day);
    newDate.setHours(selectedHour, selectedMinute);
    setSelectedDateTime(newDate);
    setShowCalendar(false);
  };

  const changeMonth = (increment: number) => {
    let newMonth = currentMonth + increment;
    let newYear = currentYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Time picker functions
  const updateDateTimeFromTimePicker = () => {
    let hour = selectedHour;
    if (!isAM && hour !== 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    
    const newDateTime = new Date(selectedDateTime);
    newDateTime.setHours(hour, selectedMinute);
    setSelectedDateTime(newDateTime);
    setShowTimePickerModal(false);
  };

  const incrementHour = () => {
    let newHour = selectedHour + 1;
    let newAM = isAM;
    if (newHour > 12) {
      newHour = 1;
      newAM = !isAM;
    }
    setSelectedHour(newHour);
    setIsAM(newAM);
  };

  const decrementHour = () => {
    let newHour = selectedHour - 1;
    let newAM = isAM;
    if (newHour < 1) {
      newHour = 12;
      newAM = !isAM;
    }
    setSelectedHour(newHour);
    setIsAM(newAM);
  };

  const incrementMinute = () => {
    setSelectedMinute(prev => prev + 1 >= 60 ? 0 : prev + 1);
  };

  const decrementMinute = () => {
    setSelectedMinute(prev => prev - 1 < 0 ? 59 : prev - 1);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const calendarDays = generateCalendarDays();

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#ef4b56" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule Post</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Platform Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Platforms <Text style={styles.requiredStar}>*</Text></Text>
            
            <TouchableOpacity 
              style={styles.dropdown}
              onPress={() => setShowPlatformDropdown(!showPlatformDropdown)}
            >
              <Text style={selectedPlatforms.length > 0 ? styles.dropdownText : styles.placeholderText}>
                {selectedPlatforms.length > 0 
                  ? `${selectedPlatforms.length} platform(s) selected` 
                  : "Choose platforms"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            {showPlatformDropdown && (
              <View style={styles.platformList}>
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 300 }}>
                  {platforms.map((platform) => (
                    <TouchableOpacity
                      key={platform.id}
                      style={styles.platformItem}
                      onPress={() => togglePlatform(platform.id)}
                    >
                      <View style={styles.platformInfo}>
                        <Ionicons name={platform.icon as any} size={24} color={platform.color} />
                        <Text style={styles.platformName}>{platform.name}</Text>
                      </View>
                      <View style={styles.checkbox}>
                        {selectedPlatforms.includes(platform.id) && (
                          <Ionicons name="checkmark-circle" size={24} color="#ef4b56" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {selectedPlatforms.length > 0 && (
              <View style={styles.selectedTags}>
                {selectedPlatforms.map(platformId => {
                  const platform = platforms.find(p => p.id === platformId);
                  return platform ? (
                    <View key={platform.id} style={styles.tag}>
                      <Ionicons name={platform.icon as any} size={16} color={platform.color} />
                      <Text style={styles.tagText}>{platform.name}</Text>
                      <TouchableOpacity onPress={() => togglePlatform(platform.id)}>
                        <Ionicons name="close-circle" size={16} color="#999" />
                      </TouchableOpacity>
                    </View>
                  ) : null;
                })}
              </View>
            )}
          </View>

          {/* Date Picker Button */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Date <Text style={styles.requiredStar}>*</Text></Text>
            
            <TouchableOpacity 
              style={styles.dateTimePickerButton}
              onPress={() => {
                setCurrentMonth(selectedDateTime.getMonth());
                setCurrentYear(selectedDateTime.getFullYear());
                setShowCalendar(true);
              }}
            >
              <View style={styles.dateTimeIconContainer}>
                <Ionicons name="calendar-outline" size={24} color="#ef4b56" />
              </View>
              <View style={styles.dateTimeTextContainer}>
                <Text style={styles.dateTimeLabel}>Select Date</Text>
                <Text style={styles.dateText}>{formatDate(selectedDateTime)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Time Picker Button */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Time <Text style={styles.requiredStar}>*</Text></Text>
            
            <TouchableOpacity 
              style={styles.dateTimePickerButton}
              onPress={() => {
                let hours = selectedDateTime.getHours();
                let ampm = hours >= 12 ? 'PM' : 'AM';
                let displayHour = hours % 12;
                displayHour = displayHour === 0 ? 12 : displayHour;
                setSelectedHour(displayHour);
                setSelectedMinute(selectedDateTime.getMinutes());
                setIsAM(ampm === 'AM');
                setShowTimePickerModal(true);
              }}
            >
              <View style={styles.dateTimeIconContainer}>
                <Ionicons name="time-outline" size={24} color="#ef4b56" />
              </View>
              <View style={styles.dateTimeTextContainer}>
                <Text style={styles.dateTimeLabel}>Select Time</Text>
                <Text style={styles.timeText}>{formatTime(selectedDateTime)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Quick Select Options */}
          <View style={styles.quickSelectContainer}>
            <Text style={styles.quickSelectLabel}>Quick Schedule:</Text>
            <View style={styles.quickSelectButtons}>
              <TouchableOpacity 
                style={styles.quickButton}
                onPress={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(10, 0, 0);
                  setSelectedDateTime(tomorrow);
                }}
              >
                <Ionicons name="sunny-outline" size={16} color="#ef4b56" />
                <Text style={styles.quickButtonText}>Tomorrow 10 AM</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickButton}
                onPress={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  nextWeek.setHours(12, 0, 0);
                  setSelectedDateTime(nextWeek);
                }}
              >
                <Ionicons name="calendar-outline" size={16} color="#ef4b56" />
                <Text style={styles.quickButtonText}>Next Week 12 PM</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickButton}
                onPress={() => {
                  const evening = new Date();
                  evening.setHours(18, 0, 0);
                  if (evening > new Date()) {
                    setSelectedDateTime(evening);
                  }
                }}
              >
                <Ionicons name="moon-outline" size={16} color="#ef4b56" />
                <Text style={styles.quickButtonText}>Today 6 PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Auto Post Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <Ionicons name="rocket-outline" size={24} color="#ef4b56" />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Auto Post</Text>
                <Text style={styles.toggleDescription}>
                  Automatically post at scheduled time
                </Text>
              </View>
            </View>
            <Switch
              value={autoPost}
              onValueChange={setAutoPost}
              trackColor={{ false: "#ddd", true: "#ef4b56" }}
              thumbColor="#fff"
            />
          </View>

          {/* Schedule Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Schedule Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Ionicons name="apps-outline" size={20} color="#666" />
                <Text style={styles.summaryLabel}>Platforms:</Text>
                <Text style={styles.summaryValue}>
                  {selectedPlatforms.length > 0 
                    ? selectedPlatforms.map(id => platforms.find(p => p.id === id)?.name).join(", ")
                    : "None selected"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.summaryLabel}>Date:</Text>
                <Text style={styles.summaryValue}>{formatDate(selectedDateTime)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.summaryLabel}>Time:</Text>
                <Text style={styles.summaryValue}>{formatTime(selectedDateTime)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="sync-outline" size={20} color="#666" />
                <Text style={styles.summaryLabel}>Auto Post:</Text>
                <Text style={[styles.summaryValue, autoPost ? styles.activeText : styles.inactiveText]}>
                  {autoPost ? "ON" : "OFF"}
                </Text>
              </View>
            </View>
          </View>

          {/* Schedule Button */}
          <TouchableOpacity style={styles.scheduleButton} onPress={handleSchedule}>
            <Ionicons name="calendar-clear-outline" size={20} color="#fff" />
            <Text style={styles.scheduleButtonText}>Schedule Post</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Month/Year selector */}
            <View style={styles.monthYearContainer}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={24} color="#ef4b56" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.monthYearSelector}
                onPress={() => setShowYearPicker(!showYearPicker)}
              >
                <Text style={styles.monthYearText}>
                  {MONTHS[currentMonth]} {currentYear}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={24} color="#ef4b56" />
              </TouchableOpacity>
            </View>

            {/* Year Picker */}
            {showYearPicker && (
              <View style={styles.yearPickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {YEARS.map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.yearItem, currentYear === year && styles.selectedYearItem]}
                      onPress={() => {
                        setCurrentYear(year);
                        setShowYearPicker(false);
                      }}
                    >
                      <Text style={[styles.yearText, currentYear === year && styles.selectedYearText]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Weekday headers */}
            <View style={styles.weekdayContainer}>
              {WEEKDAYS.map(day => (
                <Text key={day} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar days */}
            <View style={styles.calendarDaysContainer}>
              {calendarDays.map((day, index) => {
                const isPrevMonth = index < getFirstDayOfMonth(currentMonth, currentYear);
                const isNextMonth = index >= getFirstDayOfMonth(currentMonth, currentYear) + getDaysInMonth(currentMonth, currentYear);
                const dayValue = day !== null ? day : 0;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      isSelectedDate(dayValue, isPrevMonth ? -1 : isNextMonth ? 1 : 0) && styles.selectedDay,
                      isToday(dayValue, isPrevMonth ? -1 : isNextMonth ? 1 : 0) && styles.todayDay,
                    ]}
                    onPress={() => {
                      if (dayValue > 0) {
                        let monthOffset = 0;
                        if (isPrevMonth) monthOffset = -1;
                        if (isNextMonth) monthOffset = 1;
                        handleDateSelect(dayValue, monthOffset);
                      }
                    }}
                    disabled={dayValue === 0}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isPrevMonth && styles.otherMonthText,
                        isNextMonth && styles.otherMonthText,
                        isSelectedDate(dayValue, isPrevMonth ? -1 : isNextMonth ? 1 : 0) && styles.selectedDayText,
                        isToday(dayValue, isPrevMonth ? -1 : isNextMonth ? 1 : 0) && styles.todayDayText,
                      ]}
                    >
                      {dayValue !== 0 ? dayValue : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.calendarFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCalendar(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.okButton}
                onPress={() => setShowCalendar(false)}
              >
                <Text style={styles.okButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Time</Text>
              <View style={styles.amPmButtons}>
                <TouchableOpacity
                  style={[styles.amPmButton, isAM && styles.activeAmPm]}
                  onPress={() => setIsAM(true)}
                >
                  <Text style={[styles.amPmText, isAM && styles.activeAmPmText]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.amPmButton, !isAM && styles.activeAmPm]}
                  onPress={() => setIsAM(false)}
                >
                  <Text style={[styles.amPmText, !isAM && styles.activeAmPmText]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.timePickerContainer}>
              {/* Hour Picker */}
              <View style={styles.timeColumn}>
                <TouchableOpacity onPress={incrementHour}>
                  <Ionicons name="chevron-up" size={32} color="#666" />
                </TouchableOpacity>
                <Text style={styles.timeValue}>{selectedHour}</Text>
                <TouchableOpacity onPress={decrementHour}>
                  <Ionicons name="chevron-down" size={32} color="#666" />
                </TouchableOpacity>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              {/* Minute Picker */}
              <View style={styles.timeColumn}>
                <TouchableOpacity onPress={incrementMinute}>
                  <Ionicons name="chevron-up" size={32} color="#666" />
                </TouchableOpacity>
                <Text style={styles.timeValue}>
                  {selectedMinute < 10 ? `0${selectedMinute}` : selectedMinute}
                </Text>
                <TouchableOpacity onPress={decrementMinute}>
                  <Ionicons name="chevron-down" size={32} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.timePickerFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowTimePickerModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.okButton}
                onPress={updateDateTimeFromTimePicker}
              >
                <Text style={styles.okButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  topHeader: {
    height: 70,
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ef4b56",
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  requiredStar: {
    color: "#ef4b56",
    fontSize: 16,
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dropdownText: {
    fontSize: 16,
    color: "#000",
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
  },
  platformList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  platformItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  platformInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  platformName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  checkbox: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 14,
    color: "#333",
  },
  dateTimePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dateTimeIconContainer: {
    marginRight: 15,
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  quickSelectContainer: {
    marginBottom: 25,
  },
  quickSelectLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  quickSelectButtons: {
    flexDirection: "row",
    gap: 12,
  },
  quickButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f2f2f2",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  quickButtonText: {
    fontSize: 12,
    color: "#ef4b56",
    fontWeight: "500",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  toggleDescription: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  summaryContainer: {
    marginBottom: 25,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    width: 70,
  },
  summaryValue: {
    fontSize: 14,
    color: "#000",
    flex: 1,
  },
  activeText: {
    color: "#ef4b56",
    fontWeight: "600",
  },
  inactiveText: {
    color: "#999",
  },
  scheduleButton: {
    backgroundColor: "#ef4b56",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#ef4b56",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    padding: 20,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  monthYearContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthYearSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  yearPickerContainer: {
    marginBottom: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  yearItem: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
  },
  selectedYearItem: {
    backgroundColor: "#ef4b56",
  },
  yearText: {
    fontSize: 16,
    color: "#666",
  },
  selectedYearText: {
    color: "#fff",
  },
  weekdayContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    width: 40,
    textAlign: "center",
  },
  calendarDaysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDayText: {
    fontSize: 16,
    color: "#000",
  },
  selectedDay: {
    backgroundColor: "#ef4b56",
    borderRadius: 25,
  },
  selectedDayText: {
    color: "#fff",
    fontWeight: "bold",
  },
  todayDay: {
    borderWidth: 1,
    borderColor: "#ef4b56",
    borderRadius: 25,
  },
  todayDayText: {
    color: "#ef4b56",
    fontWeight: "bold",
  },
  otherMonthText: {
    color: "#ccc",
  },
  calendarFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 15,
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
  },
  okButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#ef4b56",
    borderRadius: 8,
  },
  okButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  // Time Picker Modal
  timePickerModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "80%",
    padding: 20,
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  amPmButtons: {
    flexDirection: "row",
    gap: 10,
  },
  amPmButton: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  activeAmPm: {
    backgroundColor: "#ef4b56",
    borderColor: "#ef4b56",
  },
  amPmText: {
    fontSize: 14,
    color: "#666",
  },
  activeAmPmText: {
    color: "#fff",
  },
  timePickerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  timeColumn: {
    alignItems: "center",
    gap: 10,
  },
  timeValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#000",
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#000",
    marginHorizontal: 20,
  },
  timePickerFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
});