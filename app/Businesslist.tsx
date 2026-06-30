import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface Contact {
  id: string;
  personName: string;
  businessName: string;
  mobileNo: string;
  email: string;
}

export default function BusinesslistScreen() {
  const [contacts] = useState<Contact[]>([
    {
      id: "1",
      personName: "Rajesh Kumar",
      businessName: "Rajesh Electricals",
      mobileNo: "+91 98765 43210",
      email: "rajesh@electricals.com",
    },
    {
      id: "2",
      personName: "Priya Sharma",
      businessName: "Sharma Enterprises",
      mobileNo: "+91 87654 32109",
      email: "priya@sharmaenterprises.com",
    },
    {
      id: "3",
      personName: "Amit Patel",
      businessName: "Patel Constructions",
      mobileNo: "+91 76543 21098",
      email: "amit@patelcon.com",
    },
    {
      id: "4",
      personName: "Neha Gupta",
      businessName: "Gupta Trading Co.",
      mobileNo: "+91 65432 10987",
      email: "neha@guptatrading.com",
    },
    {
      id: "5",
      personName: "Suresh Reddy",
      businessName: "Reddy Industries",
      mobileNo: "+91 54321 09876",
      email: "suresh@reddyind.com",
    },
  ]);

  const renderItem = ({ item }: { item: Contact }) => (
    <View style={styles.card}>
      <Text style={styles.personName}>{item.personName}</Text>
      <Text style={styles.businessName}>{item.businessName}</Text>

      <View style={styles.divider} />

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.mobileNo}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.email}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          gestureEnabled: true,
          animation: "none"
        }} 
      />

      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={styles.topHeader}>
          <Text style={styles.headerTitle}>Business List</Text>
        </View>

        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No Contacts Found
            </Text>
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
  personName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  businessName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#555",
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 12,
  },
  detailsContainer: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  topHeader: {
    height: 70,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ef4b56",
  },
});