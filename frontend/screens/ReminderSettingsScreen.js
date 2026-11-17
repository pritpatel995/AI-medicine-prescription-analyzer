
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  StatusBar,
} from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import {
  Bell,
  Volume2,
  Clock,
  RefreshCw,
  Settings,
  ChevronRight,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/theme";
import { listReminders } from "../services/api";

const SOUND_KEY = "rx_analyzer_reminder_sound";

export default function ReminderSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      const permission = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(Boolean(permission.granted));

      const savedSound = await SecureStore.getItemAsync(SOUND_KEY);
      setSoundEnabled(savedSound !== "false");

      try {
        const response = await listReminders();

        const data = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.reminders)
          ? response.data.reminders
          : Array.isArray(response?.reminders)
          ? response.reminders
          : [];

        setReminders(data);
      } catch (error) {
        console.error("Could not load reminders:", error);
        setReminders([]);
      }
    } catch (error) {
      console.error("Could not load reminder settings:", error);
      Alert.alert(
        "Unable to load settings",
        "Please try opening Reminder Settings again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  async function enableNotifications(value) {
    if (value) {
      try {
        const permission =
          await Notifications.requestPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Notifications are disabled",
            "Allow notifications in your device settings to receive medicine reminders.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => Linking.openSettings(),
              },
            ]
          );

          setNotificationsEnabled(false);
          return;
        }

        setNotificationsEnabled(true);

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Medicine Reminders",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: soundEnabled ? "default" : null,
          });
        }

        Alert.alert(
          "Notifications enabled",
          "Notification permission is enabled. Make sure your medicine reminders are scheduled."
        );
      } catch (error) {
        Alert.alert(
          "Error",
          "Could not enable notifications. Please try again."
        );
      }
    } else {
      Alert.alert(
        "Disable notifications?",
        "Open your device settings to disable notifications for Rx Analyzer.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings(),
          },
        ]
      );
    }
  }

  async function changeSound(value) {
    try {
      await SecureStore.setItemAsync(
        SOUND_KEY,
        value ? "true" : "false"
      );

      setSoundEnabled(value);

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Medicine Reminders",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: value ? "default" : null,
        });
      }

      Alert.alert(
        "Sound preference saved",
        value
          ? "Sound is enabled for notifications using this channel."
          : "Sound is disabled for notifications using this channel."
      );
    } catch (error) {
      Alert.alert("Error", "Could not save your sound preference.");
    }
  }

  function getMedicineName(reminder) {
    return (
      reminder.medicine_name ||
      reminder.medicineName ||
      reminder.medicine?.name ||
      reminder.name ||
      "Medicine reminder"
    );
  }

  function getReminderTime(reminder) {
    const time =
      reminder.scheduled_time ||
      reminder.reminder_time ||
      reminder.time ||
      reminder.time_string;

    if (!time) return "Time not available";

    return time;
  }

  function getReminderStatus(reminder) {
    if (
      reminder.is_active === false ||
      reminder.active === false
    ) {
      return "Inactive";
    }

    return reminder.status || "Scheduled";
  }

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.bg}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 12) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.heading}>Reminder Settings</Text>
            <Text style={styles.subtitle}>
              Manage notifications and medicine reminders.
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={() => {
              setRefreshing(true);
              loadSettings();
            }}
            accessibilityLabel="Refresh reminder settings"
          >
            <RefreshCw size={19} color={colors.primary} />
          </Pressable>
        </View>

        {/* Notification preferences */}
        <Text style={styles.sectionTitle}>
          NOTIFICATION PREFERENCES
        </Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Bell size={21} color={colors.primary} />
            </View>

            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>
                Push Notifications
              </Text>
              <Text style={styles.description}>
                Receive notifications for your medicine schedule.
              </Text>
            </View>

            <Switch
              value={notificationsEnabled}
              onValueChange={enableNotifications}
              trackColor={{
                false: "#C9CDD4",
                true: colors.primary,
              }}
              accessibilityLabel="Enable push notifications"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.iconBox}>
              <Volume2 size={21} color={colors.primary} />
            </View>

            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>
                Notification Sound
              </Text>
              <Text style={styles.description}>
                Use sound for notifications on the default channel.
              </Text>
            </View>

            <Switch
              value={soundEnabled}
              onValueChange={changeSound}
              trackColor={{
                false: "#C9CDD4",
                true: colors.primary,
              }}
              accessibilityLabel="Enable notification sound"
            />
          </View>
        </View>

        {/* Information */}
        <View style={styles.noteBox}>
          <Settings size={18} color={colors.primary} />
          <Text style={styles.noteText}>
            These controls manage notification permission and your
            saved sound preference. Changing the sound may require
            recreating the Android notification channel before it
            takes effect for existing notifications.
          </Text>
        </View>

        {/* Reminder list */}
        <View style={styles.listHeader}>
          <View style={styles.listHeaderText}>
            <Text style={styles.sectionTitle}>YOUR REMINDERS</Text>
            <Text style={styles.listSubtitle}>
              {reminders.length} reminder
              {reminders.length === 1 ? "" : "s"} found
            </Text>
          </View>

          <Clock size={20} color={colors.primary} />
        </View>

        {loading || refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />
            <Text style={styles.description}>
              Loading reminders...
            </Text>
          </View>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Bell size={30} color={colors.primary} />
            <Text style={styles.emptyTitle}>
              No reminders found
            </Text>
            <Text style={styles.description}>
              Add a medicine and configure its schedule to see
              reminders here.
            </Text>
          </View>
        ) : (
          reminders.map((reminder, index) => (
            <View
              key={String(reminder.id || reminder._id || index)}
              style={styles.reminderCard}
            >
              <View style={styles.reminderIcon}>
                <Clock size={20} color={colors.primary} />
              </View>

              <View style={styles.reminderInfo}>
                <Text style={styles.settingTitle}>
                  {getMedicineName(reminder)}
                </Text>

                <Text style={styles.description}>
                  {getReminderTime(reminder)}
                </Text>

                <Text style={styles.statusText}>
                  {getReminderStatus(reminder)}
                </Text>
              </View>

              <ChevronRight size={18} color="#9298A3" />
            </View>
          ))
        )}

        {/* Device settings */}
        <Pressable
          style={styles.deviceSettingsButton}
          onPress={() => Linking.openSettings()}
        >
          <Settings size={18} color={colors.primary} />

          <Text style={styles.deviceSettingsText}>
            Open Device Notification Settings
          </Text>

          <ChevronRight size={18} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 35,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 28,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  heading: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "800",
    color: colors.text,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#777F8D",
    maxWidth: 270,
  },

  refreshButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9EEFF",
    flexShrink: 0,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "#858D9A",
  },

  card: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#ECEEF2",
  },

  settingRow: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },

  iconBox: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    marginRight: 12,
    flexShrink: 0,
  },

  settingText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  settingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },

  description: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: "#858D9A",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEF0F3",
  },

  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    marginTop: 15,
    borderRadius: 15,
    backgroundColor: "#EEF2FF",
    gap: 10,
  },

  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#555F75",
  },

  listHeader: {
    marginTop: 30,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  listHeaderText: {
    flex: 1,
  },

  listSubtitle: {
    marginTop: 5,
    fontSize: 12,
    color: "#858D9A",
  },

  loadingBox: {
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  emptyCard: {
    alignItems: "center",
    padding: 26,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECEEF2",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },

  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECEEF2",
  },

  reminderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    marginRight: 12,
    flexShrink: 0,
  },

  reminderInfo: {
    flex: 1,
    minWidth: 0,
  },

  statusText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#4D8B6A",
  },

  deviceSettingsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECEEF2",
  },

  deviceSettingsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
});

