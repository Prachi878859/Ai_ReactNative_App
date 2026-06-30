import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Service {
  id: string;
  serviceName: string;
  description: string;
  price?: string;
  duration?: string;
}

export default function ServiceListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const businessId = params.id as string;
  const businessName = params.businessName as string;

  const [services] = useState<Service[]>([
    {
      id: "1",
      serviceName: "Wiring Installation",
      description: "Complete house wiring installation with safety standards. Includes conduit pipes, wires, and switches.",
      price: "₹5000 - ₹15000",
      duration: "2-3 days",
    },
    {
      id: "2",
      serviceName: "Lighting Fixing",
      description: "Installation of LED lights, tube lights, and decorative lighting fixtures.",
      price: "₹2000 - ₹8000",
      duration: "1 day",
    },
    {
      id: "3",
      serviceName: "Fan Installation",
      description: "Ceiling fan, exhaust fan, and wall fan installation with proper balancing.",
      price: "₹500 - ₹1500 per fan",
      duration: "2-3 hours",
    },
    {
      id: "4",
      serviceName: "Switch Board Repair",
      description: "Repair and replacement of switch boards, sockets, and regulators.",
      price: "₹300 - ₹1000",
      duration: "1-2 hours",
    },
    {
      id: "5",
      serviceName: "MCB Distribution Board",
      description: "Installation of MCB distribution board with proper wiring and labeling.",
      price: "₹3000 - ₹10000",
      duration: "1-2 days",
    },
  ]);

  const renderItem = ({ item }: { item: Service }) => (
    <View style={styles.card}>
      <View style={styles.serviceHeader}>
        <Ionicons name="construct-outline" size={24} color="#ef4b56" />
        <Text style={styles.serviceName}>{item.serviceName}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="document-text-outline" size={16} color="#666" />
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>

        {item.price && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              <Text style={styles.label}>Price: </Text>
              {item.price}
            </Text>
          </View>
        )}

        {item.duration && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              <Text style={styles.label}>Duration: </Text>
              {item.duration}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          gestureEnabled: true,
        }} 
      />

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />

        {/* Custom Header with Back Button */}
        <View style={styles.topHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#ef4b56" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Services</Text>
            <Text style={styles.businessSubtitle}>{businessName }</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No Services Found</Text>
            </View>
          }
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
    paddingTop: 15,
  },
  card: {
    backgroundColor: "#f2f2f2",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 12,
  },
  detailsContainer: {
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: "#555",
    flex: 1,
    lineHeight: 20,
  },
  label: {
    fontWeight: "600",
    color: "#000",
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
  headerTextContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ef4b56",
  },
  businessSubtitle: {
    fontSize: 12,
    color: "#fff",
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 10,
  },
});