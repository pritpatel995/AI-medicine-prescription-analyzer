import * as Notifications from "expo-notifications";
import { Platform, Alert } from "react-native";

Notifications.setNotificationHandler({
handleNotification: async () => {
return {
shouldShowAlert: true,
shouldPlaySound: true,
shouldSetBadge: false,
};
},
});

export async function scheduleTestNotification() {
try {
const permission = await Notifications.requestPermissionsAsync();


if (!permission.granted) {
  Alert.alert("Permission Required", "Please allow notifications.");
  return;
}

if (Platform.OS === "android") {
  await Notifications.setNotificationChannelAsync("medicine-reminders", {
    name: "Medicine Reminders",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });
}

const notificationId = await Notifications.scheduleNotificationAsync({
  content: {
    title: "Medicine Reminder",
    body: "Your test notification is working!",
    sound: "default",
  },
  trigger: { seconds: 10 },
});

console.log("Notification scheduled:", notificationId);

Alert.alert(
  "Success",
  "Your test notification should appear in about 10 seconds."
);

return notificationId;

} catch (error) {
console.error("Notification failed:", error);


Alert.alert(
  "Notification Error",
  error?.message || "Unable to schedule notification."
);

return null;

}
}
