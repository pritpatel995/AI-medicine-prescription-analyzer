import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Plus, Trash2, Clock } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import AppButton from "../components/AppButton";
import { savePrescription, updatePrescription } from "../services/api";
import { scheduleMedicineNotifications } from "../services/notifications";
import { colors, radii, shadow, spacing, typography } from "../theme/theme";

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function timeStringToDate(timeStr) {
  const [h, m] = (timeStr || "09:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeString(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function ReviewScreen({ route, navigation }) {
  const { scanResult, editingPrescription } = route.params || {};

  // Edit mode: pre-fill from an existing saved prescription.
  // Scan mode: pre-fill from a fresh OCR+LLM extraction result.
  const isEditMode = !!editingPrescription;
  const extracted = editingPrescription
    ? editingPrescription
    : scanResult?.extracted || { doctor_name: null, medicines: [] };

  const [doctorName, setDoctorName] = useState(extracted.doctor_name || "");
  const [medicines, setMedicines] = useState(
    (extracted.medicines || []).map((m) => ({ ...m, id: makeId() }))
  );
  const [activeTimePicker, setActiveTimePicker] = useState(null); // { medIndex, timeIndex }
  const [saving, setSaving] = useState(false);

  const updateMedicine = (index, field, value) => {
    setMedicines((prev) =>
      prev.map((med, i) => (i === index ? { ...med, [field]: value } : med))
    );
  };

  const addMedicine = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setMedicines((prev) => [
      ...prev,
      {
        id: makeId(),
        name: "",
        dosage: "",
        form: "tablet",
        frequency: "",
        times: ["09:00"],
        instructions: "",
        duration_days: 7,
      },
    ]);
  };

  const removeMedicine = (index) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const addTimeSlot = (medIndex) => {
    setMedicines((prev) =>
      prev.map((med, i) =>
        i === medIndex ? { ...med, times: [...med.times, "09:00"] } : med
      )
    );
  };

  const removeTimeSlot = (medIndex, timeIndex) => {
    setMedicines((prev) =>
      prev.map((med, i) =>
        i === medIndex
          ? { ...med, times: med.times.filter((_, ti) => ti !== timeIndex) }
          : med
      )
    );
  };

  const handleTimeChange = (event, selectedDate) => {
    if (!activeTimePicker) return;
    const { medIndex, timeIndex } = activeTimePicker;

    if (Platform.OS === "android") setActiveTimePicker(null);

    if (event.type === "dismissed" || !selectedDate) return;

    const timeStr = dateToTimeString(selectedDate);
    setMedicines((prev) =>
      prev.map((med, i) => {
        if (i !== medIndex) return med;
        const newTimes = [...med.times];
        newTimes[timeIndex] = timeStr;
        return { ...med, times: newTimes };
      })
    );
  };

  const validate = () => {
    if (medicines.length === 0) {
      Alert.alert("No medicines", "Add at least one medicine before saving.");
      return false;
    }
    for (const med of medicines) {
      if (!med.name.trim()) {
        Alert.alert("Missing name", "Every medicine needs a name.");
        return false;
      }
      if (!med.times || med.times.length === 0) {
        Alert.alert(
          "Missing reminder time",
          `"${med.name}" has no reminder times set. Add at least one time before saving.`
        );
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        doctor_name: doctorName || null,
        medicines: medicines.map(({ id, ...rest }) => rest),
        raw_ocr_text: scanResult?.raw_ocr_text || null,
      };

     const saved = isEditMode
  ? await updatePrescription(
      editingPrescription.id,
      payload
    )
  : await savePrescription(payload);

      await scheduleMedicineNotifications(saved.id, saved.medicines);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      navigation.navigate("MainTabs", {
  screen: "Home",
});
    } catch (err) {
      Alert.alert("Could not save", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text style={typography.h1}>
              {isEditMode ? "Edit Prescription" : "Review Prescription"}
            </Text>
            <Text style={typography.bodyMuted}>
              {isEditMode
                ? "Update medicines, dosages, or reminder times."
                : "Confirm what we found, then save to your schedule."}
            </Text>
           

            <View style={styles.doctorInputWrap}>
              <Text style={typography.caption}>DOCTOR</Text>
              <TextInput
                value={doctorName}
                onChangeText={setDoctorName}
                placeholder="Doctor name"
                placeholderTextColor={colors.textFaint}
                style={styles.doctorInput}
              />
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.medCard}>
            <View style={styles.medCardHeader}>
              <TextInput
                value={item.name}
                onChangeText={(v) => updateMedicine(index, "name", v)}
                placeholder="Medicine name"
                placeholderTextColor={colors.textFaint}
                style={styles.medNameInput}
              />
              <Trash2
                color={colors.danger}
                size={18}
                onPress={() => removeMedicine(index)}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                value={item.dosage || ""}
                onChangeText={(v) => updateMedicine(index, "dosage", v)}
                placeholder="Dosage (e.g. 500mg)"
                placeholderTextColor={colors.textFaint}
                style={[styles.smallInput, { flex: 1 }]}
              />
              <TextInput
                value={String(item.duration_days ?? "")}
                onChangeText={(v) => updateMedicine(index, "duration_days", parseInt(v, 10) || 0)}
                placeholder="Days"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                style={[styles.smallInput, { width: 70 }]}
              />
            </View>

            <TextInput
              value={item.instructions || ""}
              onChangeText={(v) => updateMedicine(index, "instructions", v)}
              placeholder="Instructions (e.g. after food)"
              placeholderTextColor={colors.textFaint}
              style={styles.smallInput}
            />

            <Text style={[typography.caption, { marginTop: spacing.sm }]}>REMINDER TIMES</Text>
            <View style={styles.timesWrap}>
              {item.times.map((t, timeIndex) => (
                <View key={timeIndex} style={styles.timeChip}>
                  <Clock
                    color={colors.primary}
                    size={14}
                    onPress={() => setActiveTimePicker({ medIndex: index, timeIndex })}
                  />
                  <Text
                    style={styles.timeChipText}
                    onPress={() => setActiveTimePicker({ medIndex: index, timeIndex })}
                  >
                    {t}
                  </Text>
                  <Text
                    style={styles.timeChipRemove}
                    onPress={() => removeTimeSlot(index, timeIndex)}
                  >
                    ×
                  </Text>
                </View>
              ))}
              <Text style={styles.addTimeChip} onPress={() => addTimeSlot(index)}>
                + Add time
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          <Text style={styles.addMedicineRow} onPress={addMedicine}>
            <Plus color={colors.primary} size={16} /> Add another medicine
          </Text>
        }
      />

      {activeTimePicker && (
        <DateTimePicker
          value={timeStringToDate(
            medicines[activeTimePicker.medIndex]?.times[activeTimePicker.timeIndex]
          )}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
        />
      )}

      <View style={styles.footer}>
        <AppButton
          title={isEditMode ? "Save Changes" : "Save & Schedule Reminders"}
          onPress={handleSave}
          loading={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: spacing.lg, paddingBottom: 140 },
  headerSection: { marginBottom: spacing.lg, gap: spacing.xs },
  doctorInputWrap: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.card,
  },
  doctorInput: { fontSize: 15, color: colors.text, marginTop: 4 },
  medCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  medCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  medNameInput: { flex: 1, fontSize: 17, fontWeight: "600", color: colors.text },
  row: { flexDirection: "row", gap: spacing.sm },
  smallInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  timesWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  timeChipText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  timeChipRemove: { color: colors.primary, fontSize: 16, marginLeft: 2 },
  addTimeChip: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  addMedicineRow: {
    textAlign: "center",
    color: colors.primary,
    fontWeight: "600",
    paddingVertical: spacing.md,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ocrPanel: { marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  ocrTitle: { color: colors.text, fontWeight: "800", fontSize: 14, marginBottom: 5 },
  ocrSummary: { color: colors.primary, fontWeight: "700", marginBottom: 7 },
  ocrWarning: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  ocrLine: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 5, borderTopWidth: 1, borderTopColor: colors.border },
  ocrLineText: { flex: 1, color: colors.text, fontSize: 12 },
  ocrScore: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  ocrScoreLow: { color: colors.danger },
});