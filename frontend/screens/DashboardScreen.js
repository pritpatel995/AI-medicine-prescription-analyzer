import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Droplets,
  Pill,
  Plus,
  ScanLine,
  Sparkles,
  User,
  X,
  
} from "lucide-react-native";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";

import AdherenceRing from "../components/AdherenceRing";
import { useAuth } from "../context/AuthContext";
import {
  getDailyAdherence,
  listReminders,
  updateReminderStatus,
  deleteReminder,
} from "../services/api";
import { colors, spacing, typography } from "../theme/theme";

const TIME_BLOCKS = [
  {
    key: "morning",
    label: "Morning",
    emoji: "🌅",
    start: 6,
    end: 11,
    subtitle: "06:00 - 11:59",
  },
  {
    key: "afternoon",
    label: "Afternoon",
    emoji: "☀️",
    start: 12,
    end: 16,
    subtitle: "12:00 - 16:59",
  },
  {
    key: "evening",
    label: "Evening",
    emoji: "🌆",
    start: 17,
    end: 20,
    subtitle: "17:00 - 20:59",
  },
  {
    key: "night",
    label: "Night",
    emoji: "🌙",
    start: 21,
    end: 23,
    subtitle: "21:00+",
  },
];

const FORM_META = {
  tablet: {
    label: "Tablet",
    color: colors.primarySoft,
    icon: Pill,
  },
  capsule: {
    label: "Capsule",
    color: colors.primarySoft,
    icon: Pill,
  },
  syrup: {
    label: "Syrup",
    color: colors.accentSoft,
    icon: Droplets,
  },
  drops: {
    label: "Drops",
    color: colors.warningSoft,
    icon: Droplets,
  },
  injection: {
    label: "Injection",
    color: colors.dangerSoft,
    icon: Sparkles,
  },
};

const safeImpact = async (
  style = Haptics.ImpactFeedbackStyle.Light
) => {
  if (Platform.OS !== "web") {
    await Haptics.impactAsync(style);
  }
};

const safeNotification = async (
  style = Haptics.NotificationFeedbackType.Success
) => {
  if (Platform.OS !== "web") {
    await Haptics.notificationAsync(style);
  }
};

const safeSelection = async () => {
  if (Platform.OS !== "web") {
    await Haptics.selectionAsync();
  }
};

function toDateKey(dateLike) {
  const date = new Date(dateLike);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromKey(dateString) {
  return new Date(`${dateString}T12:00:00`);
}

function buildDateStrip(anchorDate) {
  const base = new Date(anchorDate);
  const strip = [];

  for (let offset = -2; offset <= 4; offset += 1) {
    const date = new Date(base);
    date.setDate(base.getDate() + offset);

    strip.push({
      key: toDateKey(date),
      date,
      dayLabel: date.toLocaleDateString(undefined, {
        weekday: "short",
      }),
      monthLabel: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      isToday: toDateKey(date) === toDateKey(new Date()),
    });
  }

  return strip;
}

function parseTimeMinutes(timeString) {
  if (!timeString) return 0;

  const [hourStr, minuteStr] = timeString.split(":");

  return Number(hourStr) * 60 + Number(minuteStr || 0);
}

function formatTime(timeString) {
  if (!timeString) return "--:--";

  const [hourStr, minuteStr] = timeString.split(":");
  const date = new Date();

  date.setHours(
    Number(hourStr),
    Number(minuteStr || 0),
    0,
    0
  );

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFormMeta(reminder) {
  const raw = (
    reminder.form ||
    reminder.type ||
    reminder.medicine_name ||
    "tablet"
  ).toLowerCase();

  const key = raw.includes("capsule")
    ? "capsule"
    : raw.includes("syrup")
    ? "syrup"
    : raw.includes("drop")
    ? "drops"
    : raw.includes("inject")
    ? "injection"
    : "tablet";

  return FORM_META[key];
}

function normalizeReminder(reminder) {
  const id =
    reminder.id ||
    reminder._id ||
    `${reminder.medicine_name}-${reminder.scheduled_time}`;

  const status = (reminder.status || "pending").toLowerCase();

  const stockLeft = Number(
    reminder.stock_left ??
      reminder.remaining_count ??
      reminder.pills_left ??
      8
  );

  return {
    ...reminder,
    id,
    status,
    dosage: reminder.dosage || reminder.strength || "500mg",
    foodInstruction:
      reminder.food_instruction ||
      reminder.instructions ||
      "After Food",
    form: reminder.form || reminder.type || "tablet",
    stockLeft,
    medicine_name:
      reminder.medicine_name || reminder.name || "Medication",
    scheduled_time: reminder.scheduled_time || "08:00",
  };
}

function LoadingSkeleton() {
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, {
        duration: 800,
        easing: Easing.ease,
      }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.skeletonList}>
      {[1, 2, 3].map((item) => (
        <Animated.View
          key={item}
          style={[styles.skeletonCard, animatedStyle]}
        />
      ))}
    </View>
  );
}

function getStatusTone(status) {
  if (status === "taken") {
    return {
      background: colors.accentSoft,
      text: colors.accent,
      label: "Taken",
    };
  }

  if (status === "skipped") {
    return {
      background: colors.warningSoft,
      text: colors.warning,
      label: "Skipped",
    };
  }

  if (status === "missed") {
    return {
      background: colors.dangerSoft,
      text: colors.danger,
      label: "Missed",
    };
  }

  return {
    background: colors.primarySoft,
    text: colors.primary,
    label: "Pending",
  };
}


function MedicationItem({
  item,
  onMarkTaken,
  onSkip,
  onSnooze,
  onDelete,
}) {
  const isTaken = item.status === "taken";
  const reduceProgress = useSharedValue(1);
  const formInfo = getFormMeta(item);
  const stockAlert = item.stockLeft <= 5;
  const statusTone = getStatusTone(item.status);
  const IconComponent = formInfo.icon;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceProgress.value }],
    opacity: isTaken ? 0.72 : 1,
  }));

  const handlePressIn = () => {
    reduceProgress.value = withTiming(0.98, {
      duration: 120,
      easing: Easing.ease,
    });
  };

  const handlePressOut = () => {
    reduceProgress.value = withTiming(1, {
      duration: 150,
      easing: Easing.ease,
    });
  };

  const renderSwipeAction = (type) => (
    <Pressable
      style={
        type === "taken"
          ? styles.swipeTaken
          : styles.swipeSkip
      }
      onPress={() => {
        safeImpact(Haptics.ImpactFeedbackStyle.Medium);

        if (type === "taken") {
          onMarkTaken(item);
        } else {
          onSkip(item);
        }
      }}
    >
      <View style={styles.swipeContent}>
        {type === "taken" ? (
          <Check size={18} color={colors.white} />
        ) : (
          <X size={18} color={colors.white} />
        )}

        <Text style={styles.swipeLabel}>
          {type === "taken" ? "Taken" : "Skip"}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Swipeable
      renderRightActions={() => renderSwipeAction("taken")}
      renderLeftActions={() => renderSwipeAction("skip")}
      overshootRight={false}
      overshootLeft={false}
    >
      <Animated.View
        entering={FadeInDown.duration(180)}
        exiting={FadeOut.duration(120)}
        style={[styles.medCard, animatedStyle]}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => safeSelection()}
          style={styles.cardInner}
        >
          <View style={styles.iconWrap}>
            <IconComponent
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={styles.textWrap}>
            {/* Medicine name and status */}
            <View style={styles.medicineHeader}>
              <View style={styles.medicineTitleWrap}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.medicineName,
                    isTaken && styles.strikeText,
                  ]}
                >
                  {item.medicine_name}
                </Text>

                <Text
                  style={[
                    styles.doseText,
                    isTaken && styles.strikeText,
                  ]}
                >
                  {item.dosage}
                </Text>
              </View>

              <View style={styles.headerRight}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: statusTone.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusTone.text },
                    ]}
                  >
                    {statusTone.label}
                  </Text>
                </View>

                <Pressable
                  onPress={() => onDelete(item)}
                  hitSlop={6}
                  style={styles.deleteButton}
                >
                  <X size={13} color={colors.danger} />
                  <Text style={styles.deleteButtonText}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Time and food instruction in one row */}
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Clock3
                  size={13}
                  color={colors.textMuted}
                />
                <Text style={styles.metaText}>
                  {formatTime(item.scheduled_time)}
                </Text>
              </View>

              <View style={styles.metaPill}>
                <Bell
                  size={13}
                  color={colors.textMuted}
                />
                <Text
                  numberOfLines={1}
                  style={styles.metaText}
                >
                  {item.foodInstruction}
                </Text>
              </View>
            </View>

            {/* Actions in one horizontal row */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => onMarkTaken(item)}
                style={[
                  styles.primaryBtn,
                  isTaken && styles.primaryBtnTaken,
                ]}
              >
                <Check size={14} color={colors.white} />

                <Text
                  numberOfLines={1}
                  style={styles.primaryBtnText}
                >
                  {isTaken ? "Taken" : "Mark Taken"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onSkip(item)}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>
                  Skip
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onSnooze(item)}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>
                  Snooze
                </Text>
              </Pressable>
            </View>

            {stockAlert && (
              <View style={styles.alertBadge}>
                <AlertTriangle
                  size={12}
                  color={colors.warning}
                />
                <Text style={styles.alertText}>
                  {item.stockLeft} left
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
}


export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(
    toDateKey(new Date())
  );
  const [reminders, setReminders] = useState([]);
  const [adherence, setAdherence] = useState({
    total: 0,
    taken: 0,
    pending: 0,
    skipped: 0,
    missed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const dateStrip = useMemo(
    () => buildDateStrip(selectedDate),
    [selectedDate]
  );

  const greeting = (() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";

    return "Good evening";
  })();

  const streak = 7;

  const completionPct =
    adherence.total > 0
      ? (adherence.taken / adherence.total) * 100
      : 0;

  const timelineSections = useMemo(() => {
    const filtered = (reminders || []).filter((item) => {
      const itemDate = item.scheduled_date || selectedDate;
      return itemDate === selectedDate;
    });

    return TIME_BLOCKS.map((block) => {
      const data = filtered
        .filter((item) => {
          const hour = Number(
            (item.scheduled_time || "08:00").split(":")[0]
          );

          return hour >= block.start && hour <= block.end;
        })
        .sort(
          (a, b) =>
            parseTimeMinutes(a.scheduled_time) -
            parseTimeMinutes(b.scheduled_time)
        );

      return { ...block, data };
    }).filter((section) => section.data.length > 0);
  }, [reminders, selectedDate]);

  const loadDashboard = useCallback(
    async (dateKey = selectedDate) => {
      try {
        const [reminderList, adherenceSummary] =
          await Promise.all([
            listReminders(dateKey),
            getDailyAdherence(dateKey),
          ]);

        const normalized = (reminderList || [])
          .map(normalizeReminder)
          .sort(
            (a, b) =>
              parseTimeMinutes(a.scheduled_time) -
              parseTimeMinutes(b.scheduled_time)
          );

        setReminders(normalized);

        setAdherence(
          adherenceSummary || {
            total: 0,
            taken: 0,
            pending: 0,
            skipped: 0,
            missed: 0,
          }
        );
      } catch (error) {
        console.warn(
          "Dashboard load failed:",
          error?.message || error
        );

        setReminders([]);

        setAdherence({
          total: 0,
          taken: 0,
          pending: 0,
          skipped: 0,
          missed: 0,
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    setIsLoading(true);
    loadDashboard(selectedDate);
  }, [selectedDate, loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard(selectedDate);
    }, [loadDashboard, selectedDate])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboard(selectedDate);
  };

  const handleMarkTaken = async (item) => {
    const nextStatus =
      item.status === "taken" ? "pending" : "taken";

    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === item.id
          ? { ...reminder, status: nextStatus }
          : reminder
      )
    );

    try {
      await updateReminderStatus(item.id, nextStatus);

      const summary = await getDailyAdherence(selectedDate);
      setAdherence(summary || adherence);

      safeNotification(
        Haptics.NotificationFeedbackType.Success
      );
    } catch (error) {
      console.warn(
        "Failed to update status:",
        error?.message || error
      );

      await loadDashboard(selectedDate);
    }
  };

  const handleSkip = async (item) => {
    const nextStatus =
      item.status === "skipped" ? "pending" : "skipped";

    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === item.id
          ? { ...reminder, status: nextStatus }
          : reminder
      )
    );

    try {
      await updateReminderStatus(item.id, nextStatus);

      const summary = await getDailyAdherence(selectedDate);
      setAdherence(summary || adherence);

      safeImpact(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn(
        "Failed to skip dose:",
        error?.message || error
      );

      await loadDashboard(selectedDate);
    }
  };

  const handleSnooze = async (item) => {
    safeImpact(Haptics.ImpactFeedbackStyle.Medium);

    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === item.id
          ? { ...reminder, status: "pending" }
          : reminder
      )
    );

    try {
      await updateReminderStatus(item.id, "pending");

      const summary = await getDailyAdherence(selectedDate);
      setAdherence(summary || adherence);
    } catch (error) {
      console.warn(
        "Failed to snooze dose:",
        error?.message || error
      );

      await loadDashboard(selectedDate);
    }
  };
  const handleDeleteMedicine = (item) => {
  const confirmDelete = async () => {
    try {
      await deleteReminder(item.id);

      await safeNotification(
        Haptics.NotificationFeedbackType.Success
      );

      await loadDashboard(selectedDate);

      Alert.alert(
        "Medicine Deleted",
        `${item.medicine_name} and its scheduled reminders have been deleted.`
      );
    } catch (error) {
      console.warn(
        "Failed to delete medicine:",
        error?.response?.data?.detail || error?.message || error
      );

      Alert.alert(
        "Delete Failed",
        error?.response?.data?.detail ||
          "Could not delete this medicine. Please try again."
      );
    }
  };

  if (Platform.OS === "web") {
    confirmDelete();
    return;
  }

  Alert.alert(
    "Delete Medicine?",
    `Delete ${item.medicine_name} and its scheduled reminders? This action cannot be undone.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: confirmDelete,
      },
    ]
  );
};
    return (
    <View style={styles.screen}>
      <SectionList
        sections={timelineSections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.timelineContainer}
        style={styles.timelineList}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.headerCard}>
              <View style={styles.headerRow}>
                <View style={styles.userBlock}>
                  <View style={styles.avatarWrap}>
                    <User size={20} color={colors.primary} />
                  </View>

                  <View>
                    <Text style={styles.greetingText}>
                      {greeting},
                    </Text>
                    <Text style={styles.userName}>
                      {user?.name?.split(" ")[0] || "Friend"}
                    </Text>
                  </View>
                </View>




                <Pressable
                  style={styles.iconButton}
                  onPress={() =>
                    navigation.navigate("ReminderSettings")
                  }
                >
                  <Bell size={18} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.headerStatusRow}>
                <View style={styles.dateChip}>
                  <CalendarDays
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.dateChipText}>
                    {dateFromKey(selectedDate).toLocaleDateString(
                      undefined,
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </Text>
                </View>

                <View style={styles.statusChip}>
                  <Sparkles
                    size={12}
                    color={colors.accent}
                  />
                  <Text style={styles.statusChipText}>
                    All medications on track
                  </Text>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryLabel}>
                    Daily adherence
                  </Text>

                  <Text style={styles.summaryValue}>
                    {Math.round(completionPct)}%
                  </Text>

                  <View style={styles.summaryMetaRow}>
                    <Text style={styles.summaryMeta}>
                      {adherence.taken} of {adherence.total} doses
                    </Text>

                    <View style={styles.streakChip}>
                      <Text style={styles.streakText}>
                        🔥 {streak}-day streak
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.ringWrap}>
                  <AdherenceRing
                    takenCount={adherence.taken}
                    totalCount={adherence.total}
                    size={108}
                    strokeWidth={11}
                  />
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>
                    {adherence.total}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Taken</Text>
                  <Text
                    style={[
                      styles.statValue,
                      { color: colors.accent },
                    ]}
                  >
                    {adherence.taken}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Pending</Text>
                  <Text
                    style={[
                      styles.statValue,
                      { color: colors.primary },
                    ]}
                  >
                    {adherence.pending}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Missed</Text>
                  <Text
                    style={[
                      styles.statValue,
                      { color: colors.danger },
                    ]}
                  >
                    {adherence.missed}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.stripContainer}>
              <Text style={styles.sectionTitle}>Schedule</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateStrip}
                nestedScrollEnabled
              >
                {dateStrip.map((day) => {
                  const isActive = day.key === selectedDate;

                  return (
                    <Pressable
                      key={day.key}
                      style={[
                        styles.dateCard,
                        isActive && styles.dateCardActive,
                      ]}
                      onPress={() => setSelectedDate(day.key)}
                    >
                      <Text
                        style={[
                          styles.dateDay,
                          isActive && styles.dateDayActive,
                        ]}
                      >
                        {day.dayLabel}
                      </Text>

                      <Text
                        style={[
                          styles.dateNum,
                          isActive && styles.dateNumActive,
                        ]}
                      >
                        {day.date.getDate()}
                      </Text>

                      <Text
                        style={[
                          styles.dateMonth,
                          isActive && styles.dateMonthActive,
                        ]}
                      >
                        {day.monthLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <LoadingSkeleton />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIllustration}>
                <Pill size={30} color={colors.primary} />
              </View>

              <Text style={styles.emptyTitle}>
                No medications scheduled
              </Text>

              <Text style={styles.emptyText}>
                There are no doses for this day. Add a medicine
                or choose another date.
              </Text>
            </View>
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.blockHeader}>
            <View style={styles.blockHeaderLeft}>
              <Text style={styles.blockEmoji}>
                {section.emoji}
              </Text>

              <Text style={styles.blockTitle}>
                {section.label}
              </Text>
            </View>

            <Text style={styles.blockMeta}>
              {section.subtitle}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <MedicationItem
            item={item}
            onMarkTaken={handleMarkTaken}
            onSkip={handleSkip}
            onSnooze={handleSnooze}
            onDelete={handleDeleteMedicine}
          />
        )}
      />

      <View style={styles.fabWrap}>
        {fabOpen && (
          <Animated.View
            entering={FadeInDown.duration(180)}
            exiting={FadeOut.duration(120)}
            style={styles.fabActions}
          >
            <Pressable
              style={[
                styles.quickAction,
                styles.quickActionPrimary,
              ]}
              onPress={() => navigation.navigate("Scan")}
            >
              <ScanLine size={16} color={colors.white} />
              <Text style={styles.quickActionText}>
                Scan New Prescription
              </Text>
            </Pressable>

            <Pressable
              style={styles.quickAction}
              onPress={() => navigation.navigate("Scan")}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={styles.quickActionTextSecondary}>
                Add Medicine
              </Text>
            </Pressable>

            <Pressable
              style={styles.quickAction}
              onPress={() => navigation.navigate("Review")}
            >
              <ChevronRight
                size={16}
                color={colors.primary}
              />
              <Text style={styles.quickActionTextSecondary}>
                Refill Log
              </Text>
            </Pressable>
          </Animated.View>
        )}

        <Pressable
          onPress={() => setFabOpen((prev) => !prev)}
          style={styles.fabButton}
        >
          <Plus size={24} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  headerCard: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  userBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  greetingText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },

  userName: {
    fontSize: 26,
    color: colors.text,
    fontWeight: "700",
    letterSpacing: -0.5,
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },

  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
  },

  dateChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },

  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  statusChipText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.md,
    elevation: 5,
  },

  summaryLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },

  summaryLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },

  summaryValue: {
    fontSize: 42,
    color: colors.text,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 2,
  },

  summaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: spacing.sm,
    gap: 8,
  },

  summaryMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  streakChip: {
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  streakText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "700",
  },

  ringWrap: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
    statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.md,
  },

  statBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    elevation: 2,
  },

  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },

  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },

  stripContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },

  sectionTitle: {
    fontSize: 19,
    color: colors.text,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },

  dateStrip: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  dateCard: {
    width: 66,
    minHeight: 92,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    elevation: 2,
  },

  dateCardActive: {
    backgroundColor: colors.primary,
    elevation: 5,
  },

  dateDay: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "700",
  },

  dateDayActive: {
    color: colors.white,
  },

  dateNum: {
    fontSize: 23,
    color: colors.text,
    fontWeight: "800",
    marginVertical: 3,
  },

  dateNumActive: {
    color: colors.white,
  },

  dateMonth: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
  },

  dateMonthActive: {
    color: colors.white,
  },

  timelineList: {
    flex: 1,
  },

  timelineContainer: {
    flexGrow: 1,
    paddingBottom: 132,
  },

  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
  },

  blockHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  blockEmoji: {
    fontSize: 18,
  },

  blockTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },

  blockMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },

  
medCard: {
  backgroundColor: colors.card,
  marginHorizontal: spacing.lg,
  marginBottom: spacing.md,
  borderRadius: 20,
  elevation: 3,
  overflow: "hidden",
},

cardInner: {
  flexDirection: "row",
  alignItems: "flex-start",
  padding: 12,
  gap: 9,
},

iconWrap: {
  width: 38,
  height: 38,
  borderRadius: 13,
  backgroundColor: colors.primarySoft,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
},

textWrap: {
  flex: 1,
  minWidth: 0,
},

medicineHeader: {
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 6,
},

medicineTitleWrap: {
  flex: 1,
  minWidth: 0,
},

medicineName: {
  fontSize: 16,
  fontWeight: "700",
  color: colors.text,
  flexShrink: 1,
},

headerRight: {
  alignItems: "flex-end",
  gap: 6,
  flexShrink: 0,
},

doseText: {
  fontSize: 12,
  color: colors.primary,
  fontWeight: "800",
  marginTop: 3,
},

strikeText: {
  textDecorationLine: "line-through",
  opacity: 0.7,
},

metaRow: {
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "nowrap",
  gap: 6,
  marginTop: 10,
},

metaPill: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  backgroundColor: colors.bg,
  borderRadius: 999,
  paddingHorizontal: 7,
  paddingVertical: 6,
  flexShrink: 1,
  minWidth: 0,
},

metaText: {
  fontSize: 10,
  color: colors.textMuted,
  fontWeight: "600",
  flexShrink: 1,
},

actionRow: {
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "nowrap",
  gap: 5,
  marginTop: 10,
},

primaryBtn: {
  flex: 1,
  minWidth: 0,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  backgroundColor: colors.primary,
  borderRadius: 9,
  paddingHorizontal: 6,
  paddingVertical: 10,
},

primaryBtnTaken: {
  backgroundColor: colors.accent,
},

primaryBtnText: {
  color: colors.white,
  fontSize: 10,
  fontWeight: "800",
  flexShrink: 1,
},

secondaryBtn: {
  minWidth: 48,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.bg,
  borderRadius: 9,
  paddingHorizontal: 9,
  paddingVertical: 10,
},

secondaryBtnText: {
  color: colors.textMuted,
  fontSize: 11,
  fontWeight: "700",
},

deleteButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  backgroundColor: colors.dangerSoft,
  borderRadius: 9,
  paddingHorizontal: 8,
  paddingVertical: 6,
},

deleteButtonText: {
  color: colors.danger,
  fontSize: 10,
  fontWeight: "800",
},

statusBadge: {
  borderRadius: 999,
  paddingHorizontal: 8,
  paddingVertical: 5,
},

statusText: {
  fontSize: 10,
  fontWeight: "800",
},

alertBadge: {
  alignSelf: "flex-start",
  flexDirection: "row",
  alignItems: "center",
  gap: 3,
  backgroundColor: colors.warningSoft,
  borderRadius: 8,
  paddingHorizontal: 6,
  paddingVertical: 4,
  marginTop: 7,
},

alertText: {
  color: colors.warning,
  fontSize: 9,
  fontWeight: "800",
},



  swipeTaken: {
    backgroundColor: colors.accent,
    width: 80,
    marginBottom: spacing.md,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  swipeSkip: {
    backgroundColor: colors.danger,
    width: 80,
    marginBottom: spacing.md,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  swipeContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  swipeLabel: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },

  skeletonList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },

  skeletonCard: {
    height: 140,
    borderRadius: 20,
    backgroundColor: colors.border,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 36,
  },

  emptyIllustration: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8,
  },

  fabWrap: {
    position: "absolute",
    right: 20,
    bottom: 24,
    alignItems: "flex-end",
    zIndex: 20,
    elevation: 20,
  },

  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    zIndex: 21,
  },

  fabActions: {
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 12,
  },

  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 5,
  },

  quickActionPrimary: {
    backgroundColor: colors.primary,
  },

  quickActionText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },

  quickActionTextSecondary: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },






});