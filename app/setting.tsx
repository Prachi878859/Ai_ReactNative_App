import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CustomSidebar from "./Sidebar";

// Social media accounts data
const socialAccounts = [
  { 
    id: "1", 
    name: "Instagram", 
    icon: "logo-instagram", 
    color: "#E4405F",
    username: "@john_doe",
    connected: true,
    email: "john.doe@gmail.com"
  },
  { 
    id: "2", 
    name: "Facebook", 
    icon: "logo-facebook", 
    color: "#1877F2",
    username: "John Doe",
    connected: true,
    email: "john.doe@gmail.com"
  },
  { 
    id: "3", 
    name: "Twitter", 
    icon: "logo-twitter", 
    color: "#1DA1F2",
    username: "@john_doe",
    connected: false,
  },
  { 
    id: "4", 
    name: "LinkedIn", 
    icon: "logo-linkedin", 
    color: "#0A66C2",
    username: "John Doe",
    connected: true,
    email: "john.doe@company.com"
  },
  { 
    id: "5", 
    name: "YouTube", 
    icon: "logo-youtube", 
    color: "#FF0000",
    username: "JohnDoeChannel",
    connected: false,
  },
  { 
    id: "6", 
    name: "Pinterest", 
    icon: "logo-pinterest", 
    color: "#BD081C",
    username: "johndoe",
    connected: true,
    email: "john@pinterest.com"
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState(socialAccounts);
  const [autoSync, setAutoSync] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleConnect = (accountId: string) => {
    Alert.alert(
      "Connect Account",
      "You will be redirected to login page to connect this account",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Connect", 
          onPress: () => {
            // Update account status
            setAccounts(accounts.map(acc => 
              acc.id === accountId 
                ? { ...acc, connected: true, username: "user_" + acc.name.toLowerCase() }
                : acc
            ));
            Alert.alert(
              "Success", 
              `${accounts.find(a => a.id === accountId)?.name} account connected successfully!`,
              [{ text: "OK" }]
            );
          }
        }
      ]
    );
  };

  const handleDisconnect = (accountId: string, accountName: string) => {
    Alert.alert(
      "Disconnect Account",
      `Are you sure you want to disconnect ${accountName} account?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Disconnect", 
          style: "destructive",
          onPress: () => {
            setAccounts(accounts.map(acc => 
              acc.id === accountId ? { ...acc, connected: false, username: "" } : acc
            ));
            Alert.alert(
              "Success", 
              `${accountName} account disconnected successfully!`,
              [{ text: "OK" }]
            );
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout from all accounts?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: () => {
            // Disconnect all accounts
            setAccounts(accounts.map(acc => ({ ...acc, connected: false, username: "" })));
            Alert.alert(
              "Success", 
              "Logged out successfully from all accounts!", 
              [{ text: "OK", onPress: () => router.back() }]
            );
          }
        }
      ]
    );
  };

  const connectedCount = accounts.filter(acc => acc.connected).length;
  const totalAccounts = accounts.length;

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

        {/* Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
  style={styles.backButton}
  onPress={() => setSidebarVisible(true)}
>
  <Ionicons name="menu" size={28} color="#ef4b56" />
</TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <Ionicons name="person-circle" size={80} color="#ef4b56" />
            </View>
            <Text style={styles.profileName}>John Doe</Text>
            <Text style={styles.profileEmail}>john.doe@example.com</Text>
          </View>

          {/* Connected Accounts Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Connected Accounts</Text>
              <Text style={styles.sectionCount}>{connectedCount}/{totalAccounts}</Text>
            </View>
            
            {accounts.map((account) => (
              <View key={account.id} style={styles.accountCard}>
                <View style={styles.accountLeft}>
                  <View style={[styles.accountIcon, { backgroundColor: account.color + "20" }]}>
                    <Ionicons name={account.icon as any} size={28} color={account.color} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    {account.connected ? (
                      <Text style={styles.accountUsername}>{account.username}</Text>
                    ) : (
                      <Text style={styles.accountNotConnected}>Not connected</Text>
                    )}
                    {account.connected && account.email && (
                      <Text style={styles.accountEmail}>{account.email}</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.accountRight}>
                  {account.connected ? (
                    <View style={styles.connectedStatus}>
                      <View style={styles.greenDot} />
                      <TouchableOpacity
                        style={styles.disconnectButton}
                        onPress={() => handleDisconnect(account.id, account.name)}
                      >
                        <Text style={styles.disconnectText}>Disconnect</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.connectButton}
                      onPress={() => handleConnect(account.id)}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#fff" />
                      <Text style={styles.connectText}>Connect</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* App Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="sync-outline" size={24} color="#ef4b56" />
                <Text style={styles.settingName}>Auto Sync Posts</Text>
              </View>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ false: "#ddd", true: "#ef4b56" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* App Version */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>App Version 1.0.0</Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout from all accounts</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
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
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  profileImageContainer: {
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 15,
  },
  sectionCount: {
    fontSize: 14,
    color: "#ef4b56",
    fontWeight: "600",
  },
  accountCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  accountLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  accountIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  accountUsername: {
    fontSize: 13,
    color: "#666",
  },
  accountEmail: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  accountNotConnected: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
  },
  accountRight: {
    justifyContent: "center",
  },
  connectedStatus: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginBottom: 5,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ef4b56",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  disconnectButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  disconnectText: {
    color: "#ef4b56",
    fontSize: 13,
    fontWeight: "500",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingName: {
    fontSize: 16,
    color: "#000",
  },
  versionContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 12,
    color: "#999",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ef4b56",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#ef4b56",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});