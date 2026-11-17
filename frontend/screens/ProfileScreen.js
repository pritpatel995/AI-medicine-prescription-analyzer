
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ChevronRight,
  LogOut,
  Mail,
  Pill,
  User,
} from "lucide-react-native";

import AppButton from "../components/AppButton";
import { useAuth } from "../context/AuthContext";
import {
  colors,
  radii,
  shadow,
  spacing,
  typography,
} from "../theme/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Log out?",
      "You'll need to log in again to view your reminders.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  };

  return (
    <ScrollView
  style={styles.flex}
  contentContainerStyle={[
    styles.container,
    { paddingTop: insets.top + spacing.lg },
  ]}
  showsVerticalScrollIndicator={false}
>
      {/* PROFILE HEADER */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || "?").charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={typography.h2}>
          {user?.name || "User"}
        </Text>

        <View style={styles.emailRow}>
          <Mail color={colors.textMuted} size={14} />

          <Text style={typography.bodyMuted}>
            {user?.email || ""}
          </Text>
        </View>
      </View>

      {/* ACCOUNT */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <User color={colors.primary} size={18} />

            <Text style={typography.body}>
              {user?.name || "User"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Pressable
          style={styles.settingRow}
          onPress={() => navigation.navigate("Prescriptions")}
        >
          <View style={styles.settingLeft}>
            <Pill color={colors.primary} size={18} />

            <Text style={typography.body}>
              My Prescriptions
            </Text>
          </View>

          <ChevronRight
            color={colors.textFaint}
            size={18}
          />
        </Pressable>
      </View>

      {/* LOG OUT */}
      <AppButton
        title="Log Out"
        variant="secondary"
        onPress={handleLogout}
        icon={<LogOut color={colors.primary} size={18} />}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  profileHeader: {
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: 4,
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },

  avatarText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "700",
  },

  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  sectionLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },

  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});

