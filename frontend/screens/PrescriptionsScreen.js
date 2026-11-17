
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  ArrowLeftRight,
  ChevronRight,
  Pill,
  ShieldCheck,
  Trash2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { deletePrescription, listPrescriptions } from "../services/api";
import { colors, radii, shadow, spacing, typography } from "../theme/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
function formatDate(value) {
  if (!value) return "Date unavailable";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMedicines(prescription) {
  return Array.isArray(prescription?.medicines)
    ? prescription.medicines
    : [];
}

function medicineSummary(prescription) {
  const medicines = getMedicines(prescription);

  if (!medicines.length) return "No medicines listed";

  const names = medicines
    .slice(0, 2)
    .map((medicine) => medicine.name)
    .filter(Boolean);

  const remaining = medicines.length - names.length;

  return `${names.join(", ")}${
    remaining > 0 ? ` + ${remaining} more` : ""
  }`;
}

function medicineKey(medicine) {
  return String(medicine?.name || "").trim().toLowerCase();
}

function compareMedicineValues(older, newer) {
  const fields = [
    ["dosage", "Dosage"],
    ["frequency", "Frequency"],
    ["duration_days", "Duration"],
    ["form", "Form"],
    ["instructions", "Instructions"],
    ["times", "Scheduled times"],
  ];

  const changes = [];

  for (const [key, label] of fields) {
    const oldValue = older?.[key];
    const newValue = newer?.[key];

    const oldNormalized = Array.isArray(oldValue)
      ? [...oldValue].sort().join(", ")
      : String(oldValue ?? "").trim();

    const newNormalized = Array.isArray(newValue)
      ? [...newValue].sort().join(", ")
      : String(newValue ?? "").trim();

    if (oldNormalized !== newNormalized) {
      changes.push({
        label,
        before: oldNormalized || "Not specified",
        after: newNormalized || "Not specified",
      });
    }
  }

  return changes;
}

function buildComparison(olderPrescription, newerPrescription) {
  const olderMedicines = getMedicines(olderPrescription);
  const newerMedicines = getMedicines(newerPrescription);

  const olderMap = new Map();
  const newerMap = new Map();

  olderMedicines.forEach((medicine) => {
    const key = medicineKey(medicine);
    if (key) olderMap.set(key, medicine);
  });

  newerMedicines.forEach((medicine) => {
    const key = medicineKey(medicine);
    if (key) newerMap.set(key, medicine);
  });

  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  for (const [key, medicine] of newerMap.entries()) {
    const olderMedicine = olderMap.get(key);

    if (!olderMedicine) {
      added.push(medicine);
      continue;
    }

    const changes = compareMedicineValues(olderMedicine, medicine);

    if (changes.length) {
      changed.push({
        name: medicine.name,
        changes,
      });
    } else {
      unchanged.push(medicine);
    }
  }

  for (const [key, medicine] of olderMap.entries()) {
    if (!newerMap.has(key)) removed.push(medicine);
  }

  return { added, removed, changed, unchanged };
}

function ComparisonSection({ title, items, type, emptyText }) {
  if (!items.length) {
    return (
      <View style={styles.comparisonSection}>
        <Text style={typography.h3}>{title} (0)</Text>
        <Text style={typography.bodyMuted}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.comparisonSection}>
      <Text style={typography.h3}>
        {title} ({items.length})
      </Text>

      {items.map((item, index) => (
        <View
          key={`${item.name || item}-${index}`}
          style={styles.changeCard}
        >
          <Text style={styles.changeName}>
            {item.name || "Medicine"}
          </Text>

          {type === "changed" &&
            item.changes.map((change) => (
              <View
                key={change.label}
                style={styles.fieldChange}
              >
                <Text style={styles.fieldLabel}>{change.label}</Text>
                <Text style={styles.oldValue}>
                  Previous: {change.before}
                </Text>
                <Text style={styles.newValue}>
                  Latest: {change.after}
                </Text>
              </View>
            ))}

          {type === "simple" && item.dosage ? (
            <Text style={typography.bodyMuted}>{item.dosage}</Text>
          ) : null}

          {type === "simple" && item.frequency ? (
            <Text style={typography.bodyMuted}>{item.frequency}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function PrescriptionsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const list = await listPrescriptions();
      setPrescriptions(Array.isArray(list) ? list : []);
    } catch (err) {
      Alert.alert(
        "Could not load prescriptions",
        err?.response?.data?.detail || err.message || "Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const sortedPrescriptions = useMemo(() => {
    return [...prescriptions].sort((a, b) => {
      const dateA = new Date(a.prescribed_date || a.created_at || 0).getTime();
      const dateB = new Date(b.prescribed_date || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [prescriptions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleEdit = (prescription) => {
    if (prescription.is_demo) {
      Alert.alert(
        "Demo prescription",
        "This is fictional demonstration data. Editing is disabled here to protect the sample history."
      );
      return;
    }

    navigation.navigate("Review", {
      editingPrescription: prescription,
    });
  };

  const handleDelete = (prescription) => {
    if (prescription.is_demo) {
      Alert.alert(
        "Demo record protected",
        "This fictional sample is protected from deletion in this screen."
      );
      return;
    }

    Alert.alert(
      "Delete prescription?",
      `This removes "${
        prescription.doctor_name || "this prescription"
      }" and all its scheduled reminders. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning
              );
              await deletePrescription(prescription.id);

              setPrescriptions((previous) =>
                previous.filter((item) => item.id !== prescription.id)
              );

              setSelectedIds((previous) =>
                previous.filter((id) => id !== prescription.id)
              );
            } catch (err) {
              Alert.alert(
                "Could not delete",
                err?.response?.data?.detail || err.message
              );
            }
          },
        },
      ]
    );
  };

  const toggleComparisonSelection = (prescription) => {
    setComparison(null);

    setSelectedIds((previous) => {
      if (previous.includes(prescription.id)) {
        return previous.filter((id) => id !== prescription.id);
      }

      if (previous.length >= 2) {
        Alert.alert(
          "Two prescriptions only",
          "Unselect a prescription before selecting another."
        );
        return previous;
      }

      return [...previous, prescription.id];
    });
  };

  const compareSelected = () => {
    if (selectedIds.length !== 2) {
      Alert.alert(
        "Select two prescriptions",
        "Choose two records from the history list first."
      );
      return;
    }

    const selected = selectedIds
      .map((id) => prescriptions.find((item) => item.id === id))
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = new Date(a.prescribed_date || a.created_at || 0);
        const dateB = new Date(b.prescribed_date || b.created_at || 0);
        return dateA - dateB;
      });

    if (selected.length !== 2) {
      Alert.alert("Comparison unavailable", "Please refresh the history.");
      return;
    }

    setComparison({
      older: selected[0],
      newer: selected[1],
      result: buildComparison(selected[0], selected[1]),
    });
  };

  if (loading) {
    return (
      <View style={[styles.flex, styles.centered]}>
        <Text style={typography.bodyMuted}>Loading prescription history...</Text>
      </View>
    );
  }

  return (
   <View style={[styles.flex, { paddingTop: insets.top }]}>
      <FlatList
        data={sortedPrescriptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={typography.h1}>Prescription History</Text>
            <Text style={typography.bodyMuted}>
              Review previous records or select two prescriptions to compare
              their medicines and changes.
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <ShieldCheck size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.h3}>
                  {sortedPrescriptions.length} prescription
                  {sortedPrescriptions.length === 1 ? "" : "s"}
                </Text>
                <Text style={typography.bodyMuted}>
                  Demo records are labelled separately from real records.
                </Text>
              </View>
            </View>

            <View style={styles.selectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={typography.h3}>Compare records</Text>
                <Text style={typography.bodyMuted}>
                  {selectedIds.length} of 2 selected
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={compareSelected}
                style={[
                  styles.compareButton,
                  selectedIds.length !== 2 && styles.buttonDisabled,
                ]}
              >
                <ArrowLeftRight size={17} color={colors.white} />
                <Text style={styles.compareButtonText}>Compare</Text>
              </Pressable>
            </View>

            {comparison ? (
              <View style={styles.comparisonCard}>
                <View style={styles.comparisonTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={typography.h2}>Comparison Results</Text>
                    <Text style={typography.bodyMuted}>
                      Older prescription vs newer prescription
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setComparison(null)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </Pressable>
                </View>

                <View style={styles.comparisonDates}>
                  <View style={styles.dateColumn}>
                    <Text style={styles.dateLabel}>OLDER RECORD</Text>
                    <Text style={styles.dateValue}>
                      {formatDate(
                        comparison.older.prescribed_date ||
                          comparison.older.created_at
                      )}
                    </Text>
                    <Text style={typography.bodyMuted}>
                      {comparison.older.doctor_name || "Doctor not specified"}
                    </Text>
                  </View>

                  <View style={styles.dateColumn}>
                    <Text style={styles.dateLabel}>NEWER RECORD</Text>
                    <Text style={styles.dateValue}>
                      {formatDate(
                        comparison.newer.prescribed_date ||
                          comparison.newer.created_at
                      )}
                    </Text>
                    <Text style={typography.bodyMuted}>
                      {comparison.newer.doctor_name || "Doctor not specified"}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                      {comparison.result.added.length}
                    </Text>
                    <Text style={styles.statLabel}>Added</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                      {comparison.result.removed.length}
                    </Text>
                    <Text style={styles.statLabel}>Removed</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                      {comparison.result.changed.length}
                    </Text>
                    <Text style={styles.statLabel}>Changed</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                      {comparison.result.unchanged.length}
                    </Text>
                    <Text style={styles.statLabel}>Unchanged</Text>
                  </View>
                </View>

                <ComparisonSection
                  title="Added in newer record"
                  items={comparison.result.added}
                  type="simple"
                  emptyText="No medicines added."
                />
                <ComparisonSection
                  title="Not present in newer record"
                  items={comparison.result.removed}
                  type="simple"
                  emptyText="No medicines missing from the newer record."
                />
                <ComparisonSection
                  title="Dosage or other changes"
                  items={comparison.result.changed}
                  type="changed"
                  emptyText="No medicine details changed."
                />
                <ComparisonSection
                  title="Unchanged medicines"
                  items={comparison.result.unchanged}
                  type="simple"
                  emptyText="No unchanged medicines."
                />

                <Text style={styles.disclaimer}>
                  This comparison reports differences between saved records.
                  It does not determine whether a medicine change is medically
                  appropriate.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Pill color={colors.textFaint} size={34} />
            <Text style={typography.h3}>No prescriptions yet</Text>
            <Text style={typography.bodyMuted}>
              Scan a prescription from the Dashboard to get started.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);

          return (
            <View style={[styles.card, isSelected && styles.selectedCard]}>
              <Pressable
                style={styles.cardMain}
                onPress={() => handleEdit(item)}
              >
                <View style={styles.iconWrap}>
                  <Pill color={colors.primary} size={20} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={typography.h3} numberOfLines={1}>
                      {item.doctor_name || "Unnamed prescription"}
                    </Text>
                  </View>

                  <Text style={typography.bodyMuted} numberOfLines={1}>
                    {formatDate(item.prescribed_date || item.created_at)}
                  </Text>

                  <Text style={styles.medicineSummary} numberOfLines={2}>
                    {medicineSummary(item)}
                  </Text>

                  {item.clinic_name ? (
                    <Text style={typography.caption} numberOfLines={1}>
                      {item.clinic_name}
                    </Text>
                  ) : null}

                  {item.is_demo ? (
                    <View style={styles.demoBadge}>
                      <Text style={styles.demoBadgeText}>
                        DEMO DATA · FICTIONAL
                      </Text>
                    </View>
                  ) : null}
                </View>

                <ChevronRight color={colors.textFaint} size={18} />
              </Pressable>

              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => toggleComparisonSelection(item)}
                  style={[
                    styles.selectButton,
                    isSelected && styles.selectButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.selectButtonText,
                      isSelected && styles.selectButtonTextActive,
                    ]}
                  >
                    {isSelected ? "Selected" : "Select to compare"}
                  </Text>
                </Pressable>

                {item.is_demo ? (
                  <Text style={styles.protectedText}>Sample protected</Text>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={10}
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item)}
                  >
                    <Trash2 color={colors.danger} size={18} />
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: "center", justifyContent: "center" },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg, gap: spacing.sm },
  emptyState: {
    alignItems: "center",
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  compareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  buttonDisabled: { opacity: 0.45 },
  compareButtonText: { color: colors.white, fontWeight: "700" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: "#F7F9FF",
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center" },
  medicineSummary: {
    fontSize: 13,
    color: colors.text,
    marginTop: 5,
  },
  demoBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: spacing.xs,
  },
  demoBadgeText: {
    color: "#855A10",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  selectButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  selectButtonText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  selectButtonTextActive: { color: colors.primary },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: spacing.xs,
  },
  deleteText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  protectedText: { color: colors.textFaint, fontSize: 11 },
  comparisonCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.card,
  },
  comparisonTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  closeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  closeButtonText: { color: colors.primary, fontWeight: "700" },
  comparisonDates: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dateColumn: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    padding: spacing.sm,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  dateValue: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginVertical: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
  },
  statNumber: { fontSize: 20, fontWeight: "800", color: colors.primary },
  statLabel: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
  comparisonSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  changeCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    padding: spacing.sm,
    gap: 4,
  },
  changeName: { color: colors.text, fontWeight: "700", fontSize: 14 },
  fieldChange: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fieldLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },
  oldValue: { color: colors.danger, fontSize: 12, marginTop: 2 },
  newValue: { color: colors.accent, fontSize: 12, marginTop: 2 },
  disclaimer: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
});

