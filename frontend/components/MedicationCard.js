import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Pill, Check, X } from "lucide-react-native";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

import { colors, radii, shadow, spacing, typography } from "../theme/theme";

export default function MedicationCard({ reminder, onMarkTaken, onSkip }) {
  const isTaken = reminder.status === "taken";
  const isSkipped = reminder.status === "skipped";

  const renderRightActions = () => (
    <View style={styles.swipeActionTaken}>
      <Check color={colors.white} size={22} />
      <Text style={styles.swipeActionText}>Taken</Text>
    </View>
  );

  const renderLeftActions = () => (
    <View style={styles.swipeActionSkip}>
      <X color={colors.white} size={22} />
      <Text style={styles.swipeActionText}>Skip</Text>
    </View>
  );

  const handleSwipeOpen = (direction) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (direction === "right") onMarkTaken?.(reminder);
    if (direction === "left") onSkip?.(reminder);
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={handleSwipeOpen}
      overshootRight={false}
      overshootLeft={false}
    >
      <View
        style={[
          styles.card,
          isTaken && styles.cardTaken,
          isSkipped && styles.cardSkipped,
        ]}
      >
        <View style={styles.iconWrap}>
          <Pill color={colors.primary} size={20} />
        </View>
        <View style={styles.info}>
          <Text style={typography.h3}>{reminder.medicine_name}</Text>
          <Text style={typography.bodyMuted}>{reminder.scheduled_time}</Text>
        </View>
        <View style={[styles.statusPill, isTaken && styles.statusPillTaken, isSkipped && styles.statusPillSkipped]}>
          <Text
            style={[
              typography.caption,
              { color: isTaken ? colors.accent : isSkipped ? colors.danger : colors.textMuted },
            ]}
          >
            {reminder.status}
          </Text>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardTaken: { opacity: 0.6 },
  cardSkipped: { opacity: 0.6 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.bg,
  },
  statusPillTaken: { backgroundColor: colors.accentSoft },
  statusPillSkipped: { backgroundColor: colors.dangerSoft },
  swipeActionTaken: {
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    gap: 2,
  },
  swipeActionSkip: {
    backgroundColor: colors.danger,
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    gap: 2,
  },
  swipeActionText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
});
