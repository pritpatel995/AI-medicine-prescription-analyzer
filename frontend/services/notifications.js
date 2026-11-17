import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Requests OS notification permission. Call once, e.g. after login or when
 * the user first reaches the Dashboard. No-ops on web, where local
 * scheduled notifications aren't reliably supported.
 */
export async function ensureNotificationPermission() {
  if (isWeb) return false;

  if (!Device.isDevice) {
    // Simulators/emulators may not support push, local notifications still work on most.
    return true;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("medication-reminders", {
      name: "Medication Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }

  return finalStatus === "granted";
}

/**
 * Schedules one local daily-repeating notification per medicine time.
 * `medicine.times` are "HH:MM" 24hr strings. Returns a map of
 * `${medicineName}_${time}` -> notificationId so callers can cancel later.
 * No-ops on web.
 *
 * Local notifications are the source of truth for actually alerting the
 * user on-device; the server's `reminders` collection is the source of
 * truth for adherence history and cross-device sync. This function only
 * handles the on-device alarm side.
 */
export async function scheduleMedicineNotifications(prescriptionId, medicines) {
  if (isWeb) return {};

  const scheduledIds = {};

  for (const medicine of medicines) {
    for (const time of medicine.times || []) {
      const [hour, minute] = time.split(":").map(Number);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for ${medicine.name}`,
          body: buildNotificationBody(medicine),
          sound: true,
          data: { prescriptionId, medicineName: medicine.name, time },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
          channelId: Platform.OS === "android" ? "medication-reminders" : undefined,
        },
      });

      scheduledIds[`${medicine.name}_${time}`] = notificationId;
    }
  }

  return scheduledIds;
}

function buildNotificationBody(medicine) {
  const parts = [];
  if (medicine.dosage) parts.push(medicine.dosage);
  if (medicine.instructions) parts.push(medicine.instructions);
  return parts.length ? parts.join(" · ") : "Tap to mark as taken";
}

/**
 * Cancels a set of previously scheduled notifications, e.g. when a
 * prescription is edited or deleted and reminders need to be regenerated.
 * No-ops on web.
 */
export async function cancelNotifications(notificationIds) {
  if (isWeb) return;
  await Promise.all(
    Object.values(notificationIds).map((id) => Notifications.cancelScheduledNotificationAsync(id))
  );
}

export async function cancelAllNotifications() {
  if (isWeb) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Adds a listener for when the user taps a notification, useful for
 * deep-linking into the Dashboard's "mark as taken" flow. No-ops on web.
 */
export function addNotificationResponseListener(handler) {
  if (isWeb) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(handler);
}